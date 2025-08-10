import { Chessboard } from '../core/Chessboard';
import { ChessboardUIConfig } from './types';
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
  getGameEndDialogStyles
} from './styles';
import {
  preventNativeDrag,
  createFloatingPiece,
  updateFloatingPiecePosition,
  getSquareFromPoint,
  cleanupDragElements
} from './dragAndDrop';
import { createPromotionModal, createGameEndDialog } from './promotionDialog';
import { EventEmitter, ChessboardEventType, ChessboardEventListener } from './events';

export class ChessboardUI {
  private boardElement!: HTMLElement;
  private boardContainer!: HTMLElement;
  private selectedSquare: Square | null = null;
  private highlightedSquares: Set<string> = new Set();
  private draggedPiece: { piece: Piece; from: Square } | null = null;
  private dragElement: HTMLElement | null = null;
  private lastMove: Move | null = null;
  private flipped: boolean = false;
  private showCoordinates: boolean = true;
  private promotionModal: HTMLElement | null = null;
  private isDragging: boolean = false;
  private floatingPiece: HTMLElement | null = null;
  private dragLegalTargets: Square[] = [];
  private rightClickHighlights: Set<string> = new Set();
  private arrows: Array<{ from: Square; to: Square }> = [];
  private arrowSvg: SVGElement | null = null;
  private isDrawingArrow: boolean = false;
  private arrowStart: Square | null = null;
  private eventEmitter: EventEmitter = new EventEmitter();
  private dragStartTime: number = 0;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private potentialDragPiece: { piece: Piece; square: Square; element: HTMLElement; event: PointerEvent } | null = null;
  private dragThreshold: number = 5;

  constructor(
    private element: HTMLElement,
    private chessboard: Chessboard,
    private config: ChessboardUIConfig = DefaultChessboardUIConfig
  ) {
    this.showCoordinates = config.showCoordinates ?? true;
    this.setupBoard();
    this.render();
    this.addStyles();
    this.setupArrowLayer();
  }

  private setupBoard(): void {
    this.element.innerHTML = '';

    this.boardContainer = document.createElement('div');
    this.boardContainer.className = 'chessboard-container';
    this.boardContainer.style.cssText = getBoardContainerStyles(this.config.size || 480);

    this.boardElement = document.createElement('div');
    this.boardElement.className = 'chessboard';
    this.boardElement.style.cssText = getBoardStyles();

    this.boardContainer.appendChild(this.boardElement);
    this.element.appendChild(this.boardContainer);

    if (this.showCoordinates) {
      this.addCoordinates();
    }
  }

  private setupArrowLayer(): void {
    if (!this.config.enableArrows) return;

    this.arrowSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    this.arrowSvg.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10;
    `;
    this.arrowSvg.setAttribute('viewBox', '0 0 100 100');
    this.arrowSvg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    this.boardElement.appendChild(this.arrowSvg);
  }

  private addCoordinates(): void {
    for (let i = 0; i < BOARD_SIZE; i++) {
      const fileLabel = document.createElement('div');
      fileLabel.className = 'coordinate file-coordinate';
      fileLabel.textContent = FILES[i];
      fileLabel.style.cssText = getFileCoordinateStyles(i, this.flipped);
      this.boardContainer.appendChild(fileLabel);

      const rankLabel = document.createElement('div');
      rankLabel.className = 'coordinate rank-coordinate';
      rankLabel.textContent = RANKS[7 - i];
      rankLabel.style.cssText = getRankCoordinateStyles(i, this.flipped);
      this.boardContainer.appendChild(rankLabel);
    }
  }

  private render(): void {
    this.boardElement.innerHTML = '';

    this.renderSquares();
    this.renderPieces();
    this.applyHighlights();
    this.applyRightClickHighlights();
    this.addEventListeners();
    this.setupArrowLayer();
    this.renderArrows();
  }

  private renderSquares(): void {
    for (let row = 7; row >= 0; row--) {
      for (let col = 0; col < BOARD_SIZE; col++) {
        const displayRow = this.flipped ? 7 - row : row;
        const displayCol = this.flipped ? 7 - col : col;

        const squareElement = this.createSquareElement(displayRow, displayCol);
        this.boardElement.appendChild(squareElement);
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

    if (this.lastMove) {
      this.highlightSquare(this.lastMove.from, 'lastMove');
      this.highlightSquare(this.lastMove.to, 'lastMove');
    }
  }

  private getSquareElement(row: number, col: number): HTMLElement | null {
    return this.boardElement.querySelector(`[data-row="${row}"][data-col="${col}"]`);
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
    if (this.highlightedSquares.has(highlightKey)) {
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
    if (this.config.enableDragAndDrop) {
      this.boardElement.addEventListener('pointerdown', this.handlePointerDown.bind(this));
    } else {
      this.boardElement.addEventListener('click', this.handleSquareClick.bind(this));
    }

    this.boardElement.addEventListener('contextmenu', (event) => event.preventDefault());

    if (this.config.enableRightClickHighlight || this.config.enableArrows) {
      this.boardElement.addEventListener('pointerdown', this.handleRightClick.bind(this));
      this.boardElement.addEventListener('pointermove', this.handleRightDrag.bind(this));
      this.boardElement.addEventListener('pointerup', this.handleRightRelease.bind(this));
    }
  }

  private handleSquareClick(event: MouseEvent): void {
    const square = this.getSquareFromElement(event.target as HTMLElement);
    if (!square) return;

    if (this.selectedSquare) {
      if (this.selectedSquare.row === square.row && this.selectedSquare.col === square.col) {
        this.clearSelection();
      } else {
        this.tryMove(this.selectedSquare, square);
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

    if (piece.color !== this.chessboard.getTurn()) {
      this.handleSquareClick(event as MouseEvent);
      return;
    }

    const pieceEl = (event.target as HTMLElement).closest('.piece') as HTMLElement;
    if (!pieceEl || this.isDragging) return;

    this.dragStartTime = Date.now();
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    this.potentialDragPiece = { piece, square, element: pieceEl, event };
    
    (event.target as Element).setPointerCapture?.(event.pointerId);
    window.addEventListener('pointermove', this.handleDragStart);
    window.addEventListener('pointerup', this.handlePointerUpWithClick, { once: true });
  }

  private initiateDrag(pieceEl: HTMLElement, piece: Piece, from: Square, event: PointerEvent): void {
    this.draggedPiece = { piece, from };
    this.dragElement = pieceEl;
    this.isDragging = true;

    preventNativeDrag(pieceEl);
    event.preventDefault();

    this.showLegalMoves(from);
    this.setupFloatingPiece(pieceEl, event);

    pieceEl.style.visibility = 'hidden';

    (event.target as Element).setPointerCapture?.(event.pointerId);
    window.addEventListener('pointermove', this.handlePointerMoveBound);
    window.addEventListener('pointerup', this.handlePointerUpBound, { once: true });
    window.addEventListener('pointerdown', this.handleAbortDrag);
  }

  private showLegalMoves(from: Square): void {
    this.clearHighlights();
    this.selectedSquare = from;
    this.highlightSquare(from, 'selected');

    this.dragLegalTargets = this.chessboard.getLegalMoves(from).map(m => m.to);
    for (const to of this.dragLegalTargets) {
      const targetPiece = this.chessboard.getPiece(to);
      this.highlightSquare(to, targetPiece ? 'capture' : 'legalMove');
    }
  }

  private setupFloatingPiece(pieceEl: HTMLElement, event: PointerEvent): void {
    this.floatingPiece = createFloatingPiece(
      pieceEl,
      this.boardContainer,
      event.clientX,
      event.clientY
    );
  }

  private handlePointerMoveBound = (e: PointerEvent) => this.handlePointerMove(e);
  private handlePointerUpBound = (e: PointerEvent) => this.handlePointerUp(e);
  private handleDragStart = (e: PointerEvent) => {
    if (!this.potentialDragPiece) return;
    
    const deltaX = Math.abs(e.clientX - this.dragStartX);
    const deltaY = Math.abs(e.clientY - this.dragStartY); 
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    if (distance > this.dragThreshold) {
      window.removeEventListener('pointermove', this.handleDragStart);
      window.removeEventListener('pointerup', this.handlePointerUpWithClick);
      
      const { piece, square, element, event } = this.potentialDragPiece;
      this.initiateDrag(element, piece, square, event);
      this.potentialDragPiece = null;
    }
  };
  
  private handlePointerUpWithClick = (e: PointerEvent) => {
    window.removeEventListener('pointermove', this.handleDragStart);
    
    if (this.potentialDragPiece) {
      this.handleSquareClick(e as MouseEvent);
      this.potentialDragPiece = null;
    }
  };
  
  private handleAbortDrag = (e: PointerEvent) => {
    if (e.button === 2 && this.isDragging) {
      e.preventDefault();
      e.stopPropagation();
      this.abortDrag();
    }
  };

  private handlePointerMove(event: PointerEvent): void {
    if (!this.isDragging || !this.floatingPiece) return;
    const rect = this.boardContainer.getBoundingClientRect();
    const boardRect = this.boardElement.getBoundingClientRect();
    updateFloatingPiecePosition(
      this.floatingPiece,
      event.clientX - rect.left,
      event.clientY - rect.top,
      boardRect.width,
      boardRect.height
    );
  }

  private handlePointerUp(event: PointerEvent): void {
    if (!this.isDragging) return;

    const rect = this.boardElement.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const square = getSquareFromPoint(x, y, this.boardElement.clientWidth, this.flipped);

    if (this.draggedPiece && square) {
      const dragEl = this.dragElement;
      const fromSquare = this.draggedPiece.from;
      this.tryMove(fromSquare, square);
      if (this.lastMove &&
        this.lastMove.from.row === fromSquare.row &&
        this.lastMove.from.col === fromSquare.col) {
        dragEl?.remove();
      }
    }

    this.cleanupDragState();
    window.removeEventListener('pointermove', this.handlePointerMoveBound);
  }

  private selectSquare(square: Square): void {
    const piece = this.chessboard.getPiece(square);

    if (piece && piece.color === this.chessboard.getTurn()) {
      this.showLegalMovesForSquare(square);
    }
  }

  private showLegalMovesForSquare(square: Square): void {
    this.clearHighlights();
    this.selectedSquare = square;
    this.highlightSquare(square, 'selected');

    const legalMoves = this.chessboard.getLegalMoves(square);
    legalMoves.forEach(move => {
      const targetPiece = this.chessboard.getPiece(move.to);
      this.highlightSquare(move.to, targetPiece ? 'capture' : 'legalMove');
    });
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
    this.closePromotionDialog();

    this.promotionModal = createPromotionModal(
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
    this.boardContainer.appendChild(this.promotionModal);
  }

  private closePromotionDialog(): void {
    if (this.promotionModal) {
      this.promotionModal.remove();
      this.promotionModal = null;
    }
  }

  private highlightSquare(square: Square, type: 'selected' | 'lastMove' | 'check' | 'legalMove' | 'capture'): void {
    const key = `${square.row}-${square.col}`;
    this.highlightedSquares.add(key);

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

  private clearHighlights(): void {
    this.highlightedSquares.clear();
    this.boardElement.querySelectorAll('.highlight').forEach(el => el.remove());
  }

  private handleSuccessfulMove(move: Move): void {
    this.lastMove = move;
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
    this.isDragging = false;
    cleanupDragElements(this.floatingPiece, this.dragElement);
    this.floatingPiece = null;
    this.dragElement = null;
    this.draggedPiece = null;
    this.dragLegalTargets = [];
    window.removeEventListener('pointerdown', this.handleAbortDrag);
  }
  
  private abortDrag(): void {
    window.removeEventListener('pointermove', this.handlePointerMoveBound);
    window.removeEventListener('pointerup', this.handlePointerUpBound);
    this.cleanupDragState();
    this.clearSelection();
  }

  private clearSelection(): void {
    this.selectedSquare = null;
    this.clearHighlights();

    if (this.lastMove) {
      this.highlightSquare(this.lastMove.from, 'lastMove');
      this.highlightSquare(this.lastMove.to, 'lastMove');
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
      this.isDrawingArrow = true;
      this.arrowStart = square;
    }
  }

  private handleRightDrag(): void {
    if (!this.isDrawingArrow || !this.arrowStart) return;
  }

  private handleRightRelease(event: PointerEvent): void {
    if (!this.arrowStart) return;

    const endSquare = this.getSquareFromElement(event.target as HTMLElement);
    if (!endSquare) {
      this.isDrawingArrow = false;
      this.arrowStart = null;
      return;
    }

    const isDrag = endSquare.row !== this.arrowStart.row || endSquare.col !== this.arrowStart.col;

    if (isDrag && this.config.enableArrows) {
      this.toggleArrow(this.arrowStart, endSquare);
    } else if (!isDrag && this.config.enableRightClickHighlight) {
      this.toggleRightClickHighlight(endSquare);
    }

    this.isDrawingArrow = false;
    this.arrowStart = null;
  }

  private toggleRightClickHighlight(square: Square): void {
    const key = `${square.row}-${square.col}`;

    if (this.rightClickHighlights.has(key)) {
      this.rightClickHighlights.delete(key);
    } else {
      this.rightClickHighlights.add(key);
    }

    this.applyRightClickHighlights();
  }

  private applyRightClickHighlights(): void {
    this.boardElement.querySelectorAll('.highlight-rightClick').forEach(el => el.remove());

    for (const key of this.rightClickHighlights) {
      const [row, col] = key.split('-').map(Number);
      const squareElement = this.getSquareElement(row, col);
      if (squareElement) {
        const overlay = this.createHighlightOverlay('rightClick');
        squareElement.appendChild(overlay);
      }
    }
  }

  private toggleArrow(from: Square, to: Square): void {
    const arrowIndex = this.arrows.findIndex(
      arrow => arrow.from.row === from.row && arrow.from.col === from.col &&
        arrow.to.row === to.row && arrow.to.col === to.col
    );

    if (arrowIndex !== -1) {
      this.arrows.splice(arrowIndex, 1);
    } else {
      this.arrows.push({ from, to });
    }

    this.renderArrows();
  }

  private renderArrows(): void {
    if (!this.arrowSvg) return;

    this.arrowSvg.innerHTML = '';

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
    this.arrowSvg.appendChild(defs);

    for (const arrow of this.arrows) {
      const element = this.createArrowElement(arrow.from, arrow.to);
      this.arrowSvg.appendChild(element);
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
    const colDiff = Math.abs(to.col - from.col);
    
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

    const x1 = this.flipped ? 100 - fromX : fromX;
    const y1 = this.flipped ? 100 - fromY : fromY;
    const mx = this.flipped ? 100 - midX : midX;
    const my = this.flipped ? 100 - midY : midY;
    const x2 = this.flipped ? 100 - adjustedToX : adjustedToX;
    const y2 = this.flipped ? 100 - adjustedToY : adjustedToY;

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

    const x1 = this.flipped ? 100 - fromX : fromX;
    const y1 = this.flipped ? 100 - fromY : fromY;
    const adjustedToX = fromX + dx * scale;
    const adjustedToY = fromY + dy * scale;
    const x2 = this.flipped ? 100 - adjustedToX : adjustedToX;
    const y2 = this.flipped ? 100 - adjustedToY : adjustedToY;

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
    this.arrows = [];
    this.renderArrows();
  }

  private clearRightClickHighlights(): void {
    this.rightClickHighlights.clear();
    this.applyRightClickHighlights();
  }

  public on(type: ChessboardEventType, listener: ChessboardEventListener): void {
    this.eventEmitter.on(type, listener);
  }

  public off(type: ChessboardEventType, listener: ChessboardEventListener): void {
    this.eventEmitter.off(type, listener);
  }

  public flipBoard(): void {
    this.flipped = !this.flipped;
    this.render();

    if (this.showCoordinates) {
      this.boardContainer.querySelectorAll('.coordinate').forEach(el => el.remove());
      this.addCoordinates();
    }
  }

  public reset(): void {
    this.chessboard = new Chessboard();
    this.selectedSquare = null;
    this.highlightedSquares.clear();
    this.lastMove = null;
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
