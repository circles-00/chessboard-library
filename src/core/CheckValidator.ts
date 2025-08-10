import { Position } from './Position';
import { MoveGenerator } from './MoveGenerator';
import { Color, Square, Move } from './types';

export class CheckValidator {
  constructor(private position: Position) {}

  isSquareAttacked(square: Square, byColor: Color): boolean {
    const enemyPieces = this.position.getAllPiecesForColor(byColor);
    
    for (const { piece, square: enemySquare } of enemyPieces) {
      if (this.canPieceAttackSquare(enemySquare, square, piece.type, byColor)) {
        return true;
      }
    }
    
    return false;
  }

  private canPieceAttackSquare(from: Square, to: Square, pieceType: string, color: Color): boolean {
    const rowDiff = to.row - from.row;
    const colDiff = to.col - from.col;
    const absRowDiff = Math.abs(rowDiff);
    const absColDiff = Math.abs(colDiff);

    switch (pieceType) {
      case 'pawn':
        const pawnDirection = color === 'white' ? 1 : -1;
        return rowDiff === pawnDirection && absColDiff === 1;
      
      case 'knight':
        return (absRowDiff === 2 && absColDiff === 1) || (absRowDiff === 1 && absColDiff === 2);
      
      case 'bishop':
        if (absRowDiff !== absColDiff) return false;
        return this.isPathClear(from, to);
      
      case 'rook':
        if (rowDiff !== 0 && colDiff !== 0) return false;
        return this.isPathClear(from, to);
      
      case 'queen':
        if (rowDiff !== 0 && colDiff !== 0 && absRowDiff !== absColDiff) return false;
        return this.isPathClear(from, to);
      
      case 'king':
        return absRowDiff <= 1 && absColDiff <= 1;
      
      default:
        return false;
    }
  }

  private isPathClear(from: Square, to: Square): boolean {
    const rowDiff = to.row - from.row;
    const colDiff = to.col - from.col;
    const rowStep = rowDiff === 0 ? 0 : rowDiff / Math.abs(rowDiff);
    const colStep = colDiff === 0 ? 0 : colDiff / Math.abs(colDiff);
    
    let currentRow = from.row + rowStep;
    let currentCol = from.col + colStep;
    
    while (currentRow !== to.row || currentCol !== to.col) {
      if (this.position.getPiece({ row: currentRow, col: currentCol })) {
        return false;
      }
      currentRow += rowStep;
      currentCol += colStep;
    }
    
    return true;
  }

  isKingInCheck(color: Color): boolean {
    const kingSquare = this.position.findKing(color);
    if (!kingSquare) return false;
    
    const opponentColor = color === 'white' ? 'black' : 'white';
    return this.isSquareAttacked(kingSquare, opponentColor);
  }

  wouldMoveLeaveKingInCheck(move: Move, color: Color): boolean {
    const tempPosition = this.position.clone();

    // Simulate special moves precisely
    if (move.isEnPassant) {
      // Remove the captured pawn which is on the same row as from, and column of to
      const capturedPawnSquare = { row: move.from.row, col: move.to.col };
      tempPosition.setPiece(capturedPawnSquare, null);
      tempPosition.movePiece(move.from, move.to);
    } else if (move.isCastling) {
      // Move king
      const row = move.from.row;
      const isKingside = move.castlingSide === 'kingside';
      tempPosition.movePiece(move.from, move.to);
      // Move rook
      if (isKingside) {
        tempPosition.movePiece({ row, col: 7 }, { row, col: 5 });
      } else {
        tempPosition.movePiece({ row, col: 0 }, { row, col: 3 });
      }
    } else {
      tempPosition.movePiece(move.from, move.to);
      if (move.promotion) {
        // Apply promotion type on the destination square for accuracy
        const piece = this.position.getPiece(move.from);
        if (piece) {
          tempPosition.setPiece(move.to, { type: move.promotion, color: piece.color });
        }
      }
    }

    const tempValidator = new CheckValidator(tempPosition);
    return tempValidator.isKingInCheck(color);
  }

  filterLegalMoves(moves: Move[], color: Color): Move[] {
    return moves.filter(move => !this.wouldMoveLeaveKingInCheck(move, color));
  }
}