"use client";

import { useState, useMemo } from "react";
import type { Board, Move, Player } from "@/types";
import { cn } from "@/lib/utils";
import { Icons } from "./icons";

interface GoBoardProps {
  board: Board;
  onMove: (row: number, col: number) => void;
  disabled: boolean;
  moveHistory: Move[];
  boardSize: number;
  isAiThinking: boolean;
  currentPlayer: Player;
}

const getStarPoints = (size: number): [number, number][] => {
    if (size === 9) {
        return [[2, 2], [2, 6], [6, 2], [6, 6], [4, 4]];
    }
    if (size === 13) {
        return [[3, 3], [3, 9], [9, 3], [9, 9], [6, 6]];
    }
    if (size === 19) {
        return [
            [3, 3], [3, 9], [3, 15],
            [9, 3], [9, 9], [9, 15],
            [15, 3], [15, 9], [15, 15]
        ];
    }
    return [];
};


export function GoBoard({ board, onMove, disabled, moveHistory, boardSize, isAiThinking, currentPlayer }: GoBoardProps) {
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);
  
  const lastMove = moveHistory.length > 0 ? moveHistory[moveHistory.length - 1] : null;

  const starPoints = useMemo(() => getStarPoints(boardSize), [boardSize]);

  // The width/height of the clickable area around an intersection.
  // This is the distance between two lines.
  const interactiveCellSize = `${(1 / (boardSize - 1)) * 100}%`;

  return (
    <div
      className="relative aspect-square w-[90vw] max-w-[80vh] rounded-lg border-8 border-[#6a4a2f] p-4 shadow-lg"
      style={{
        backgroundColor: '#deb887', // "burlywood", a wood-like color
      }}
    >
      <div
        className="relative h-full w-full"
        onMouseLeave={() => setHoveredCell(null)}
      >
        {/* SVG Background Grid */}
        <svg
          width="100%"
          height="100%"
          className="pointer-events-none absolute left-0 top-0"
        >
          {/* Draw lines */}
          {Array.from({ length: boardSize }).map((_, i) => {
            const pos = `${(i / (boardSize - 1)) * 100}%`;
            return (
              <g key={`grid-line-${i}`}>
                <line
                  x1="0%" y1={pos}
                  x2="100%" y2={pos}
                  stroke="#000"
                  strokeOpacity="0.6"
                  strokeWidth="1"
                />
                <line
                  x1={pos} y1="0%"
                  x2={pos} y2="100%"
                  stroke="#000"
                  strokeOpacity="0.6"
                  strokeWidth="1"
                />
              </g>
            );
          })}
          {/* Draw star points */}
          {starPoints.map(([r, c], i) => {
            const cx = `${(c / (boardSize - 1)) * 100}%`;
            const cy = `${(r / (boardSize - 1)) * 100}%`;
            return (
              <circle
                key={`star-${i}`}
                cx={cx}
                cy={cy}
                r="3.5" // Pixel radius
                fill="black"
                fillOpacity="0.6"
              />
            );
          })}
        </svg>

        {/* Interactive Layer & Stones: {boardSize*boardSize} absolutely positioned divs for each intersection */}
        {Array.from({ length: boardSize }).map((_, row) =>
          Array.from({ length: boardSize }).map((_, col) => {
            const cell = board[row]?.[col];
            
            return (
              <div
                key={`${row}-${col}`}
                className="absolute flex items-center justify-center"
                style={{
                  top: `${(row / (boardSize - 1)) * 100}%`,
                  left: `${(col / (boardSize - 1)) * 100}%`,
                  width: interactiveCellSize,
                  height: interactiveCellSize,
                  transform: 'translate(-50%, -50%)',
                  cursor: disabled ? 'default' : 'pointer',
                }}
                onClick={() => !disabled && onMove(row, col)}
                onMouseEnter={() => !disabled && setHoveredCell({ row, col })}
              >
                {/* Placed stone */}
                {cell && (
                  <Icons.Stone
                    className={cn(
                      "absolute h-[95%] w-[95%] transition-transform duration-150 z-10",
                      cell === "B" ? "fill-black" : "fill-white stroke-black stroke-[0.5px]",
                      lastMove?.col === col && lastMove?.row === row ? "scale-105" : "scale-100",
                    )}
                  />
                )}
                
                {lastMove?.col === col && lastMove?.row === row && (
                  <div className="absolute h-1/4 w-1/4 rounded-full bg-red-500/80 animate-ping z-20"/>
                )}

                {/* Hover ghost stone */}
                {!disabled && hoveredCell?.row === row && hoveredCell?.col === col && !cell && (
                  <Icons.Stone
                      className={cn(
                          "absolute h-[95%] w-[95%] opacity-50 z-10",
                          currentPlayer === 'B' ? "fill-black" : "fill-white stroke-black stroke-[0.5px]",
                      )}
                  />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
