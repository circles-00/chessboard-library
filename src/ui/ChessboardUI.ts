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
  DEFAULT_BOARD_SIZE_PX,
} from './constants';
import { DEFAULT_COLORS, getHighlightStyle } from './colors';
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

  constructor(
    private element: HTMLElement,
    private chessboard: Chessboard,
    private config: ChessboardUIConfig = {
      colors: DEFAULT_COLORS,
      pieceSet: 'default',
      size: DEFAULT_BOARD_SIZE_PX,
      showCoordinates: true,
      enableDragAndDrop: true,
      enableHighlights: true,
      animationDuration: DEFAULT_ANIMATION_DURATION
    }
  ) {
    this.showCoordinates = config.showCoordinates ?? true;
    this.setupBoard();
    this.render();
    this.addStyles();
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

  private addCoordinates(): void {
    for (let i = 0; i < BOARD_SIZE; i++) {
      const fileLabel = document.createElement('div');
      fileLabel.className = 'coordinate file-coordinate';
      fileLabel.textContent = this.flipped ? FILES[7 - i] : FILES[i];
      fileLabel.style.cssText = getFileCoordinateStyles(i, this.flipped);
      this.boardContainer.appendChild(fileLabel);

      const rankLabel = document.createElement('div');
      rankLabel.className = 'coordinate rank-coordinate';
      rankLabel.textContent = this.flipped ? RANKS[i] : RANKS[7 - i];
      rankLabel.style.cssText = getRankCoordinateStyles(i, this.flipped);
      this.boardContainer.appendChild(rankLabel);
    }
  }

  private render(): void {
    this.boardElement.innerHTML = '';

    this.renderSquares();
    this.renderPieces();
    this.applyHighlights();
    this.addEventListeners();
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
    const isLight = (row + col) % 2 === 0;
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
    this.boardElement.addEventListener('click', this.handleSquareClick.bind(this));

    if (this.config.enableDragAndDrop ?? true) {
      this.boardElement.addEventListener('pointerdown', this.handlePointerDown.bind(this));
    }
  }

  private handleSquareClick(event: MouseEvent): void {
    const square = this.getSquareFromElement(event.target as HTMLElement);
    if (!square) return;

    if (this.selectedSquare) {
      this.tryMove(this.selectedSquare, square);
    } else {
      this.selectSquare(square);
    }
  }

  private getSquareFromElement(element: HTMLElement): Square | null {
    const squareElement = element.closest('.square') as HTMLElement;
    if (!squareElement) return null;

    const row = parseInt(squareElement.dataset.row!);
    const col = parseInt(squareElement.dataset.col!);
    return { row, col };
  }

  private handlePointerDown(event: PointerEvent): void {
    const square = this.getSquareFromElement(event.target as HTMLElement);
    if (!square) return;

    const piece = this.chessboard.getPiece(square);
    if (!piece || piece.color !== this.chessboard.getTurn()) return;

    const pieceEl = (event.target as HTMLElement).closest('.piece') as HTMLElement;
    if (!pieceEl || this.isDragging) return;

    this.initiateDrag(pieceEl, piece, square, event);
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

  private handlePointerMove(event: PointerEvent): void {
    if (!this.isDragging || !this.floatingPiece) return;
    const rect = this.boardContainer.getBoundingClientRect();
    updateFloatingPiecePosition(
      this.floatingPiece,
      event.clientX - rect.left,
      event.clientY - rect.top
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
        this.selectSquare(to);
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
      const winner = gameState.turn === 'white' ? 'Black' : 'White';
      this.showGameEndDialog(`Checkmate! ${winner} wins!`);
    } else if (gameState.isStalemate) {
      this.showGameEndDialog('Stalemate! The game is a draw.');
    } else if (gameState.isDraw) {
      this.showGameEndDialog('Draw!');
    }
  }

  private showGameEndDialog(message: string): void {
    const dialog = createGameEndDialog(message);
    dialog.style.cssText = getGameEndDialogStyles();
    this.boardContainer.appendChild(dialog);
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
