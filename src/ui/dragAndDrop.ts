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
  y: number
): void {
  floatingPiece.style.left = `${x}px`;
  floatingPiece.style.top = `${y}px`;
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