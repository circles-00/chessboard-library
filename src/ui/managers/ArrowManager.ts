import { Square } from '../../core/types';
import { ArrowState, UIElements, BoardSettings, ChessboardUIConfig } from '../types';
import { Chessboard } from '../../core/Chessboard';
import { DEFAULT_COLORS } from '../colors';

export class ArrowManager {
  constructor(
    private arrow: ArrowState,
    private ui: UIElements,
    private settings: BoardSettings,
    private config: ChessboardUIConfig,
    private chessboard: Chessboard
  ) {}

  startDrawing(square: Square): void {
    if (this.config.enableArrows) {
      this.arrow.isDrawingArrow = true;
      this.arrow.arrowStart = square;
    }
  }

  handleDrag(): void {
    if (!this.arrow.isDrawingArrow || !this.arrow.arrowStart) return;
  }

  handleRelease(endSquare: Square | null): boolean {
    if (!this.arrow.arrowStart) return false;

    if (!endSquare) {
      this.arrow.isDrawingArrow = false;
      this.arrow.arrowStart = null;
      return false;
    }

    const isDrag = endSquare.row !== this.arrow.arrowStart.row || endSquare.col !== this.arrow.arrowStart.col;

    if (isDrag && this.config.enableArrows) {
      this.toggleArrow(this.arrow.arrowStart, endSquare);
    }

    this.arrow.isDrawingArrow = false;
    this.arrow.arrowStart = null;
    
    return isDrag;
  }

  toggleArrow(from: Square, to: Square): void {
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

  renderArrows(): void {
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

  clearArrows(): void {
    this.arrow.arrows = [];
    this.renderArrows();
  }

  private createArrowElement(from: Square, to: Square): SVGElement {
    if (this.isLegalKnightMove(from, to)) {
      return this.createKnightArrow(from, to);
    } else {
      return this.createStraightArrow(from, to);
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
}