import { Piece, Square, PieceType, Color } from './types';

export class Position {
  private board: (Piece | null)[][] = [];

  constructor() {
    this.setupInitialPosition();
  }

  private setupInitialPosition(): void {
    this.board = Array(8).fill(null).map(() => Array(8).fill(null));

    const initialRow: PieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];

    for (let i = 0; i < 8; i++) {
      this.setPiece({ row: 7, col: i }, { type: initialRow[i], color: 'black' });
      this.setPiece({ row: 6, col: i }, { type: 'pawn', color: 'black' });
      this.setPiece({ row: 1, col: i }, { type: 'pawn', color: 'white' });
      this.setPiece({ row: 0, col: i }, { type: initialRow[i], color: 'white' });
    }
  }

  getPiece(square: Square): Piece | null {
    if (!this.isValidSquare(square)) {
      return null;
    }
    return this.board[square.row][square.col];
  }

  setPiece(square: Square, piece: Piece | null): void {
    if (this.isValidSquare(square)) {
      this.board[square.row][square.col] = piece;
    }
  }

  movePiece(from: Square, to: Square): void {
    const piece = this.getPiece(from);
    this.setPiece(from, null);
    this.setPiece(to, piece);
  }

  isValidSquare(square: Square): boolean {
    return square.row >= 0 && square.row < 8 && square.col >= 0 && square.col < 8;
  }

  clone(): Position {
    const newPosition = new Position();
    newPosition.board = this.board.map(row => row.map(piece => piece ? { ...piece } : null));
    return newPosition;
  }

  getBoard(): (Piece | null)[][] {
    return this.board;
  }

  findKing(color: Color): Square | null {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece && piece.type === 'king' && piece.color === color) {
          return { row, col };
        }
      }
    }
    return null;
  }

  getAllPiecesForColor(color: Color): { piece: Piece; square: Square }[] {
    const pieces: { piece: Piece; square: Square }[] = [];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const piece = this.board[row][col];
        if (piece && piece.color === color) {
          pieces.push({ piece, square: { row, col } });
        }
      }
    }
    return pieces;
  }
}
