import { Move, Piece, Square, Color, CastlingRights, GameState, PieceType } from './types';
import { Position } from './Position';
import { MoveGenerator } from './MoveGenerator';
import { CheckValidator } from './CheckValidator';

export class Chessboard {
  private position: Position;
  private moveGenerator: MoveGenerator;
  private checkValidator: CheckValidator;
  private gameState: GameState;

  constructor() {
    this.position = new Position();
    this.moveGenerator = new MoveGenerator(this.position);
    this.checkValidator = new CheckValidator(this.position);
    
    this.gameState = {
      board: this.position.getBoard(),
      turn: 'white',
      castlingRights: {
        white: { kingside: true, queenside: true },
        black: { kingside: true, queenside: true }
      },
      enPassantTarget: null,
      halfmoveClock: 0,
      fullmoveNumber: 1,
      moveHistory: [],
      capturedPieces: { white: [], black: [] },
      isCheck: false,
      isCheckmate: false,
      isStalemate: false,
      isDraw: false
    };
    
    this.updateGameStatus();
  }

  getPiece(square: Square): Piece | null {
    return this.position.getPiece(square);
  }

  getLegalMoves(square: Square): Move[] {
    const piece = this.position.getPiece(square);
    if (!piece || piece.color !== this.gameState.turn) {
      return [];
    }

    let moves = this.moveGenerator.getLegalMoves(square);
    
    if (piece.type === 'king') {
      moves = [...moves, ...this.getCastlingMoves(square, piece.color)];
    } else if (piece.type === 'pawn') {
      moves = [...moves, ...this.getEnPassantMoves(square, piece.color)];
    }
    
    moves = this.checkValidator.filterLegalMoves(moves, piece.color);
    
    if (piece.type === 'pawn') {
      moves = this.addPromotionToMoves(moves, square);
    }
    
    return moves;
  }

  private getCastlingMoves(kingSquare: Square, color: Color): Move[] {
    const moves: Move[] = [];
    
    if (this.checkValidator.isKingInCheck(color)) {
      return moves;
    }
    
    const row = color === 'white' ? 0 : 7;
    
    if (this.gameState.castlingRights[color].kingside) {
      const kingsideRook = this.getPiece({ row, col: 7 });
      if (kingsideRook && kingsideRook.type === 'rook' && kingsideRook.color === color) {
        const pathClear = !this.getPiece({ row, col: 5 }) && !this.getPiece({ row, col: 6 });
        const pathSafe = !this.checkValidator.isSquareAttacked({ row, col: 5 }, color === 'white' ? 'black' : 'white') &&
                        !this.checkValidator.isSquareAttacked({ row, col: 6 }, color === 'white' ? 'black' : 'white');
        
        if (pathClear && pathSafe) {
          moves.push({
            from: kingSquare,
            to: { row, col: 6 },
            isCastling: true,
            castlingSide: 'kingside'
          });
        }
      }
    }
    
    if (this.gameState.castlingRights[color].queenside) {
      const queensideRook = this.getPiece({ row, col: 0 });
      if (queensideRook && queensideRook.type === 'rook' && queensideRook.color === color) {
        const pathClear = !this.getPiece({ row, col: 1 }) && !this.getPiece({ row, col: 2 }) && !this.getPiece({ row, col: 3 });
        const pathSafe = !this.checkValidator.isSquareAttacked({ row, col: 2 }, color === 'white' ? 'black' : 'white') &&
                        !this.checkValidator.isSquareAttacked({ row, col: 3 }, color === 'white' ? 'black' : 'white');
        
        if (pathClear && pathSafe) {
          moves.push({
            from: kingSquare,
            to: { row, col: 2 },
            isCastling: true,
            castlingSide: 'queenside'
          });
        }
      }
    }
    
    return moves;
  }

  private getEnPassantMoves(pawnSquare: Square, color: Color): Move[] {
    const moves: Move[] = [];
    
    if (!this.gameState.enPassantTarget) {
      return moves;
    }
    
    const direction = color === 'white' ? 1 : -1;
    const captureRow = color === 'white' ? 4 : 3;
    
    if (pawnSquare.row !== captureRow) {
      return moves;
    }
    
    const leftCapture = Math.abs(pawnSquare.col - this.gameState.enPassantTarget.col) === 1;
    const correctRow = this.gameState.enPassantTarget.row === pawnSquare.row + direction;
    
    if (leftCapture && correctRow) {
      moves.push({
        from: pawnSquare,
        to: this.gameState.enPassantTarget,
        isEnPassant: true,
        isCapture: true
      });
    }
    
    return moves;
  }

  private addPromotionToMoves(moves: Move[], from: Square): Move[] {
    const promotionRow = this.gameState.turn === 'white' ? 7 : 0;
    const promotions: PieceType[] = ['queen', 'rook', 'bishop', 'knight'];

    const expanded: Move[] = [];
    for (const move of moves) {
      if (move.to.row === promotionRow) {
        for (const promo of promotions) {
          expanded.push({ ...move, promotion: promo });
        }
      } else {
        expanded.push(move);
      }
    }
    return expanded;
  }

  move(move: Move): boolean {
    const piece = this.position.getPiece(move.from);
    if (!piece || piece.color !== this.gameState.turn) {
      return false;
    }

    const legalMoves = this.getLegalMoves(move.from);
    const legalMove = legalMoves.find(m => 
      m.to.row === move.to.row && 
      m.to.col === move.to.col &&
      (!move.promotion || m.promotion === move.promotion)
    );

    if (!legalMove) {
      return false;
    }

    const capturedPiece = this.position.getPiece(move.to);
    
    if (legalMove.isCastling) {
      this.performCastling(legalMove);
    } else if (legalMove.isEnPassant) {
      this.performEnPassant(legalMove);
    } else {
      if (capturedPiece) {
        this.gameState.capturedPieces[capturedPiece.color].push(capturedPiece);
        legalMove.isCapture = true;
        legalMove.capturedPiece = capturedPiece;
      }
      
      this.position.movePiece(move.from, move.to);
      
      if (legalMove.promotion) {
        this.position.setPiece(move.to, { type: legalMove.promotion, color: piece.color });
      }
    }
    
    this.updateCastlingRights(piece, move, capturedPiece);
    this.updateEnPassantTarget(piece, move);
    this.updateHalfmoveClock(piece, legalMove.isCapture);
    
    this.gameState.moveHistory.push(legalMove);
    this.gameState.turn = this.gameState.turn === 'white' ? 'black' : 'white';
    
    if (this.gameState.turn === 'white') {
      this.gameState.fullmoveNumber++;
    }
    
    this.gameState.board = this.position.getBoard();
    this.updateGameStatus();
    
    return true;
  }

  private performCastling(move: Move): void {
    const row = move.from.row;
    const isKingside = move.castlingSide === 'kingside';
    
    this.position.movePiece(move.from, move.to);
    
    if (isKingside) {
      this.position.movePiece({ row, col: 7 }, { row, col: 5 });
    } else {
      this.position.movePiece({ row, col: 0 }, { row, col: 3 });
    }
  }

  private performEnPassant(move: Move): void {
    const capturedPawnRow = move.from.row;
    const capturedPawnCol = move.to.col;
    const capturedPawn = this.position.getPiece({ row: capturedPawnRow, col: capturedPawnCol });
    
    if (capturedPawn) {
      this.gameState.capturedPieces[capturedPawn.color].push(capturedPawn);
    }
    
    this.position.setPiece({ row: capturedPawnRow, col: capturedPawnCol }, null);
    this.position.movePiece(move.from, move.to);
  }

  private updateCastlingRights(piece: Piece, move: Move, capturedPiece?: Piece | null): void {
    if (piece.type === 'king') {
      this.gameState.castlingRights[piece.color].kingside = false;
      this.gameState.castlingRights[piece.color].queenside = false;
    }
    
    if (piece.type === 'rook') {
      const startRow = piece.color === 'white' ? 0 : 7;
      if (move.from.row === startRow) {
        if (move.from.col === 0) {
          this.gameState.castlingRights[piece.color].queenside = false;
        } else if (move.from.col === 7) {
          this.gameState.castlingRights[piece.color].kingside = false;
        }
      }
    }
    
    // If a rook was captured on its original square, revoke opponent castling rights.
    if (capturedPiece && capturedPiece.type === 'rook') {
      const startRow = capturedPiece.color === 'white' ? 0 : 7;
      if (move.to.row === startRow) {
        if (move.to.col === 0) {
          this.gameState.castlingRights[capturedPiece.color].queenside = false;
        } else if (move.to.col === 7) {
          this.gameState.castlingRights[capturedPiece.color].kingside = false;
        }
      }
    }
  }

  private updateEnPassantTarget(piece: Piece, move: Move): void {
    if (piece.type === 'pawn' && Math.abs(move.to.row - move.from.row) === 2) {
      const direction = piece.color === 'white' ? 1 : -1;
      this.gameState.enPassantTarget = {
        row: move.from.row + direction,
        col: move.from.col
      };
    } else {
      this.gameState.enPassantTarget = null;
    }
  }

  private updateHalfmoveClock(piece: Piece, isCapture?: boolean): void {
    if (piece.type === 'pawn' || isCapture) {
      this.gameState.halfmoveClock = 0;
    } else {
      this.gameState.halfmoveClock++;
    }
  }

  private updateGameStatus(): void {
    this.gameState.isCheck = this.checkValidator.isKingInCheck(this.gameState.turn);
    
    const hasLegalMoves = this.hasAnyLegalMoves(this.gameState.turn);
    
    if (!hasLegalMoves) {
      if (this.gameState.isCheck) {
        this.gameState.isCheckmate = true;
      } else {
        this.gameState.isStalemate = true;
        this.gameState.isDraw = true;
      }
    }
    
    if (this.gameState.halfmoveClock >= 100) {
      this.gameState.isDraw = true;
    }
    
    if (this.isInsufficientMaterial()) {
      this.gameState.isDraw = true;
    }
  }

  private hasAnyLegalMoves(color: Color): boolean {
    const pieces = this.position.getAllPiecesForColor(color);
    
    for (const { square } of pieces) {
      const moves = this.getLegalMoves(square);
      if (moves.length > 0) {
        return true;
      }
    }
    
    return false;
  }

  private isInsufficientMaterial(): boolean {
    const whitePieces = this.position.getAllPiecesForColor('white');
    const blackPieces = this.position.getAllPiecesForColor('black');
    
    if (whitePieces.length === 1 && blackPieces.length === 1) {
      return true;
    }
    
    if (whitePieces.length === 2 && blackPieces.length === 1) {
      const nonKing = whitePieces.find(p => p.piece.type !== 'king');
      if (nonKing && (nonKing.piece.type === 'bishop' || nonKing.piece.type === 'knight')) {
        return true;
      }
    }
    
    if (blackPieces.length === 2 && whitePieces.length === 1) {
      const nonKing = blackPieces.find(p => p.piece.type !== 'king');
      if (nonKing && (nonKing.piece.type === 'bishop' || nonKing.piece.type === 'knight')) {
        return true;
      }
    }
    
    return false;
  }

  isGameOver(): boolean {
    return this.gameState.isCheckmate || this.gameState.isDraw;
  }

  getTurn(): Color {
    return this.gameState.turn;
  }

  getPosition(): Position {
    return this.position;
  }

  getGameState(): GameState {
    return { ...this.gameState };
  }

  isInCheck(): boolean {
    return this.gameState.isCheck;
  }

  isCheckmate(): boolean {
    return this.gameState.isCheckmate;
  }

  isStalemate(): boolean {
    return this.gameState.isStalemate;
  }

  isDraw(): boolean {
    return this.gameState.isDraw;
  }

  getCapturedPieces(): { white: Piece[]; black: Piece[] } {
    return { ...this.gameState.capturedPieces };
  }

  getMoveHistory(): Move[] {
    return [...this.gameState.moveHistory];
  }
}