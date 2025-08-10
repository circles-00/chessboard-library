'use client';

import { useEffect, useRef, useState } from 'react';
import { Chessboard, ChessboardUI } from 'chessboard-lib';

export default function Home() {
  const chessboardRef = useRef<HTMLDivElement>(null);
  const [ui, setUI] = useState<ChessboardUI | null>(null);

  useEffect(() => {
    if (chessboardRef.current) {
      const chessboard = new Chessboard();
      const chessboardUI = new ChessboardUI(chessboardRef.current, chessboard, {
        colors: {
          light: '#f0d9b5',
          dark: '#b58863'
        },
        pieceSet: 'default',
        size: 1000,
        showCoordinates: true,
        enableDragAndDrop: true,
        enableHighlights: true,
        animationDuration: 250
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
        <div ref={chessboardRef} className="mb-8 flex justify-center"></div>
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => ui?.flipBoard()}
            className="px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-700 text-white rounded-lg hover:from-amber-700 hover:to-amber-800 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold"
          >
            Flip Board
          </button>
          <button
            onClick={() => ui?.reset()}
            className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold"
          >
            New Game
          </button>
        </div>
      </div>
    </main>
  );
}
