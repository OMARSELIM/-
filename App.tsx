
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chess, Square as ChessSquare } from 'https://esm.sh/chess.js';
import { PieceIcons, COLORS } from './constants';
import { analyzePosition } from './services/geminiService';
import { AnalysisResponse, GameState } from './types';

const App: React.FC = () => {
  const [game, setGame] = useState(new Chess());
  const [selectedSquare, setSelectedSquare] = useState<ChessSquare | null>(null);
  const [possibleMoves, setPossibleMoves] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastMove, setLastMove] = useState<{ from: string, to: string } | null>(null);
  
  // Audio effects refs
  const moveSoundRef = useRef<HTMLAudioElement | null>(null);

  const getGameState = useCallback((): GameState => ({
    fen: game.fen(),
    history: game.history(),
    isGameOver: game.isGameOver(),
    winner: game.isCheckmate() ? (game.turn() === 'w' ? 'b' : 'w') : game.isDraw() ? 'draw' : null,
    turn: game.turn()
  }), [game]);

  const onSquareClick = (square: ChessSquare) => {
    // If selecting a piece of the current turn
    const piece = game.get(square);
    
    if (piece && piece.color === game.turn()) {
      setSelectedSquare(square);
      const moves = game.moves({ square, verbose: true }).map(m => m.to);
      setPossibleMoves(moves);
      return;
    }

    // If a square is already selected, try to move
    if (selectedSquare) {
      try {
        const move = game.move({
          from: selectedSquare,
          to: square,
          promotion: 'q' // Always promote to queen for simplicity in this UI
        });

        if (move) {
          setGame(new Chess(game.fen()));
          setLastMove({ from: move.from, to: move.to });
          setSelectedSquare(null);
          setPossibleMoves([]);
          
          // Trigger AI analysis every move
          handleAnalysis();
        } else {
          setSelectedSquare(null);
          setPossibleMoves([]);
        }
      } catch (e) {
        setSelectedSquare(null);
        setPossibleMoves([]);
      }
    }
  };

  const handleAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await analyzePosition(game.fen(), game.history());
    setAnalysis(result);
    setIsAnalyzing(false);
  };

  const resetGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setSelectedSquare(null);
    setPossibleMoves([]);
    setAnalysis(null);
    setLastMove(null);
  };

  const undoMove = () => {
    game.undo();
    setGame(new Chess(game.fen()));
    setSelectedSquare(null);
    setPossibleMoves([]);
    setAnalysis(null);
  };

  const renderBoard = () => {
    const board = [];
    const rows = ['8', '7', '6', '5', '4', '3', '2', '1'];
    const cols = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

    for (const row of rows) {
      for (const col of cols) {
        const square = (col + row) as ChessSquare;
        const piece = game.get(square);
        const isDark = (cols.indexOf(col) + rows.indexOf(row)) % 2 !== 0;
        const isSelected = selectedSquare === square;
        const isLastMove = lastMove && (lastMove.from === square || lastMove.to === square);
        const isPossible = possibleMoves.includes(square);

        board.push(
          <div
            key={square}
            onClick={() => onSquareClick(square)}
            className={`
              relative w-full aspect-square flex items-center justify-center cursor-pointer transition-colors
              ${isDark ? COLORS.boardDark : COLORS.boardLight}
              ${isSelected ? COLORS.selected : ''}
              ${isLastMove ? COLORS.lastMove : ''}
              hover:opacity-90
            `}
          >
            {/* Piece Icon */}
            {piece && (
              <div className="w-[85%] h-[85%] z-10 transition-transform hover:scale-110 active:scale-95">
                {PieceIcons[`${piece.color}-${piece.type}`]}
              </div>
            )}

            {/* Move Indicator */}
            {isPossible && (
              <div className={`absolute w-4 h-4 rounded-full ${piece ? 'bg-red-500/30' : 'bg-black/10'}`}></div>
            )}

            {/* Labels */}
            {col === 'a' && (
              <span className={`absolute top-0.5 right-0.5 text-[10px] font-bold ${isDark ? 'text-[#eeeed2]' : 'text-[#769656]'}`}>
                {row}
              </span>
            )}
            {row === '1' && (
              <span className={`absolute bottom-0.5 left-0.5 text-[10px] font-bold ${isDark ? 'text-[#eeeed2]' : 'text-[#769656]'}`}>
                {col}
              </span>
            )}
          </div>
        );
      }
    }
    return board;
  };

  const status = getGameState();

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 flex flex-col md:flex-row p-4 md:p-8 gap-8 items-start justify-center">
      
      {/* Sidebar - Game Controls & History */}
      <div className="w-full md:w-80 flex flex-col gap-4 order-2 md:order-1">
        <div className="bg-slate-800 rounded-xl p-6 shadow-2xl border border-slate-700">
          <h1 className="text-2xl font-bold text-center mb-2 text-emerald-400">أستاذ الشطرنج</h1>
          <p className="text-slate-400 text-sm text-center mb-6">ذكاء اصطناعي لتحليل حركاتك</p>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-slate-900/50 p-3 rounded-lg border border-slate-700">
              <span className="text-sm font-medium">الدور:</span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${status.turn === 'w' ? 'bg-white text-black' : 'bg-black text-white border border-slate-600'}`}>
                {status.turn === 'w' ? 'الأبيض' : 'الأسود'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={resetGame}
                className="bg-red-500/10 hover:bg-red-500/20 text-red-400 py-2 rounded-lg text-sm font-medium transition-colors border border-red-500/20"
              >
                إعادة اللعبة
              </button>
              <button 
                onClick={undoMove}
                className="bg-slate-700 hover:bg-slate-600 text-slate-200 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-600"
              >
                تراجع
              </button>
            </div>
          </div>
        </div>

        {/* Move History */}
        <div className="bg-slate-800 rounded-xl p-6 shadow-2xl border border-slate-700 flex-1 min-h-[200px] flex flex-col">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-4">سجل الحركات</h3>
          <div className="overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
             <div className="grid grid-cols-2 gap-x-4 gap-y-1">
               {status.history.reduce((acc: any[], move, i) => {
                 if (i % 2 === 0) acc.push([move]);
                 else acc[acc.length - 1].push(move);
                 return acc;
               }, []).map((pair, idx) => (
                 <React.Fragment key={idx}>
                   <div className="text-slate-500 text-xs py-1 border-b border-slate-700/50 flex justify-between">
                     <span>{idx + 1}.</span>
                     <span className="font-mono text-emerald-400">{pair[0]}</span>
                   </div>
                   <div className="text-slate-500 text-xs py-1 border-b border-slate-700/50 font-mono text-slate-300">
                     {pair[1] || ''}
                   </div>
                 </React.Fragment>
               ))}
             </div>
          </div>
        </div>
      </div>

      {/* Main Board Container */}
      <div className="flex-1 flex flex-col items-center order-1 md:order-2">
        {status.isGameOver && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-slate-800 p-8 rounded-2xl border border-emerald-500 shadow-2xl text-center max-w-sm w-full animate-in fade-in zoom-in duration-300">
              <h2 className="text-3xl font-bold mb-4 text-emerald-400">انتهت اللعبة!</h2>
              <p className="text-lg text-slate-300 mb-8">
                {status.winner === 'draw' ? 'تعادل' : `الفائز هو ${status.winner === 'w' ? 'الأبيض' : 'الأسود'}`}
              </p>
              <button 
                onClick={resetGame}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-lg transition-transform active:scale-95"
              >
                لعب مرة أخرى
              </button>
            </div>
          </div>
        )}

        <div className="relative shadow-2xl rounded-lg overflow-hidden border-[8px] border-slate-700 w-full max-w-[600px] aspect-square grid grid-cols-8">
          {renderBoard()}
        </div>

        {/* AI Analysis Panel */}
        <div className="mt-8 w-full max-w-[600px] bg-slate-800 rounded-xl p-6 border border-slate-700 shadow-xl overflow-hidden relative min-h-[160px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              نصيحة الأستاذ
            </h3>
            {isAnalyzing && (
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium animate-pulse">
                جاري التحليل...
              </div>
            )}
          </div>

          {!analysis && !isAnalyzing ? (
            <p className="text-slate-500 text-center italic py-4">قم بحركة لبدء التحليل بالذكاء الاصطناعي</p>
          ) : analysis ? (
            <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-500">
              <div className="flex gap-3">
                <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded text-xs font-bold border border-emerald-500/20 shrink-0">
                  التقييم
                </span>
                <p className="text-sm text-slate-300">{analysis.evaluation}</p>
              </div>
              <div className="flex gap-3">
                <span className="bg-blue-500/10 text-blue-400 px-3 py-1 rounded text-xs font-bold border border-blue-500/20 shrink-0">
                  الحركة
                </span>
                <p className="text-sm font-mono text-blue-300 font-bold">{analysis.suggestion}</p>
              </div>
              <div className="text-sm text-slate-400 leading-relaxed border-t border-slate-700/50 pt-4">
                {analysis.reasoning}
              </div>
            </div>
          ) : (
             <div className="space-y-4 opacity-50">
               <div className="h-4 bg-slate-700 rounded w-3/4 animate-pulse"></div>
               <div className="h-4 bg-slate-700 rounded w-1/2 animate-pulse"></div>
               <div className="h-12 bg-slate-700 rounded w-full animate-pulse"></div>
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
