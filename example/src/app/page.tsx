'use client';

import { useEffect, useRef, useState } from 'react';
import { Chessboard, ChessboardUI, DefaultChessboardUIConfig } from 'chessboard-lib';

export default function Home() {
  const chessboardRef = useRef<HTMLDivElement>(null);
  const [ui, setUI] = useState<ChessboardUI | null>(null);
  const [gameStatus, setGameStatus] = useState<string>('');

  useEffect(() => {
    if (chessboardRef.current) {
      const chessboard = new Chessboard();
      const chessboardUI = new ChessboardUI(chessboardRef.current, chessboard, {
        ...DefaultChessboardUIConfig,
        size: 1000,
      });
      
      // Subscribe to events
      chessboardUI.on('move', (event) => {
        console.log('Move:', event.data.move);
        setGameStatus('');
      });
      
      chessboardUI.on('checkmate', (event) => {
        const winner = event.data.winner === 'white' ? 'White' : 'Black';
        console.log(`Checkmate! ${winner} wins!`);
        setGameStatus(`Checkmate! ${winner} wins!`);
      });
      
      chessboardUI.on('stalemate', (event) => {
        console.log('Stalemate!');
        setGameStatus('Stalemate! The game is a draw.');
      });
      
      chessboardUI.on('draw', (event) => {
        console.log('Draw:', event.data.reason);
        setGameStatus('Draw!');
      });
      
      chessboardUI.on('check', (event) => {
        const king = event.data.kingColor === 'white' ? 'White' : 'Black';
        console.log(`${king} king is in check!`);
      });
      
      chessboardUI.on('promotion', (event) => {
        console.log('Pawn promoted:', event.data.move);
      });
      
      chessboardUI.on('capture', (event) => {
        console.log('Piece captured:', event.data.capturedPiece);
      });
      
      chessboardUI.on('castle', (event) => {
        console.log(`Castle ${event.data.side}:`, event.data.move);
      });
      
      setUI(chessboardUI);
    }
  }, []);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="bg-gradient-to-br from-white via-slate-50 to-slate-100 p-8 rounded-2xl shadow-2xl border border-slate-200">
        <h1 className="text-4xl font-bold text-center mb-8 text-slate-800 bg-gradient-to-r from-amber-600 to-amber-800 bg-clip-text text-transparent">
          Chess.com Style Board
        </h1>
        {gameStatus && (
          <div className="text-center mb-4 text-2xl font-bold text-red-600 bg-yellow-100 p-4 rounded-lg border-2 border-yellow-400">
            {gameStatus}
          </div>
        )}
        <div ref={chessboardRef} className="mb-12 flex justify-center"></div>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => ui?.flipBoard()}
            className="px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-lg hover:from-amber-700 hover:to-amber-800 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold"
          >
            Flip Board
          </button>
          <button
            onClick={() => {
              ui?.reset();
              setGameStatus('');
            }}
            className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold"
          >
            New Game
          </button>
        </div>
      </div>
    </main>
  );
}
