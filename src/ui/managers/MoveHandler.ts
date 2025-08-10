import { Square, Move, Piece } from '../../core/types';
import { Chessboard } from '../../core/Chessboard';
import { EventEmitter } from '../events';
import { createPromotionModal } from '../promotionDialog';
import { UIElements } from '../types';

export class MoveHandler {
  constructor(
    private chessboard: Chessboard,
    private eventEmitter: EventEmitter,
    private ui: UIElements,
    private onMoveComplete: (move: Move) => void
  ) {}

  tryMove(from: Square, to: Square): boolean {
    const piece = this.chessboard.getPiece(from);
    if (!piece) {
      return false;
    }

    const targetPiece = this.chessboard.getPiece(to);
    if (targetPiece && targetPiece.color === piece.color) {
      return false;
    }

    const isPromotion = piece.type === 'pawn' &&
      ((piece.color === 'white' && to.row === 7) || (piece.color === 'black' && to.row === 0));

    if (isPromotion) {
      this.showPromotionDialog(from, to, piece.color);
      return true;
    } else {
      const move: Move = { from, to };
      if (this.chessboard.move(move)) {
        this.handleSuccessfulMove(move);
        return true;
      }
    }
    
    return false;
  }

  showLegalMoves(from: Square): Square[] {
    const piece = this.chessboard.getPiece(from);
    if (piece && piece.color === this.chessboard.getTurn()) {
      return this.chessboard.getLegalMoves(from).map(m => m.to);
    }
    return [];
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

  private handleSuccessfulMove(move: Move): void {
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

    this.onMoveComplete(move);
    this.checkGameStatus();
  }

  checkGameStatus(): void {
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

  getTurn(): 'white' | 'black' {
    return this.chessboard.getTurn();
  }

  getPiece(square: Square): Piece | null {
    return this.chessboard.getPiece(square);
  }

  getGameState() {
    return this.chessboard.getGameState();
  }
}