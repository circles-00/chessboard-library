import { ChessboardUIConfig } from './types';
import { DEFAULT_COLORS } from './colors';
import { DEFAULT_ANIMATION_DURATION, DEFAULT_BOARD_SIZE_PX } from './constants';

export const DefaultChessboardUIConfig: ChessboardUIConfig = {
  colors: DEFAULT_COLORS,
  pieceSet: 'default',
  size: DEFAULT_BOARD_SIZE_PX,
  showCoordinates: true,
  enableDragAndDrop: true,
  enableHighlights: true,
  animationDuration: DEFAULT_ANIMATION_DURATION,
  enableArrows: true,
  enableRightClickHighlight: true
};
