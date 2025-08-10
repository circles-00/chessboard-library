import { Square, Move } from '../../core/types';
import { SelectionState, UIElements, ChessboardUIConfig } from '../types';
import { getHighlightStyle } from '../colors';
import { getHighlightOverlayStyles } from '../styles';

export class SelectionManager {
  constructor(
    private selection: SelectionState,
    private ui: UIElements,
    private config: ChessboardUIConfig
  ) {}

  selectSquare(square: Square): void {
    this.selection.selectedSquare = square;
  }

  clearSelection(): void {
    this.selection.selectedSquare = null;
    this.clearHighlights(true);

    if (this.selection.lastMove) {
      this.highlightSquare(this.selection.lastMove.from, 'lastMove');
      this.highlightSquare(this.selection.lastMove.to, 'lastMove');
    }
  }

  setLastMove(move: Move): void {
    this.selection.lastMove = move;
  }

  highlightSquare(square: Square, type: 'selected' | 'lastMove' | 'check' | 'legalMove' | 'capture' | 'rightClick' | string): void {
    const key = `${square.row}-${square.col}`;
    this.selection.highlightedSquares.add(key);

    const squareElement = this.getSquareElement(square.row, square.col);
    if (!squareElement) return;

    // Remove any existing highlight of this type on this square
    const existingHighlight = squareElement.querySelector(`.highlight-${type}`);
    if (existingHighlight) {
      existingHighlight.remove();
    }

    const overlay = this.createHighlightOverlay(type);
    squareElement.appendChild(overlay);
  }

  clearHighlights(preserveLastMove: boolean = false): void {
    if (!this.ui.boardElement) return;
    
    if (preserveLastMove) {
      this.ui.boardElement.querySelectorAll('.highlight:not(.highlight-lastMove)').forEach(el => el.remove());
      const newHighlights = new Set<string>();
      if (this.selection.lastMove) {
        newHighlights.add(`${this.selection.lastMove.from.row}-${this.selection.lastMove.from.col}`);
        newHighlights.add(`${this.selection.lastMove.to.row}-${this.selection.lastMove.to.col}`);
      }
      this.selection.highlightedSquares = newHighlights;
    } else {
      this.selection.highlightedSquares.clear();
      this.ui.boardElement.querySelectorAll('.highlight').forEach(el => el.remove());
    }
  }

  toggleRightClickHighlight(square: Square): void {
    const key = `${square.row}-${square.col}`;

    if (this.selection.rightClickHighlights.has(key)) {
      this.selection.rightClickHighlights.delete(key);
    } else {
      this.selection.rightClickHighlights.add(key);
    }

    this.applyRightClickHighlights();
  }

  applyRightClickHighlights(): void {
    if (!this.ui.boardElement) return;
    
    this.ui.boardElement.querySelectorAll('.highlight-rightClick').forEach(el => el.remove());

    for (const key of this.selection.rightClickHighlights) {
      const [row, col] = key.split('-').map(Number);
      const squareElement = this.getSquareElement(row, col);
      if (squareElement) {
        const overlay = this.createHighlightOverlay('rightClick');
        squareElement.appendChild(overlay);
      }
    }
  }

  clearRightClickHighlights(): void {
    this.selection.rightClickHighlights.clear();
    this.applyRightClickHighlights();
  }

  applyHighlights(isCheck: boolean, kingSquare: Square | null): void {
    const gameState = { isCheck };
    
    if (gameState.isCheck && kingSquare) {
      this.highlightSquare(kingSquare, 'check');
    }

    if (this.selection.lastMove) {
      this.highlightSquare(this.selection.lastMove.from, 'lastMove');
      this.highlightSquare(this.selection.lastMove.to, 'lastMove');
    }
  }

  private createHighlightOverlay(type: string): HTMLElement {
    const overlay = document.createElement('div');
    overlay.className = `highlight highlight-${type}`;

    Object.assign(overlay.style, getHighlightOverlayStyles());

    const style = getHighlightStyle(type, this.config.colors);
    if (style) {
      if ('innerHTML' in style && style.innerHTML) {
        overlay.innerHTML = style.innerHTML;
      } else {
        Object.assign(overlay.style, style);
      }
    }

    return overlay;
  }

  private getSquareElement(row: number, col: number): HTMLElement | null {
    if (!this.ui.boardElement) return null;
    return this.ui.boardElement.querySelector(`[data-row="${row}"][data-col="${col}"]`);
  }

  getSelectedSquare(): Square | null {
    return this.selection.selectedSquare;
  }

  getLastMove(): Move | null {
    return this.selection.lastMove;
  }
}