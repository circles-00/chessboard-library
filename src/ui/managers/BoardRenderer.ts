import { Chessboard } from '../../core/Chessboard';
import { Square, Piece } from '../../core/types';
import { UIElements, BoardSettings, ChessboardUIConfig } from '../types';
import { createPieceElement } from '../pieces';
import {
  BOARD_SIZE,
  DEFAULT_ANIMATION_DURATION,
  FILES,
  RANKS,
  PIECE_SIZE_RATIO,
} from '../constants';
import {
  getBoardContainerStyles,
  getBoardStyles,
  getSquareStyles,
  getPieceStyles,
  getFileCoordinateStyles,
  getRankCoordinateStyles,
  generateDynamicCSS,
} from '../styles';

export class BoardRenderer {
  constructor(
    private element: HTMLElement,
    private chessboard: Chessboard,
    private ui: UIElements,
    private settings: BoardSettings,
    private config: ChessboardUIConfig
  ) {}

  setupBoard(): void {
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

  render(): void {
    if (!this.ui.boardElement) return;
    
    this.ui.boardElement.innerHTML = '';
    this.renderSquares();
    this.renderPieces();
  }

  renderSquares(): void {
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

  renderPieces(): void {
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

  createSquareElement(row: number, col: number): HTMLElement {
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

    return squareElement;
  }

  createPieceElement(piece: Piece, square: Square): HTMLElement {
    const pieceSize = Math.floor((this.config.size ?? 500) / BOARD_SIZE * PIECE_SIZE_RATIO);
    const pieceElement = createPieceElement(piece, pieceSize);

    pieceElement.className = `piece ${piece.color} ${piece.type}`;
    pieceElement.dataset.row = `${square.row}`;
    pieceElement.dataset.col = `${square.col}`;
    pieceElement.draggable = false;

    pieceElement.style.cssText += getPieceStyles(this.config.animationDuration || DEFAULT_ANIMATION_DURATION);

    return pieceElement;
  }

  getSquareElement(row: number, col: number): HTMLElement | null {
    if (!this.ui.boardElement) return null;
    return this.ui.boardElement.querySelector(`[data-row="${row}"][data-col="${col}"]`);
  }

  addCoordinates(): void {
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

  updateCoordinates(): void {
    if (!this.ui.boardContainer) return;
    
    this.ui.boardContainer.querySelectorAll('.coordinate').forEach(el => el.remove());
    if (this.settings.showCoordinates) {
      this.addCoordinates();
    }
  }

  addStyles(): void {
    if (document.getElementById('chessboard-styles')) return;

    const style = document.createElement('style');
    style.id = 'chessboard-styles';
    style.textContent = generateDynamicCSS(this.config);
    document.head.appendChild(style);
  }

  setupArrowLayer(): void {
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
}