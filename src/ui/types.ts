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
