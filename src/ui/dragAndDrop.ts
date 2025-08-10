import { Square, Piece } from '../core/types';
import { getFloatingPieceStyles } from './styles';

export interface DragState {
  piece: Piece;
  from: Square;
  element: HTMLElement;
  floatingElement: HTMLElement | null;
  legalTargets: Square[];
}

export function preventNativeDrag(element: HTMLElement): void {
  element.setAttribute('draggable', 'false');
  (element.style as any).webkitUserDrag = 'none';
  element.style.userSelect = 'none';
}

export function createFloatingPiece(
  originalElement: HTMLElement,
  container: HTMLElement,
  clientX: number,
  clientY: number
): HTMLElement {
  const rect = container.getBoundingClientRect();
  const floatingPiece = originalElement.cloneNode(true) as HTMLElement;
  
  Object.assign(floatingPiece.style, getFloatingPieceStyles());
  
  container.appendChild(floatingPiece);
  updateFloatingPiecePosition(floatingPiece, clientX - rect.left, clientY - rect.top);
  
  return floatingPiece;
}

export function updateFloatingPiecePosition(
  floatingPiece: HTMLElement,
  x: number,
  y: number,
  containerWidth?: number,
  containerHeight?: number
): void {
  // Get the piece dimensions
  const pieceWidth = floatingPiece.offsetWidth;
  const pieceHeight = floatingPiece.offsetHeight;
  
  // Calculate boundaries if container dimensions are provided
  let constrainedX = x;
  let constrainedY = y;
  
  if (containerWidth && containerHeight) {
    // Keep the piece within the board boundaries
    // Account for the piece being centered on the cursor (50% transform offset)
    const minX = pieceWidth / 2;
    const maxX = containerWidth - pieceWidth / 2;
    const minY = pieceHeight / 2;
    const maxY = containerHeight - pieceHeight / 2;
    
    constrainedX = Math.max(minX, Math.min(maxX, x));
    constrainedY = Math.max(minY, Math.min(maxY, y));
  }
  
  floatingPiece.style.left = `${constrainedX}px`;
  floatingPiece.style.top = `${constrainedY}px`;
}

export function getSquareFromPoint(
  x: number,
  y: number,
  boardSize: number,
  flipped: boolean
): Square | null {
  if (x < 0 || y < 0 || x >= boardSize || y >= boardSize) return null;
  
  const cellSize = boardSize / 8;
  const visualCol = Math.floor(x / cellSize);
  const visualRow = Math.floor(y / cellSize);
  
  const col = flipped ? 7 - visualCol : visualCol;
  const row = flipped ? visualRow : 7 - visualRow;
  
  return { row, col };
}

export function cleanupDragElements(
  floatingPiece: HTMLElement | null,
  dragElement: HTMLElement | null
): void {
  if (floatingPiece) {
    floatingPiece.remove();
  }
  
  if (dragElement) {
    dragElement.style.visibility = '';
  }
}