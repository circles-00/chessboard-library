import { Square, PieceType } from '../core/types';
import { createPieceElement } from './pieces';
import { PROMOTION_PIECES } from './constants';
import { getPromotionModalStyles, getPromotionButtonStyles, getPromotionButtonHoverStyles } from './styles';

export function createPromotionModal(
  from: Square,
  to: Square,
  color: 'white' | 'black',
  onPromotionSelect: (from: Square, to: Square, pieceType: PieceType) => void
): HTMLElement {
  const modal = document.createElement('div');
  modal.className = 'promotion-modal';
  Object.assign(modal.style, getPromotionModalStyles());

  const container = document.createElement('div');
  container.style.cssText = 'display: flex; gap: 10px;';

  PROMOTION_PIECES.forEach(pieceType => {
    const button = createPromotionButton(
      pieceType,
      color,
      () => {
        onPromotionSelect(from, to, pieceType);
        modal.remove();
      }
    );
    container.appendChild(button);
  });

  modal.appendChild(container);
  return modal;
}

function createPromotionButton(
  pieceType: PieceType,
  color: 'white' | 'black',
  onClick: () => void
): HTMLElement {
  const button = document.createElement('button');
  Object.assign(button.style, getPromotionButtonStyles());

  const pieceElement = createPieceElement({ type: pieceType, color }, 40);
  button.appendChild(pieceElement);

  button.onmouseover = () => {
    Object.assign(button.style, getPromotionButtonHoverStyles());
  };

  button.onmouseout = () => {
    Object.assign(button.style, getPromotionButtonStyles());
  };

  button.onclick = onClick;

  return button;
}

