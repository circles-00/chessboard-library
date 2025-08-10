import { Square, Piece } from '../../core/types';
import { DragState, UIElements, BoardSettings } from '../types';
import {
  preventNativeDrag,
  createFloatingPiece,
  updateFloatingPiecePosition,
  getSquareFromPoint,
  cleanupDragElements
} from './utils';

export class DragDropManager {
  private handlePointerMoveBound = (e: PointerEvent) => this.handlePointerMove(e);
  private handlePointerUpBound = (e: PointerEvent) => this.handlePointerUp(e);
  private handleDragStart = (e: PointerEvent) => this.handleDragStartMove(e);
  private handlePointerUpWithClick = (e: PointerEvent) => this.handlePointerUpClick(e);
  private handleAbortDragOnRightClick = (e: MouseEvent | PointerEvent) => this.handleAbortRightClick(e);

  constructor(
    private drag: DragState,
    private ui: UIElements,
    private settings: BoardSettings,
    private onMove: (from: Square, to: Square) => void,
    private onSquareClick: (event: MouseEvent) => void,
    private onShowLegalMoves: (from: Square) => void,
    private onAbortDrag: () => void
  ) {}

  startPotentialDrag(piece: Piece, square: Square, element: HTMLElement, event: PointerEvent): void {
    this.drag.dragStartX = event.clientX;
    this.drag.dragStartY = event.clientY;
    this.drag.potentialDragPiece = { piece, square, element, event };

    (event.target as Element).setPointerCapture?.(event.pointerId);
    window.addEventListener('pointermove', this.handleDragStart);
    window.addEventListener('pointerup', this.handlePointerUpWithClick, { once: true });
  }

  private handleDragStartMove(e: PointerEvent): void {
    if (!this.drag.potentialDragPiece) return;

    const deltaX = Math.abs(e.clientX - this.drag.dragStartX);
    const deltaY = Math.abs(e.clientY - this.drag.dragStartY);
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance > this.drag.dragThreshold) {
      window.removeEventListener('pointermove', this.handleDragStart);
      window.removeEventListener('pointerup', this.handlePointerUpWithClick);

      const { piece, square, element, event } = this.drag.potentialDragPiece;
      this.initiateDrag(element, piece, square, event);
      this.drag.potentialDragPiece = null;
    }
  }

  private handlePointerUpClick(e: PointerEvent): void {
    window.removeEventListener('pointermove', this.handleDragStart);

    if (this.drag.potentialDragPiece) {
      this.onSquareClick(e as MouseEvent);
      this.drag.potentialDragPiece = null;
    }
  }

  initiateDrag(pieceEl: HTMLElement, piece: Piece, from: Square, event: PointerEvent): void {
    this.drag.draggedPiece = { piece, from };
    this.ui.dragElement = pieceEl;
    this.drag.isDragging = true;

    preventNativeDrag(pieceEl);
    event.preventDefault();

    this.onShowLegalMoves(from);
    this.setupFloatingPiece(pieceEl, event);

    pieceEl.style.visibility = 'hidden';

    (event.target as Element).setPointerCapture?.(event.pointerId);
    window.addEventListener('pointermove', this.handlePointerMoveBound);
    window.addEventListener('pointerup', this.handlePointerUpBound, { once: true });
    window.addEventListener('contextmenu', this.handleAbortDragOnRightClick);
    document.addEventListener('pointerdown', this.handleAbortDragOnRightClick);
  }

  private setupFloatingPiece(pieceEl: HTMLElement, event: PointerEvent): void {
    if (!this.ui.boardContainer) return;
    
    this.ui.floatingPiece = createFloatingPiece(
      pieceEl,
      this.ui.boardContainer,
      event.clientX,
      event.clientY
    );
  }

  private handlePointerMove(event: PointerEvent): void {
    if (!this.drag.isDragging || !this.ui.floatingPiece || !this.ui.boardContainer || !this.ui.boardElement) return;
    const rect = this.ui.boardContainer.getBoundingClientRect();
    const boardRect = this.ui.boardElement.getBoundingClientRect();
    updateFloatingPiecePosition(
      this.ui.floatingPiece,
      event.clientX - rect.left,
      event.clientY - rect.top,
      boardRect.width,
      boardRect.height
    );
  }

  private handlePointerUp(event: PointerEvent): void {
    if (!this.drag.isDragging || !this.ui.boardElement) return;

    const rect = this.ui.boardElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const square = getSquareFromPoint(x, y, this.ui.boardElement.clientWidth, this.settings.flipped);

    if (this.drag.draggedPiece && square) {
      this.onMove(this.drag.draggedPiece.from, square);
    }

    this.cleanupDragState();
    window.removeEventListener('pointermove', this.handlePointerMoveBound);
  }

  private handleAbortRightClick(e: MouseEvent | PointerEvent): void {
    if (this.drag.isDragging && (e.type === 'contextmenu' || (e as PointerEvent).button === 2)) {
      e.preventDefault();
      e.stopPropagation();
      this.abortDrag();
    }
  }

  cleanupDragState(): void {
    this.drag.isDragging = false;
    cleanupDragElements(this.ui.floatingPiece, this.ui.dragElement);
    this.ui.floatingPiece = null;
    this.ui.dragElement = null;
    this.drag.draggedPiece = null;
    this.drag.dragLegalTargets = [];
    window.removeEventListener('contextmenu', this.handleAbortDragOnRightClick);
    document.removeEventListener('pointerdown', this.handleAbortDragOnRightClick);
  }

  abortDrag(): void {
    window.removeEventListener('pointermove', this.handlePointerMoveBound);
    window.removeEventListener('pointerup', this.handlePointerUpBound);
    this.cleanupDragState();
    this.onAbortDrag();
  }

  setDragLegalTargets(targets: Square[]): void {
    this.drag.dragLegalTargets = targets;
  }

  isDragging(): boolean {
    return this.drag.isDragging;
  }

  getDraggedPiece(): { piece: Piece; from: Square } | null {
    return this.drag.draggedPiece;
  }

  shouldRemoveDragElement(lastMove: { from: Square } | null, fromSquare: Square): boolean {
    return !!(lastMove &&
      lastMove.from.row === fromSquare.row &&
      lastMove.from.col === fromSquare.col);
  }
}