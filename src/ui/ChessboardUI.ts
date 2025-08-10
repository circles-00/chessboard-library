import { Chessboard } from '../core/Chessboard';
import { 
  ChessboardUIConfig, 
  UIElements, 
  SelectionState, 
  DragState, 
  ArrowState, 
  BoardSettings 
} from './types';
import { Square, Piece, Move } from '../core/types';
import { createPieceElement } from './pieces';
import {
  BOARD_SIZE,
  DEFAULT_ANIMATION_DURATION,
  FILES,
  RANKS,
  PIECE_SIZE_RATIO,
} from './constants';
import { DEFAULT_COLORS, getHighlightStyle } from './colors';
import { DefaultChessboardUIConfig } from './defaultConfig';
import {
  getBoardContainerStyles,
  getBoardStyles,
  getSquareStyles,
  getPieceStyles,
  getFileCoordinateStyles,
  getRankCoordinateStyles,
  getHighlightOverlayStyles,
  generateDynamicCSS,
} from './styles';
import {
  preventNativeDrag,
  createFloatingPiece,
  updateFloatingPiecePosition,
  getSquareFromPoint,
  cleanupDragElements
} from './dragAndDrop';
import { createPromotionModal, } from './promotionDialog';
import { EventEmitter, ChessboardEventType, ChessboardEventListener } from './events';

export class ChessboardUI {
  private ui: UIElements = {
    boardElement: null,
    boardContainer: null,
    promotionModal: null,
    arrowSvg: null,
    floatingPiece: null,
    dragElement: null
  };
  
  private selection: SelectionState = {
    selectedSquare: null,
    highlightedSquares: new Set(),
    rightClickHighlights: new Set(),
    lastMove: null
  };
  
  private drag: DragState = {
    isDragging: false,
    draggedPiece: null,
    dragLegalTargets: [],
    dragStartX: 0,
    dragStartY: 0,
    dragThreshold: 5,
    potentialDragPiece: null
  };
  
  private arrow: ArrowState = {
    arrows: [],
    isDrawingArrow: false,
    arrowStart: null
  };
  
  private settings: BoardSettings = {
    flipped: false,
    showCoordinates: true
  };
  
  private eventEmitter: EventEmitter = new EventEmitter();

  constructor(
    private element: HTMLElement,
    private chessboard: Chessboard,
    private config: ChessboardUIConfig = DefaultChessboardUIConfig
  ) {
    this.settings.showCoordinates = config.showCoordinates ?? true;
    this.setupBoard();
    this.render();
    this.addStyles();
    this.setupArrowLayer();
  }

  private setupBoard(): void {
    this.element.innerHTML = '';

    this.ui.boardContainer = document.createElement('div');
    this.ui.boardContainer.className = 'chessboard-container';
    this.ui.boardContainer.style.cssText = getBoardContainerStyles(this.config.size || 480);

    this.ui.boardElement = document.createElement('div');
    this.ui.boardElement.className = 'chessboard';
    this.ui.boardElement.style.cssText = getBoardStyles();

    this.ui.boardContainer.appendChild(this.ui.boardElement);
    this.element.appendChild(this.ui.boardContainer);

    if (this.settings.showCoordinates) {
      this.addCoordinates();
    }
  }

  private setupArrowLayer(): void {
    if (!this.config.enableArrows || !this.ui.boardElement) return;

    this.ui.arrowSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.ui.arrowSvg.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10;
    `;
    this.ui.arrowSvg.setAttribute('viewBox', '0 0 100 100');
    this.ui.arrowSvg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    this.ui.boardElement.appendChild(this.ui.arrowSvg);
  }

  private addCoordinates(): void {
    if (!this.ui.boardContainer) return;
    
    for (let i = 0; i < BOARD_SIZE; i++) {
      const fileLabel = document.createElement('div');
      fileLabel.className = 'coordinate file-coordinate';
      fileLabel.textContent = FILES[i];
      fileLabel.style.cssText = getFileCoordinateStyles(i, this.settings.flipped);
      this.ui.boardContainer.appendChild(fileLabel);

      const rankLabel = document.createElement('div');
      rankLabel.className = 'coordinate rank-coordinate';
      rankLabel.textContent = RANKS[7 - i];
      rankLabel.style.cssText = getRankCoordinateStyles(i, this.settings.flipped);
      this.ui.boardContainer.appendChild(rankLabel);
    }
  }

  private render(): void {
    if (!this.ui.boardElement) return;
    
    this.ui.boardElement.innerHTML = '';

    this.renderSquares();
    this.renderPieces();
    this.applyHighlights();
    this.applyRightClickHighlights();
    this.addEventListeners();
    this.setupArrowLayer();
    this.renderArrows();
  }

  private renderSquares(): void {
    if (!this.ui.boardElement) return;
    
    for (let row = 7; row >= 0; row--) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const displayRow = this.settings.flipped ? 7 - row : row;
        const displayCol = this.settings.flipped ? 7 - col : col;

        const squareElement = this.createSquareElement(displayRow, displayCol);
        this.ui.boardElement.appendChild(squareElement);
      }
    }
  }

  private renderPieces(): void {
    for (let row = 0; row < BOARD_SIZE; row++) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const piece = this.chessboard.getPiece({ row, col });
        if (piece) {
          const squareEl = this.getSquareElement(row, col);
          if (squareEl) {
            const pieceElement = this.createPieceElement(piece, { row, col });
            squareEl.appendChild(pieceElement);
          }
        }
      }
    }
  }

  private applyHighlights(): void {
    const gameState = this.chessboard.getGameState();

    if (gameState.isCheck) {
      const kingSquare = this.chessboard.getPosition().findKing(gameState.turn);
      if (kingSquare) {
        this.highlightSquare(kingSquare, 'check');
      }
    }

    if (this.selection.lastMove) {
      this.highlightSquare(this.selection.lastMove.from, 'lastMove');
      this.highlightSquare(this.selection.lastMove.to, 'lastMove');
    }
  }

  private getSquareElement(row: number, col: number): HTMLElement | null {
    if (!this.ui.boardElement) return null;
    return this.ui.boardElement.querySelector(`[data-row="${row}"][data-col="${col}"]`);
  }

  private createSquareElement(row: number, col: number): HTMLElement {
    const squareElement = document.createElement('div');
    const isLight = (row + col) % 2 !== 0;
    squareElement.className = `square ${isLight ? 'light' : 'dark'}`;
    squareElement.dataset.row = `${row}`;
    squareElement.dataset.col = `${col}`;

    squareElement.style.cssText = getSquareStyles(
      isLight,
      this.config.colors.light,
      this.config.colors.dark
    );

    const highlightKey = `${row}-${col}`;
    if (this.selection.highlightedSquares.has(highlightKey)) {
      squareElement.classList.add('highlighted');
    }

    return squareElement;
  }

  private createPieceElement(piece: Piece, square: Square): HTMLElement {
    const pieceSize = Math.floor((this.config.size ?? 500) / BOARD_SIZE * PIECE_SIZE_RATIO);
    const pieceElement = createPieceElement(piece, pieceSize);

    pieceElement.className = `piece ${piece.color} ${piece.type}`;
    pieceElement.dataset.row = `${square.row}`;
    pieceElement.dataset.col = `${square.col}`;
    pieceElement.draggable = false;

    pieceElement.style.cssText += getPieceStyles(this.config.animationDuration || DEFAULT_ANIMATION_DURATION);

    return pieceElement;
  }



  private addEventListeners(): void {
    if (!this.ui.boardElement) return;
    
    if (this.config.enableDragAndDrop) {
      this.ui.boardElement.addEventListener('pointerdown', this.handlePointerDown.bind(this));
    } else {
      this.ui.boardElement.addEventListener('click', this.handleSquareClick.bind(this));
    }

    this.ui.boardElement.addEventListener('contextmenu', (event) => event.preventDefault());

    if (this.config.enableRightClickHighlight || this.config.enableArrows) {
      this.ui.boardElement.addEventListener('pointerdown', this.handleRightClick.bind(this));
      this.ui.boardElement.addEventListener('pointermove', this.handleRightDrag.bind(this));
      this.ui.boardElement.addEventListener('pointerup', this.handleRightRelease.bind(this));
    }
  }

  private handleSquareClick(event: MouseEvent): void {
    const square = this.getSquareFromElement(event.target as HTMLElement);
    if (!square) return;

    const clickedPiece = this.chessboard.getPiece(square);

    if (this.selection.selectedSquare) {
      if (this.selection.selectedSquare.row === square.row && this.selection.selectedSquare.col === square.col) {
        this.clearSelection();
      } else {
        const selectedPiece = this.chessboard.getPiece(this.selection.selectedSquare);
        if (selectedPiece && selectedPiece.color === this.chessboard.getTurn()) {
          this.tryMove(this.selection.selectedSquare, square);
        } else if (clickedPiece) {
          this.selectSquare(square);
        } else {
          this.clearSelection();
        }
      }
    } else {
      this.selectSquare(square);
    }

    this.clearArrows();
    this.clearRightClickHighlights();
  }

  private getSquareFromElement(element: HTMLElement): Square | null {
    const squareElement = element.closest('.square') as HTMLElement;
    if (!squareElement) return null;

    const row = parseInt(squareElement.dataset.row!);
    const col = parseInt(squareElement.dataset.col!);
    return { row, col };
  }

  private handlePointerDown(event: PointerEvent): void {
    if (event.button !== 0) return;

    const square = this.getSquareFromElement(event.target as HTMLElement);
    if (!square) return;

    const piece = this.chessboard.getPiece(square);

    if (!piece) {
      this.handleSquareClick(event as MouseEvent);
      return;
    }

    const pieceEl = (event.target as HTMLElement).closest('.piece') as HTMLElement;
    if (!pieceEl || this.drag.isDragging) return;

    this.drag.dragStartX = event.clientX;
    this.drag.dragStartY = event.clientY;
    this.drag.potentialDragPiece = { piece, square, element: pieceEl, event };

    (event.target as Element).setPointerCapture?.(event.pointerId);
    window.addEventListener('pointermove', this.handleDragStart);
    window.addEventListener('pointerup', this.handlePointerUpWithClick, { once: true });
  }

  private initiateDrag(pieceEl: HTMLElement, piece: Piece, from: Square, event: PointerEvent): void {
    this.drag.draggedPiece = { piece, from };
    this.ui.dragElement = pieceEl;
    this.drag.isDragging = true;

    preventNativeDrag(pieceEl);
    event.preventDefault();

    this.showLegalMoves(from);
    this.setupFloatingPiece(pieceEl, event);

    pieceEl.style.visibility = 'hidden';

    (event.target as Element).setPointerCapture?.(event.pointerId);
    window.addEventListener('pointermove', this.handlePointerMoveBound);
    window.addEventListener('pointerup', this.handlePointerUpBound, { once: true });
    window.addEventListener('contextmenu', this.handleAbortDragOnRightClick);
    document.addEventListener('pointerdown', this.handleAbortDragOnRightClick);
  }

  private showLegalMoves(from: Square): void {
    this.clearHighlights(true);
    this.selection.selectedSquare = from;

    if (this.selection.lastMove) {
      this.highlightSquare(this.selection.lastMove.from, 'lastMove');
      this.highlightSquare(this.selection.lastMove.to, 'lastMove');
    }

    this.highlightSquare(from, 'selected');

    const piece = this.chessboard.getPiece(from);
    if (piece && piece.color === this.chessboard.getTurn()) {
      this.drag.dragLegalTargets = this.chessboard.getLegalMoves(from).map(m => m.to);
      for (const to of this.drag.dragLegalTargets) {
        const targetPiece = this.chessboard.getPiece(to);
        this.highlightSquare(to, targetPiece ? 'capture' : 'legalMove');
      }
    } else {
      this.drag.dragLegalTargets = [];
    }
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

  private handlePointerMoveBound = (e: PointerEvent) => this.handlePointerMove(e);
  private handlePointerUpBound = (e: PointerEvent) => this.handlePointerUp(e);
  private handleDragStart = (e: PointerEvent) => {
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
  };

  private handlePointerUpWithClick = (e: PointerEvent) => {
    window.removeEventListener('pointermove', this.handleDragStart);

    if (this.drag.potentialDragPiece) {
      this.handleSquareClick(e as MouseEvent);
      this.drag.potentialDragPiece = null;
    }
  };

  private handleAbortDragOnRightClick = (e: MouseEvent | PointerEvent) => {
    if (this.drag.isDragging && (e.type === 'contextmenu' || (e as PointerEvent).button === 2)) {
      e.preventDefault();
      e.stopPropagation();
      this.abortDrag();
    }
  };

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
      const dragEl = this.ui.dragElement;
      const fromSquare = this.drag.draggedPiece.from;
      const piece = this.drag.draggedPiece.piece;

      if (piece.color === this.chessboard.getTurn()) {
        this.tryMove(fromSquare, square);
        if (this.selection.lastMove &&
          this.selection.lastMove.from.row === fromSquare.row &&
          this.selection.lastMove.from.col === fromSquare.col) {
          dragEl?.remove();
        }
      } else {
        this.selection.selectedSquare = fromSquare;
      }
    }

    this.cleanupDragState();
    window.removeEventListener('pointermove', this.handlePointerMoveBound);
  }

  private selectSquare(square: Square): void {
    const piece = this.chessboard.getPiece(square);

    if (piece) {
      this.showLegalMovesForSquare(square);
    }
  }

  private showLegalMovesForSquare(square: Square): void {
    this.clearHighlights(true);
    this.selection.selectedSquare = square;

    if (this.selection.lastMove) {
      this.highlightSquare(this.selection.lastMove.from, 'lastMove');
      this.highlightSquare(this.selection.lastMove.to, 'lastMove');
    }

    this.highlightSquare(square, 'selected');

    const piece = this.chessboard.getPiece(square);
    if (piece && piece.color === this.chessboard.getTurn()) {
      const legalMoves = this.chessboard.getLegalMoves(square);
      legalMoves.forEach(move => {
        const targetPiece = this.chessboard.getPiece(move.to);
        this.highlightSquare(move.to, targetPiece ? 'capture' : 'legalMove');
      });
    }
  }

  private tryMove(from: Square, to: Square): void {
    const piece = this.chessboard.getPiece(from);
    if (!piece) {
      this.clearSelection();
      return;
    }

    const targetPiece = this.chessboard.getPiece(to);
    if (targetPiece && targetPiece.color === piece.color) {
      this.clearSelection();
      this.selectSquare(to);
      return;
    }

    const isPromotion = piece.type === 'pawn' &&
      ((piece.color === 'white' && to.row === 7) || (piece.color === 'black' && to.row === 0));

    if (isPromotion) {
      this.showPromotionDialog(from, to, piece.color);
    } else {
      const move: Move = { from, to };
      if (this.chessboard.move(move)) {
        this.handleSuccessfulMove(move);
      } else {
        this.clearSelection();
      }
    }
  }

  private showPromotionDialog(from: Square, to: Square, color: 'white' | 'black'): void {
    if (!this.ui.boardContainer) return;
    
    this.closePromotionDialog();

    this.ui.promotionModal = createPromotionModal(
      from,
      to,
      color,
      (from, to, pieceType) => {
        const move: Move = { from, to, promotion: pieceType };
        if (this.chessboard.move(move)) {
          this.handleSuccessfulMove(move);
        }
        this.closePromotionDialog();
      }
    );
    this.ui.boardContainer.appendChild(this.ui.promotionModal);
  }

  private closePromotionDialog(): void {
    if (this.ui.promotionModal) {
      this.ui.promotionModal.remove();
      this.ui.promotionModal = null;
    }
  }

  private highlightSquare(square: Square, type: 'selected' | 'lastMove' | 'check' | 'legalMove' | 'capture'): void {
    const key = `${square.row}-${square.col}`;
    this.selection.highlightedSquares.add(key);

    const squareElement = this.getSquareElement(square.row, square.col);
    if (!squareElement) return;

    const overlay = this.createHighlightOverlay(type);
    squareElement.appendChild(overlay);
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

  private clearHighlights(preserveLastMove: boolean = false): void {
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

  private handleSuccessfulMove(move: Move): void {
    this.selection.lastMove = move;
    this.clearSelection();

    const gameState = this.chessboard.getGameState();

    this.eventEmitter.emit({
      type: 'move',
      data: { move, gameState }
    });

    if (move.isCapture) {
      this.eventEmitter.emit({
        type: 'capture',
        data: { move, capturedPiece: move.capturedPiece, gameState }
      });
    }

    if (move.isCastling) {
      this.eventEmitter.emit({
        type: 'castle',
        data: { move, side: move.castlingSide!, gameState }
      });
    }

    if (move.promotion) {
      this.eventEmitter.emit({
        type: 'promotion',
        data: { move, gameState }
      });
    }

    this.render();
    this.checkGameStatus();
  }

  private cleanupDragState(): void {
    this.drag.isDragging = false;
    cleanupDragElements(this.ui.floatingPiece, this.ui.dragElement);
    this.ui.floatingPiece = null;
    this.ui.dragElement = null;
    this.drag.draggedPiece = null;
    this.drag.dragLegalTargets = [];
    window.removeEventListener('contextmenu', this.handleAbortDragOnRightClick);
    document.removeEventListener('pointerdown', this.handleAbortDragOnRightClick);
  }

  private abortDrag(): void {
    window.removeEventListener('pointermove', this.handlePointerMoveBound);
    window.removeEventListener('pointerup', this.handlePointerUpBound);
    this.cleanupDragState();
    this.clearSelection();
  }

  private clearSelection(): void {
    this.selection.selectedSquare = null;
    this.clearHighlights(true);

    if (this.selection.lastMove) {
      this.highlightSquare(this.selection.lastMove.from, 'lastMove');
      this.highlightSquare(this.selection.lastMove.to, 'lastMove');
    }
  }

  private checkGameStatus(): void {
    const gameState = this.chessboard.getGameState();

    if (gameState.isCheckmate) {
      const winner = gameState.turn === 'white' ? 'black' : 'white';
      this.eventEmitter.emit({
        type: 'checkmate',
        data: { winner, gameState }
      });
    } else if (gameState.isStalemate) {
      this.eventEmitter.emit({
        type: 'stalemate',
        data: { gameState }
      });
    } else if (gameState.isDraw) {
      this.eventEmitter.emit({
        type: 'draw',
        data: { reason: 'Insufficient material or threefold repetition', gameState }
      });
    } else if (gameState.isCheck) {
      this.eventEmitter.emit({
        type: 'check',
        data: { kingColor: gameState.turn, gameState }
      });
    }
  }

  private handleRightClick(event: PointerEvent): void {
    if (event.button !== 2) return;
    event.preventDefault();

    const square = this.getSquareFromElement(event.target as HTMLElement);
    if (!square) return;

    if (this.config.enableArrows) {
      this.arrow.isDrawingArrow = true;
      this.arrow.arrowStart = square;
    }
  }

  private handleRightDrag(): void {
    if (!this.arrow.isDrawingArrow || !this.arrow.arrowStart) return;
  }

  private handleRightRelease(event: PointerEvent): void {
    if (!this.arrow.arrowStart) return;

    const endSquare = this.getSquareFromElement(event.target as HTMLElement);
    if (!endSquare) {
      this.arrow.isDrawingArrow = false;
      this.arrow.arrowStart = null;
      return;
    }

    const isDrag = endSquare.row !== this.arrow.arrowStart.row || endSquare.col !== this.arrow.arrowStart.col;

    if (isDrag && this.config.enableArrows) {
      this.toggleArrow(this.arrow.arrowStart, endSquare);
    } else if (!isDrag && this.config.enableRightClickHighlight) {
      this.toggleRightClickHighlight(endSquare);
    }

    this.arrow.isDrawingArrow = false;
    this.arrow.arrowStart = null;
  }

  private toggleRightClickHighlight(square: Square): void {
    const key = `${square.row}-${square.col}`;

    if (this.selection.rightClickHighlights.has(key)) {
      this.selection.rightClickHighlights.delete(key);
    } else {
      this.selection.rightClickHighlights.add(key);
    }

    this.applyRightClickHighlights();
  }

  private applyRightClickHighlights(): void {
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

  private toggleArrow(from: Square, to: Square): void {
    const arrowIndex = this.arrow.arrows.findIndex(
      arrow => arrow.from.row === from.row && arrow.from.col === from.col &&
        arrow.to.row === to.row && arrow.to.col === to.col
    );

    if (arrowIndex !== -1) {
      this.arrow.arrows.splice(arrowIndex, 1);
    } else {
      this.arrow.arrows.push({ from, to });
    }

    this.renderArrows();
  }

  private renderArrows(): void {
    if (!this.ui.arrowSvg) return;

    this.ui.arrowSvg.innerHTML = '';

    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
    marker.setAttribute('id', 'arrowhead');
    marker.setAttribute('markerWidth', '4');
    marker.setAttribute('markerHeight', '4');
    marker.setAttribute('refX', '2');
    marker.setAttribute('refY', '2');
    marker.setAttribute('orient', 'auto');
    marker.setAttribute('markerUnits', 'strokeWidth');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', 'M0,0 L0,4 L4,2 z');
    path.setAttribute('fill', this.config.colors.arrow || DEFAULT_COLORS.arrow || 'rgba(255, 170, 0, 0.8)');

    marker.appendChild(path);
    defs.appendChild(marker);
    this.ui.arrowSvg.appendChild(defs);

    for (const arrow of this.arrow.arrows) {
      const element = this.createArrowElement(arrow.from, arrow.to);
      this.ui.arrowSvg.appendChild(element);
    }
  }

  private isKnightMove(from: Square, to: Square): boolean {
    const rowDiff = Math.abs(to.row - from.row);
    const colDiff = Math.abs(to.col - from.col);
    return (rowDiff === 2 && colDiff === 1) || (rowDiff === 1 && colDiff === 2);
  }

  private isLegalKnightMove(from: Square, to: Square): boolean {
    if (!this.isKnightMove(from, to)) return false;

    const piece = this.chessboard.getPiece(from);
    if (!piece || piece.type !== 'knight') return false;

    const legalMoves = this.chessboard.getLegalMoves(from);
    return legalMoves.some(move => move.to.row === to.row && move.to.col === to.col);
  }

  private createArrowElement(from: Square, to: Square): SVGElement {
    if (this.isLegalKnightMove(from, to)) {
      return this.createKnightArrow(from, to);
    } else {
      return this.createStraightArrow(from, to);
    }
  }

  private createKnightArrow(from: Square, to: Square): SVGPathElement {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');

    const fromX = (from.col + 0.5) * 12.5;
    const fromY = (7 - from.row + 0.5) * 12.5;
    const toX = (to.col + 0.5) * 12.5;
    const toY = (7 - to.row + 0.5) * 12.5;

    const rowDiff = Math.abs(to.row - from.row);

    let midX, midY;
    if (rowDiff === 2) {
      midX = fromX;
      midY = toY;
    } else {
      midX = toX;
      midY = fromY;
    }

    const dx = toX - midX;
    const dy = toY - midY;
    const length = Math.sqrt(dx * dx + dy * dy);
    const scale = length > 0 ? (length - 2) / length : 1;
    const adjustedToX = midX + dx * scale;
    const adjustedToY = midY + dy * scale;

    const x1 = this.settings.flipped ? 100 - fromX : fromX;
    const y1 = this.settings.flipped ? 100 - fromY : fromY;
    const mx = this.settings.flipped ? 100 - midX : midX;
    const my = this.settings.flipped ? 100 - midY : midY;
    const x2 = this.settings.flipped ? 100 - adjustedToX : adjustedToX;
    const y2 = this.settings.flipped ? 100 - adjustedToY : adjustedToY;

    const pathData = `M ${x1} ${y1} L ${mx} ${my} L ${x2} ${y2}`;
    path.setAttribute('d', pathData);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', this.config.colors.arrow || DEFAULT_COLORS.arrow || 'rgba(255, 170, 0, 0.8)');
    path.setAttribute('stroke-width', '2.5');
    path.setAttribute('marker-end', 'url(#arrowhead)');
    path.setAttribute('opacity', '0.7');
    path.setAttribute('stroke-linejoin', 'round');

    return path;
  }

  private createStraightArrow(from: Square, to: Square): SVGLineElement {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');

    const fromX = (from.col + 0.5) * 12.5;
    const fromY = (7 - from.row + 0.5) * 12.5;
    const toX = (to.col + 0.5) * 12.5;
    const toY = (7 - to.row + 0.5) * 12.5;

    const dx = toX - fromX;
    const dy = toY - fromY;
    const length = Math.sqrt(dx * dx + dy * dy);
    const scale = (length - 2) / length;

    const x1 = this.settings.flipped ? 100 - fromX : fromX;
    const y1 = this.settings.flipped ? 100 - fromY : fromY;
    const adjustedToX = fromX + dx * scale;
    const adjustedToY = fromY + dy * scale;
    const x2 = this.settings.flipped ? 100 - adjustedToX : adjustedToX;
    const y2 = this.settings.flipped ? 100 - adjustedToY : adjustedToY;

    line.setAttribute('x1', x1.toString());
    line.setAttribute('y1', y1.toString());
    line.setAttribute('x2', x2.toString());
    line.setAttribute('y2', y2.toString());
    line.setAttribute('stroke', this.config.colors.arrow || DEFAULT_COLORS.arrow || 'rgba(255, 170, 0, 0.8)');
    line.setAttribute('stroke-width', '2.5');
    line.setAttribute('marker-end', 'url(#arrowhead)');
    line.setAttribute('opacity', '0.7');

    return line;
  }

  private clearArrows(): void {
    this.arrow.arrows = [];
    this.renderArrows();
  }

  private clearRightClickHighlights(): void {
    this.selection.rightClickHighlights.clear();
    this.applyRightClickHighlights();
  }

  public on(type: ChessboardEventType, listener: ChessboardEventListener): void {
    this.eventEmitter.on(type, listener);
  }

  public off(type: ChessboardEventType, listener: ChessboardEventListener): void {
    this.eventEmitter.off(type, listener);
  }

  public flipBoard(): void {
    this.settings.flipped = !this.settings.flipped;
    this.render();

    if (this.settings.showCoordinates && this.ui.boardContainer) {
      this.ui.boardContainer.querySelectorAll('.coordinate').forEach(el => el.remove());
      this.addCoordinates();
    }
  }

  public reset(): void {
    this.chessboard = new Chessboard();
    this.selection.selectedSquare = null;
    this.selection.highlightedSquares.clear();
    this.selection.lastMove = null;
    this.clearArrows();
    this.clearRightClickHighlights();
    this.render();
  }

  private addStyles(): void {
    if (document.getElementById('chessboard-styles')) return;

    const style = document.createElement('style');
    style.id = 'chessboard-styles';
    style.textContent = generateDynamicCSS(this.config);
    document.head.appendChild(style);
  }
}
