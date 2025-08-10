import { Chessboard } from '../core/Chessboard';
import {
  ChessboardUIConfig,
  UIElements,
  SelectionState,
  DragState,
  ArrowState,
  BoardSettings
} from './types';
import { Square, Move } from '../core/types';
import { DefaultChessboardUIConfig } from './defaultConfig';
import { EventEmitter, ChessboardEventType, ChessboardEventListener } from './events';
import {
  BoardRenderer,
  SelectionManager,
  DragDropManager,
  ArrowManager,
  MoveHandler
} from './managers/index';

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

  private boardRenderer: BoardRenderer;
  private selectionManager: SelectionManager;
  private dragDropManager: DragDropManager;
  private arrowManager: ArrowManager;
  private moveHandler: MoveHandler;

  constructor(
    private element: HTMLElement,
    private chessboard: Chessboard,
    private config: ChessboardUIConfig = DefaultChessboardUIConfig
  ) {
    this.settings.showCoordinates = config.showCoordinates ?? true;

    this.boardRenderer = new BoardRenderer(element, chessboard, this.ui, this.settings, config);
    this.selectionManager = new SelectionManager(this.selection, this.ui, config);
    this.dragDropManager = new DragDropManager(
      this.drag,
      this.ui,
      this.settings,
      this.handleDragMove.bind(this),
      this.handleSquareClick.bind(this),
      this.showLegalMoves.bind(this),
      () => this.selectionManager.clearSelection()
    );
    this.arrowManager = new ArrowManager(this.arrow, this.ui, this.settings, config, chessboard);
    this.moveHandler = new MoveHandler(
      chessboard,
      this.eventEmitter,
      this.ui,
      this.onMoveComplete.bind(this)
    );

    this.boardRenderer.setupBoard();
    this.render();
    this.boardRenderer.addStyles();
    this.boardRenderer.setupArrowLayer();
  }

  private render(): void {
    this.boardRenderer.render();
    this.applyHighlights();
    this.selectionManager.applyRightClickHighlights();
    this.addEventListeners();
    this.boardRenderer.setupArrowLayer();
    this.arrowManager.renderArrows();
  }

  private applyHighlights(): void {
    const gameState = this.moveHandler.getGameState();
    let kingSquare: Square | null = null;

    if (gameState.isCheck) {
      kingSquare = this.chessboard.getPosition().findKing(gameState.turn);
    }

    this.selectionManager.applyHighlights(gameState.isCheck, kingSquare);
  }

  private addEventListeners(): void {
    if (!this.ui.boardElement) return;

    this.ui.boardElement.addEventListener('pointerdown', this.handlePointerDown.bind(this));

    if (!this.config.enableDragAndDrop) {
      this.ui.boardElement.addEventListener('click', this.handleSquareClick.bind(this));
    }

    this.ui.boardElement.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  private handleSquareClick(event: MouseEvent): void {
    const square = this.getSquareFromElement(event.target as HTMLElement);
    if (!square) return;

    const clickedPiece = this.moveHandler.getPiece(square);
    const selectedSquare = this.selectionManager.getSelectedSquare();

    if (selectedSquare) {
      if (selectedSquare.row === square.row && selectedSquare.col === square.col) {
        this.selectionManager.clearSelection();
      } else {
        const selectedPiece = this.moveHandler.getPiece(selectedSquare);
        if (selectedPiece && selectedPiece.color === this.moveHandler.getTurn()) {
          this.tryMove(selectedSquare, square);
        } else if (clickedPiece) {
          this.selectSquare(square);
        } else {
          this.selectionManager.clearSelection();
        }
      }
    } else {
      this.selectSquare(square);
    }

    this.arrowManager.clearArrows();
    this.selectionManager.clearRightClickHighlights();
  }

  private handlePointerDown(event: PointerEvent): void {
    const square = this.getSquareFromElement(event.target as HTMLElement);
    if (!square) return;

    if (event.button === 2) {
      event.preventDefault();
      if (this.config.enableArrows || this.config.enableRightClickHighlight) {
        if (this.config.enableArrows) {
          this.arrowManager.startDrawing(square);
        }
        window.addEventListener('pointermove', this.handleRightDrag);
        window.addEventListener('pointerup', this.handleRightRelease, { once: true });
      }
      return;
    }

    if (event.button !== 0) return;

    if (!this.config.enableDragAndDrop) {
      return;
    }

    const piece = this.moveHandler.getPiece(square);

    if (!piece) {
      this.handleSquareClick(event as MouseEvent);
      return;
    }

    const pieceEl = (event.target as HTMLElement).closest('.piece') as HTMLElement;
    if (!pieceEl || this.dragDropManager.isDragging()) return;

    this.dragDropManager.startPotentialDrag(piece, square, pieceEl, event);
  }

  private handleDragMove(from: Square, to: Square): void {
    const draggedPiece = this.dragDropManager.getDraggedPiece();
    if (!draggedPiece) return;

    const piece = draggedPiece.piece;
    const dragEl = this.ui.dragElement;

    if (piece.color === this.moveHandler.getTurn()) {
      this.tryMove(from, to);
      const lastMove = this.selectionManager.getLastMove();
      if (this.dragDropManager.shouldRemoveDragElement(lastMove, from)) {
        dragEl?.remove();
      }
    } else {
      this.selectionManager.selectSquare(from);
    }
  }

  private selectSquare(square: Square): void {
    const piece = this.moveHandler.getPiece(square);

    if (piece) {
      this.showLegalMovesForSquare(square);
    }
  }

  private showLegalMoves(from: Square): void {
    this.selectionManager.clearHighlights(true);
    this.selectionManager.selectSquare(from);

    const lastMove = this.selectionManager.getLastMove();
    if (lastMove) {
      this.selectionManager.highlightSquare(lastMove.from, 'lastMove');
      this.selectionManager.highlightSquare(lastMove.to, 'lastMove');
    }

    this.selectionManager.highlightSquare(from, 'selected');

    const legalTargets = this.moveHandler.showLegalMoves(from);
    this.dragDropManager.setDragLegalTargets(legalTargets);

    for (const to of legalTargets) {
      const targetPiece = this.moveHandler.getPiece(to);
      this.selectionManager.highlightSquare(to, targetPiece ? 'capture' : 'legalMove');
    }
  }

  private showLegalMovesForSquare(square: Square): void {
    this.selectionManager.clearHighlights(true);
    this.selectionManager.selectSquare(square);

    const lastMove = this.selectionManager.getLastMove();
    if (lastMove) {
      this.selectionManager.highlightSquare(lastMove.from, 'lastMove');
      this.selectionManager.highlightSquare(lastMove.to, 'lastMove');
    }

    this.selectionManager.highlightSquare(square, 'selected');

    const piece = this.moveHandler.getPiece(square);
    if (piece && piece.color === this.moveHandler.getTurn()) {
      const legalMoves = this.chessboard.getLegalMoves(square);
      legalMoves.forEach(move => {
        const targetPiece = this.moveHandler.getPiece(move.to);
        this.selectionManager.highlightSquare(move.to, targetPiece ? 'capture' : 'legalMove');
      });
    }
  }

  private tryMove(from: Square, to: Square): void {
    const piece = this.moveHandler.getPiece(from);
    if (!piece) {
      this.selectionManager.clearSelection();
      return;
    }

    const targetPiece = this.moveHandler.getPiece(to);
    if (targetPiece && targetPiece.color === piece.color) {
      this.selectionManager.clearSelection();
      this.selectSquare(to);
      return;
    }

    if (!this.moveHandler.tryMove(from, to)) {
      this.selectionManager.clearSelection();
    }
  }

  private onMoveComplete(move: Move): void {
    this.selectionManager.setLastMove(move);
    this.selectionManager.clearSelection();
    this.render();
  }

  private handleRightDrag = (): void => {
    this.arrowManager.handleDrag();
  }

  private handleRightRelease = (event: PointerEvent): void => {
    window.removeEventListener('pointermove', this.handleRightDrag);

    const endSquare = this.getSquareFromElement(event.target as HTMLElement);

    if (this.config.enableArrows) {
      const isDrag = this.arrowManager.handleRelease(endSquare);
      if (!isDrag && endSquare && this.config.enableRightClickHighlight) {
        this.selectionManager.toggleRightClickHighlight(endSquare);
      }
    } else if (this.config.enableRightClickHighlight && endSquare) {
      this.selectionManager.toggleRightClickHighlight(endSquare);
    }
  }

  private getSquareFromElement(element: HTMLElement): Square | null {
    const squareElement = element.closest('.square') as HTMLElement;
    if (!squareElement) return null;

    const row = parseInt(squareElement.dataset.row!);
    const col = parseInt(squareElement.dataset.col!);
    return { row, col };
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
    this.boardRenderer.updateCoordinates();
  }

  public reset(): void {
    this.chessboard = new Chessboard();

    this.boardRenderer = new BoardRenderer(this.element, this.chessboard, this.ui, this.settings, this.config);
    this.moveHandler = new MoveHandler(
      this.chessboard,
      this.eventEmitter,
      this.ui,
      this.onMoveComplete.bind(this)
    );
    this.arrowManager = new ArrowManager(this.arrow, this.ui, this.settings, this.config, this.chessboard);

    this.selectionManager.clearSelection();
    this.selection.lastMove = null;
    this.arrowManager.clearArrows();
    this.selectionManager.clearRightClickHighlights();

    this.boardRenderer.setupBoard();
    this.render();
    this.boardRenderer.addStyles();
  }
}
