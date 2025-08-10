export type PieceType = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king';
export type Color = 'white' | 'black';
export type CastlingSide = 'kingside' | 'queenside';

export interface Piece {
  type: PieceType;
  color: Color;
}

export interface Square {
  row: number;
  col: number;
}

export interface Move {
  from: Square;
  to: Square;
  promotion?: PieceType;
  isCapture?: boolean;
  capturedPiece?: Piece;
  isEnPassant?: boolean;
  isCastling?: boolean;
  castlingSide?: CastlingSide;
}

export interface CastlingRights {
  white: {
    kingside: boolean;
    queenside: boolean;
  };
  black: {
    kingside: boolean;
    queenside: boolean;
  };
}

export interface GameState {
  board: (Piece | null)[][];
  turn: Color;
  castlingRights: CastlingRights;
  enPassantTarget: Square | null;
  halfmoveClock: number;
  fullmoveNumber: number;
  moveHistory: Move[];
  capturedPieces: {
    white: Piece[];
    black: Piece[];
  };
  isCheck: boolean;
  isCheckmate: boolean;
  isStalemate: boolean;
  isDraw: boolean;
}
