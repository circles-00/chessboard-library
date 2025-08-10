import { Move, GameState } from '../core/types';

export type ChessboardEventType =
  | 'move'
  | 'checkmate'
  | 'stalemate'
  | 'draw'
  | 'check'
  | 'promotion'
  | 'capture'
  | 'castle';

export interface ChessboardEvent {
  type: ChessboardEventType;
  data: any;
}

export interface MoveEvent extends ChessboardEvent {
  type: 'move';
  data: {
    move: Move;
    gameState: GameState;
  };
}

export interface CheckmateEvent extends ChessboardEvent {
  type: 'checkmate';
  data: {
    winner: 'white' | 'black';
    gameState: GameState;
  };
}

export interface StalemateEvent extends ChessboardEvent {
  type: 'stalemate';
  data: {
    gameState: GameState;
  };
}

export interface DrawEvent extends ChessboardEvent {
  type: 'draw';
  data: {
    reason: string;
    gameState: GameState;
  };
}

export interface CheckEvent extends ChessboardEvent {
  type: 'check';
  data: {
    kingColor: 'white' | 'black';
    gameState: GameState;
  };
}

export interface PromotionEvent extends ChessboardEvent {
  type: 'promotion';
  data: {
    move: Move;
    gameState: GameState;
  };
}

export interface CaptureEvent extends ChessboardEvent {
  type: 'capture';
  data: {
    move: Move;
    capturedPiece: any;
    gameState: GameState;
  };
}

export interface CastleEvent extends ChessboardEvent {
  type: 'castle';
  data: {
    move: Move;
    side: 'kingside' | 'queenside';
    gameState: GameState;
  };
}

export type ChessboardEventListener = (event: ChessboardEvent) => void;

export class EventEmitter {
  private listeners: Map<ChessboardEventType, Set<ChessboardEventListener>> = new Map();

  on(type: ChessboardEventType, listener: ChessboardEventListener): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(listener);
  }

  off(type: ChessboardEventType, listener: ChessboardEventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  emit(event: ChessboardEvent): void {
    const listeners = this.listeners.get(event.type);
    if (listeners) {
      listeners.forEach(listener => listener(event));
    }
  }

  removeAllListeners(type?: ChessboardEventType): void {
    if (type) {
      this.listeners.delete(type);
    } else {
      this.listeners.clear();
    }
  }
}
