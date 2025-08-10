import { ChessboardUIConfig } from './types';
import { Z_INDEX, SQUARE_SIZE_PERCENTAGE, COORDINATE_OFFSET } from './constants';

export const getBoardContainerStyles = (size: number) => `
  position: relative;
  width: ${size}px;
  height: ${size}px;
  user-select: none;
`;

export const getBoardStyles = () => `
  position: relative;
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  grid-template-rows: repeat(8, 1fr);
  width: 100%;
  height: 100%;
  border: 3px solid #8b4513;
  border-radius: 6px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255,255,255,0.1);
  overflow: hidden;
  background: linear-gradient(135deg, #ddd 0%, #bbb 100%);
`;

export const getSquareStyles = (isLight: boolean, lightColor: string, darkColor: string) => `
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: ${isLight ? lightColor : darkColor};
  cursor: pointer;
  transition: all 0.15s ease;
`;

export const getPieceStyles = (animationDuration: number) => `
  cursor: grab;
  transition: transform ${animationDuration}ms ease;
  z-index: ${Z_INDEX.PIECE};
  position: relative;
`;

export const getFileCoordinateStyles = (index: number, flipped: boolean) => `
  position: absolute;
  bottom: ${COORDINATE_OFFSET}px;
  left: ${(flipped ? 7 - index : index) * SQUARE_SIZE_PERCENTAGE}%;
  width: ${SQUARE_SIZE_PERCENTAGE}%;
  text-align: center;
  font-size: 14px;
  font-weight: 600;
  color: #666;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
`;

export const getRankCoordinateStyles = (index: number, flipped: boolean) => `
  position: absolute;
  right: ${COORDINATE_OFFSET}px;
  top: ${(flipped ? 7 - index : index) * SQUARE_SIZE_PERCENTAGE}%;
  height: ${SQUARE_SIZE_PERCENTAGE}%;
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: 600;
  color: #666;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
`;

export const getFloatingPieceStyles = () => ({
  position: 'absolute',
  pointerEvents: 'none',
  zIndex: String(Z_INDEX.FLOATING_PIECE),
  transform: 'translate(-50%, -50%) scale(1.1)',
  opacity: '0.9',
  filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.4))'
});

export const getPromotionModalStyles = () => ({
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  background: 'white',
  border: '2px solid #333',
  borderRadius: '8px',
  padding: '20px',
  zIndex: String(Z_INDEX.MODAL),
  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)'
});

export const getPromotionButtonStyles = () => ({
  width: '60px',
  height: '60px',
  border: '2px solid #b58863',
  background: '#f0d9b5',
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'all 0.2s',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '0'
});

export const getPromotionButtonHoverStyles = () => ({
  background: '#b58863',
  transform: 'scale(1.1)'
});

export const getGameEndDialogStyles = () => `
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  border: 3px solid #333;
  border-radius: 10px;
  padding: 30px;
  z-index: ${Z_INDEX.MODAL};
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
  text-align: center;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
`;

export const getHighlightOverlayStyles = () => ({
  position: 'absolute',
  top: '0',
  left: '0',
  width: '100%',
  height: '100%',
  pointerEvents: 'none',
  zIndex: String(Z_INDEX.HIGHLIGHT)
});

export const generateDynamicCSS = (config: ChessboardUIConfig) => `
  .piece {
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
    -webkit-user-drag: none;
    -khtml-user-drag: none;
    -moz-user-drag: none;
    -o-user-drag: none;
    user-drag: none;
    will-change: transform;
  }

  .square {
    transition: background-color 0.2s ease;
  }

  .square.light {
    background-color: ${config.colors.light};
  }
  .square.dark {
    background-color: ${config.colors.dark};
  }

  .highlight.highlight-legalMove > div {
    box-shadow: 0 0 0 2px rgba(0,0,0,0.05) inset;
  }

  .highlight.highlight-capture {
    background: radial-gradient(circle at center, rgba(0,0,0,0.1) 30%, rgba(0,0,0,0) 31%);
  }

  @keyframes pulse {
    0% { transform: scale(1); }
    50% { transform: scale(1.1); }
    100% { transform: scale(1); }
  }

  .highlight-check {
    animation: pulse 1s infinite;
  }
`;