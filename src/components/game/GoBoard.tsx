
"use client";

import { useState, useMemo } from "react";
import type { BoardState, Move, Player } from "@/lib/types"; 
import { cn } from "@/lib/utils";
import { Icons } from "@/components/icons";

interface GoBoardProps {
  board: BoardState;
  onMove?: (r: number, c: number) => void;
  disabled?: boolean;
  readOnly?: boolean; // 新增属性：只读模式
  lastMove?: Move | null;
  size: number;
  currentPlayer?: Player;
}

const getStarPoints = (size: number): [number, number][] => {
    if (size === 9) return [[2, 2], [2, 6], [6, 2], [6, 6], [4, 4]];
    if (size === 13) return [[3, 3], [3, 9], [9, 3], [9, 9], [6, 6]];
    if (size === 19) return [[3, 3], [3, 9], [3, 15], [9, 3], [9, 9], [9, 15], [15, 3], [15, 9], [15, 15]];
    return [];
};

export function GoBoard({ board, onMove, disabled, readOnly, lastMove, size, currentPlayer }: GoBoardProps) {
  const [hoveredCell, setHoveredCell] = useState<{ r: number; c: number } | null>(null);
  const starPoints = useMemo(() => getStarPoints(size), [size]);
  const interactiveCellSize = `${(1 / (size - 1)) * 100}%`;
  const isInteractionDisabled = disabled || readOnly;

  return (
    <div className="relative aspect-square w-full max-w-[80vh] rounded-lg border-8 border-[#6a4a2f] p-4 shadow-xl bg-[#deb887]">
      <div className="relative h-full w-full" onMouseLeave={() => setHoveredCell(null)}>
        <svg width="100%" height="100%" className="pointer-events-none absolute left-0 top-0">
          {Array.from({ length: size }).map((_, i) => {
            const pos = `${(i / (size - 1)) * 100}%`;
            return (
              <g key={`grid-line-${i}`}>
                <line x1="0%" y1={pos} x2="100%" y2={pos} stroke="#000" strokeOpacity="0.4" strokeWidth="1" />
                <line x1={pos} y1="0%" x2={pos} y2="100%" stroke="#000" strokeOpacity="0.4" strokeWidth="1" />
              </g>
            );
          })}
          {starPoints.map(([r, c], i) => (
            <circle key={`star-${i}`} cx={`${(c / (size - 1)) * 100}%`} cy={`${(r / (size - 1)) * 100}%`} r="3.5" fill="black" fillOpacity="0.5" />
          ))}
        </svg>

        {Array.from({ length: size }).map((_, r) =>
          Array.from({ length: size }).map((_, c) => {
            const cell = board[r]?.[c];
            return (
              <div
                key={`${r}-${c}`}
                className="absolute flex items-center justify-center"
                style={{
                  top: `${(r / (size - 1)) * 100}%`,
                  left: `${(c / (size - 1)) * 100}%`,
                  width: interactiveCellSize,
                  height: interactiveCellSize,
                  transform: 'translate(-50%, -50%)',
                  cursor: isInteractionDisabled ? 'default' : 'pointer',
                }}
                onClick={() => !isInteractionDisabled && onMove?.(r, c)}
                onMouseEnter={() => !isInteractionDisabled && setHoveredCell({ r, c })}
              >
                {cell && (
                  <Icons.Stone
                    className={cn(
                      "absolute h-[90%] w-[90%] transition-transform z-10",
                      cell === "black" ? "fill-black" : "fill-white stroke-black/20 stroke-[0.5px]",
                      lastMove?.c === c && lastMove?.r === r ? "scale-105" : "scale-100",
                    )}
                  />
                )}
                {lastMove?.c === c && lastMove?.r === r && (
                  <div className="absolute h-1/4 w-1/4 rounded-full bg-red-500/60 animate-pulse z-20"/>
                )}
                {!isInteractionDisabled && hoveredCell?.r === r && hoveredCell?.c === c && !cell && (
                  <Icons.Stone
                      className={cn(
                          "absolute h-[90%] w-[90%] opacity-30 z-10",
                          currentPlayer === 'black' ? "fill-black" : "fill-white stroke-black/20",
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
