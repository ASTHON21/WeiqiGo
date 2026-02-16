'use client';

import type { Board, Player } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

interface GoBoardProps {
  board: Board;
  boardSize: number;
  onMove: (row: number, col: number) => void;
  disabled: boolean;
  isAiThinking: boolean;
}

const Stone = ({ player, isLastMove = false }: { player: Player; isLastMove?: boolean }) => {
  const stoneColor = player === 'B' ? 'bg-gray-900' : 'bg-gray-100';
  const shadow = player === 'B' 
    ? 'shadow-[1px_1px_2px_rgba(255,255,255,0.3)_inset,_0_0_10px_rgba(0,0,0,0.9)]'
    : 'shadow-[1px_1px_2px_rgba(0,0,0,0.2)_inset,_0_0_10px_rgba(255,255,255,0.7)]';
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
      className={`absolute w-full h-full rounded-full ${stoneColor} ${shadow} flex items-center justify-center`}
    >
      {isLastMove && <div className="w-1/3 h-1/3 rounded-full bg-accent/70" />}
    </motion.div>
  );
};

export function GoBoard({ board, boardSize, onMove, disabled, isAiThinking }: GoBoardProps) {
  const starPoints = boardSize === 9 ? [[2, 2], [2, 6], [4, 4], [6, 2], [6, 6]] : [];

  return (
    <div className="relative aspect-square w-full max-w-xl bg-[#e3c16f] p-4 md:p-6 rounded-lg shadow-2xl" style={{ boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.2)' }}>
      <div
        className="grid absolute inset-4 md:inset-6"
        style={{
          gridTemplateColumns: `repeat(${boardSize - 1}, 1fr)`,
          gridTemplateRows: `repeat(${boardSize - 1}, 1fr)`,
          backgroundSize: `calc(100% / ${boardSize - 1}) calc(100% / ${boardSize - 1})`,
          backgroundImage: 'linear-gradient(to right, #333333 1px, transparent 1px), linear-gradient(to bottom, #333333 1px, transparent 1px)',
        }}
      >
      </div>

      {starPoints.map(([row, col]) => (
        <div 
          key={`star-${row}-${col}`}
          className="absolute w-1.5 h-1.5 bg-black rounded-full"
          style={{
            top: `calc(${(row / (boardSize - 1)) * 100}% + calc(var(--grid-padding) - 0.375rem / 2))`,
            left: `calc(${(col / (boardSize - 1)) * 100}% + calc(var(--grid-padding) - 0.375rem / 2))`,
            transform: 'translate(-50%, -50%)',
            '--grid-padding': '1.5rem',
          }}
        />
      ))}

      <div
        className="grid absolute inset-4 md:inset-6"
        style={{
          gridTemplateColumns: `repeat(${boardSize}, 1fr)`,
          gridTemplateRows: `repeat(${boardSize}, 1fr)`,
        }}
      >
        <AnimatePresence>
          {board.map((row, r) =>
            row.map((cell, c) => {
              const intersectionKey = `int-${r}-${c}`;
              if (cell !== '_') {
                return (
                  <div key={intersectionKey} className="relative flex items-center justify-center">
                    <div className="absolute w-[95%] h-[95%]">
                      <Stone player={cell} />
                    </div>
                  </div>
                );
              } else {
                return (
                  <button
                    key={intersectionKey}
                    onClick={() => onMove(r, c)}
                    disabled={disabled}
                    className="group relative flex items-center justify-center rounded-full"
                    aria-label={`Place stone at ${r}, ${c}`}
                  >
                    {!disabled && (
                      <div className="absolute w-[95%] h-[95%] rounded-full bg-black opacity-0 group-hover:opacity-30 transition-opacity duration-200" />
                    )}
                  </button>
                );
              }
            })
          )}
        </AnimatePresence>
      </div>
      
      {isAiThinking && (
         <div className="absolute inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center rounded-lg">
           <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-white text-lg font-headline bg-black/50 px-4 py-2 rounded-md"
           >
             AI is thinking...
           </motion.div>
         </div>
      )}

    </div>
  );
}
