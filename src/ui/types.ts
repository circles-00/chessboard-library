import { Square, Piece, Move } from '../core/types';

export interface ChessboardUIConfig {
  colors: {
    light: string;
    dark: string;
    highlight?: {
      selected?: string;
      lastMove?: string;
      check?: string;
      legalMove?: string;
      capture?: string;
      rightClick?: string;
    };
    arrow?: string;
  };
  pieceSet: string;
  size?: number;
  showCoordinates?: boolean;
  enableDragAndDrop?: boolean;
  enableHighlights?: boolean;
  animationDuration?: number;
  enableArrows?: boolean;
  enableRightClickHighlight?: boolean;
}

export interface UIElements {
  boardElement: HTMLElement | null;
  boardContainer: HTMLElement | null;
  promotionModal: HTMLElement | null;
  arrowSvg: SVGElement | null;
  floatingPiece: HTMLElement | null;
  dragElement: HTMLElement | null;
}

export interface SelectionState {
  selectedSquare: Square | null;
  highlightedSquares: Set<string>;
  rightClickHighlights: Set<string>;
  lastMove: Move | null;
}

export interface DragState {
  isDragging: boolean;
  draggedPiece: { piece: Piece; from: Square } | null;
  dragLegalTargets: Square[];
  dragStartX: number;
  dragStartY: number;
  dragThreshold: number;
  potentialDragPiece: { piece: Piece; square: Square; element: HTMLElement; event: PointerEvent } | null;
}

export interface ArrowState {
  arrows: Array<{ from: Square; to: Square }>;
  isDrawingArrow: boolean;
  arrowStart: Square | null;
}

export interface BoardSettings {
  flipped: boolean;
  showCoordinates: boolean;
}
