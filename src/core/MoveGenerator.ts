import { Move, Square, Piece, Color } from './types';
import { Position } from './Position';

export class MoveGenerator {
  constructor(private position: Position) {}

  getLegalMoves(square: Square): Move[] {
    const piece = this.position.getPiece(square);
    if (!piece) {
      return [];
    }

    switch (piece.type) {
      case 'pawn':
        return this.getPawnMoves(square, piece.color);
      case 'knight':
        return this.getKnightMoves(square, piece.color);
      case 'bishop':
        return this.getSlidingMoves(square, piece.color, [{ row: 1, col: 1 }, { row: 1, col: -1 }, { row: -1, col: 1 }, { row: -1, col: -1 }]);
      case 'rook':
        return this.getSlidingMoves(square, piece.color, [{ row: 1, col: 0 }, { row: -1, col: 0 }, { row: 0, col: 1 }, { row: 0, col: -1 }]);
      case 'queen':
        return this.getSlidingMoves(square, piece.color, [{ row: 1, col: 1 }, { row: 1, col: -1 }, { row: -1, col: 1 }, { row: -1, col: -1 }, { row: 1, col: 0 }, { row: -1, col: 0 }, { row: 0, col: 1 }, { row: 0, col: -1 }]);
      case 'king':
        return this.getKingMoves(square, piece.color);
    }
  }

  private getPawnMoves(square: Square, color: Color): Move[] {
    const moves: Move[] = [];
    const direction = color === 'white' ? 1 : -1;
    const startRow = color === 'white' ? 1 : 6;

    const oneStep: Square = { row: square.row + direction, col: square.col };
    if (this.position.isValidSquare(oneStep) && !this.position.getPiece(oneStep)) {
      moves.push({ from: square, to: oneStep });

      if (square.row === startRow) {
        const twoSteps: Square = { row: square.row + 2 * direction, col: square.col };
        if (this.position.isValidSquare(twoSteps) && !this.position.getPiece(twoSteps)) {
          moves.push({ from: square, to: twoSteps });
        }
      }
    }

    const captureMoves: Square[] = [
      { row: square.row + direction, col: square.col - 1 },
      { row: square.row + direction, col: square.col + 1 },
    ];

    for (const captureMove of captureMoves) {
      if (this.position.isValidSquare(captureMove)) {
        const piece = this.position.getPiece(captureMove);
        if (piece && piece.color !== color) {
          moves.push({ from: square, to: captureMove });
        }
      }
    }

    return moves;
  }

  private getKnightMoves(square: Square, color: Color): Move[] {
    const moves: Move[] = [];
    const knightMoves: Square[] = [
      { row: -2, col: -1 }, { row: -2, col: 1 },
      { row: -1, col: -2 }, { row: -1, col: 2 },
      { row: 1, col: -2 }, { row: 1, col: 2 },
      { row: 2, col: -1 }, { row: 2, col: 1 },
    ];

    for (const move of knightMoves) {
      const to: Square = { row: square.row + move.row, col: square.col + move.col };
      if (this.position.isValidSquare(to)) {
        const piece = this.position.getPiece(to);
        if (!piece || piece.color !== color) {
          moves.push({ from: square, to });
        }
      }
    }

    return moves;
  }

  private getSlidingMoves(square: Square, color: Color, directions: Square[]): Move[] {
    const moves: Move[] = [];

    for (const direction of directions) {
      let current = { row: square.row + direction.row, col: square.col + direction.col };

      while (this.position.isValidSquare(current)) {
        const piece = this.position.getPiece(current);
        if (piece) {
          if (piece.color !== color) {
            moves.push({ from: square, to: current });
          }
          break;
        }
        moves.push({ from: square, to: current });
        current = { row: current.row + direction.row, col: current.col + direction.col };
      }
    }

    return moves;
  }

  private getKingMoves(square: Square, color: Color): Move[] {
    const moves: Move[] = [];
    const kingMoves: Square[] = [
      { row: -1, col: -1 }, { row: -1, col: 0 }, { row: -1, col: 1 },
      { row: 0, col: -1 }, { row: 0, col: 1 },
      { row: 1, col: -1 }, { row: 1, col: 0 }, { row: 1, col: 1 },
    ];

    for (const move of kingMoves) {
      const to: Square = { row: square.row + move.row, col: square.col + move.col };
      if (this.position.isValidSquare(to)) {
        const piece = this.position.getPiece(to);
        if (!piece || piece.color !== color) {
          moves.push({ from: square, to });
        }
      }
    }

    return moves;
  }
}
