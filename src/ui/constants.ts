import { PieceType } from '../core/types';

export const BOARD_SIZE = 8;
export const DEFAULT_BOARD_SIZE_PX = 480;
export const DEFAULT_ANIMATION_DURATION = 200;

export const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'] as const;
export const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'] as const;

export const PROMOTION_PIECES: PieceType[] = ['queen', 'rook', 'bishop', 'knight'];

export const SQUARE_SIZE_PERCENTAGE = 12.5; // Each square is 12.5% of board size

export const PIECE_SIZE_RATIO = 1; // Piece size relative to square size

export const Z_INDEX = {
  BOARD: 1,
  HIGHLIGHT: 5,
  PIECE: 10,
  FLOATING_PIECE: 1000,
  MODAL: 1000,
} as const;

export const COORDINATE_OFFSET = -20; // Offset for file/rank labels
