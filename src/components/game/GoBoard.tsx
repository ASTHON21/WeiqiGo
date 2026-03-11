"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import type { BoardState, Move, Player, MoveSetting, NumberingMode } from "@/lib/types"; 
import { cn } from "@/lib/utils";
import { Icons } from "@/components/icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface GoBoardProps {
  board: BoardState;
  onMove?: (r: number, c: number) => void;
  disabled?: boolean;
  readOnly?: boolean;
  lastMove?: Move | null;
  size: number;
  currentPlayer?: Player;
  moveSetting?: MoveSetting;
  numberingMode?: NumberingMode;
  moveHistory?: Move[]; // 用于计算手数编号的历史记录
}

const getStarPoints = (size: number): [number, number][] => {
    if (size === 9) return [[2, 2], [2, 6], [6, 2], [6, 6], [4, 4]];
    if (size === 13) return [[3, 3], [3, 9], [9, 3], [9, 9], [6, 6]];
    if (size === 19) return [[3, 3], [3, 9], [3, 15], [9, 3], [9, 9], [9, 15], [15, 3], [15, 9], [15, 15]];
    return [];
};

export function GoBoard({ 
  board, 
  onMove, 
  disabled, 
  readOnly, 
  lastMove, 
  size, 
  currentPlayer,
  moveSetting = 'direct',
  numberingMode = 'none',
  moveHistory = []
}: GoBoardProps) {
  const [hoveredCell, setHoveredCell] = useState<{ r: number; c: number } | null>(null);
  const [pendingMove, setPendingMove] = useState<{ r: number; c: number } | null>(null);
  const [lastClicked, setLastClicked] = useState<{ r: number; c: number; time: number } | null>(null);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevBoardRef = useRef<BoardState | null>(null);
  const hasUnlockedAudio = useRef(false);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const audio = new Audio('https://raw.githubusercontent.com/sabaki-go/Sabaki/master/resources/audio/move.mp3');
      audio.volume = 1.0;
      audio.preload = 'auto';
      audioRef.current = audio;
    }
  }, []);

  const playStoneSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {});
    }
  };

  useEffect(() => {
    if (prevBoardRef.current && prevBoardRef.current.length === size) {
      let stoneAdded = false;
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (board[r][c] !== null && prevBoardRef.current[r][c] === null) {
            stoneAdded = true;
            break;
          }
        }
        if (stoneAdded) break;
      }
      if (stoneAdded) {
        playStoneSound();
      }
    }
    prevBoardRef.current = board.map(row => [...row]);
  }, [board, size]);

  // 计算当前棋盘上每个位置对应的手数号码
  const stoneNumbersMap = useMemo(() => {
    if (numberingMode === 'none') return new Map<string, number>();
    
    const map = new Map<string, number>();
    
    if (numberingMode === 'last') {
      if (lastMove && lastMove.r !== -1) {
        map.set(`${lastMove.r},${lastMove.c}`, (lastMove.index ?? 0) + 1);
      }
      return map;
    }

    if (numberingMode === 'all') {
      // 遍历当前棋盘上有棋子的位置
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          if (board[r][c] !== null) {
            // 在历史记录中寻找最后一次落在该位置的记录
            const move = [...moveHistory].reverse().find(m => m.r === r && m.c === c);
            if (move) {
              map.set(`${r},${c}`, (move.index ?? 0) + 1);
            }
          }
        }
      }
      return map;
    }

    return map;
  }, [numberingMode, moveHistory, board, size, lastMove]);

  const starPoints = useMemo(() => getStarPoints(size), [size]);
  const interactiveCellSize = `${(1 / (size - 1)) * 100}%`;
  const isInteractionDisabled = disabled || readOnly;

  const unlockAudio = () => {
    if (!hasUnlockedAudio.current && audioRef.current) {
      hasUnlockedAudio.current = true;
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          audioRef.current?.pause();
          audioRef.current!.currentTime = 0;
        }).catch(() => {
          hasUnlockedAudio.current = false;
        });
      }
    }
  };

  const handleCellClick = (r: number, c: number) => {
    unlockAudio();
    if (isInteractionDisabled || board[r][c] !== null) return;
    if (moveSetting === 'direct') {
      onMove?.(r, c);
      playStoneSound();
    } else if (moveSetting === 'confirm') {
      setPendingMove({ r, c });
    } else if (moveSetting === 'double-click') {
      const now = Date.now();
      if (lastClicked && lastClicked.r === r && lastClicked.c === c && (now - lastClicked.time) < 500) {
        onMove?.(r, c);
        playStoneSound();
        setLastClicked(null);
      } else {
        setLastClicked({ r, c, time: now });
      }
    }
  };

  const confirmMove = () => {
    if (pendingMove) {
      onMove?.(pendingMove.r, pendingMove.c);
      playStoneSound();
      setPendingMove(null);
    }
  };

  return (
    <>
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
              const stoneNumber = stoneNumbersMap.get(`${r},${c}`);
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
                  onClick={() => handleCellClick(r, c)}
                  onMouseEnter={() => !isInteractionDisabled && setHoveredCell({ r, c })}
                >
                  {cell && (
                    <>
                      <Icons.Stone
                        className={cn(
                          "absolute h-[90%] w-[90%] transition-transform z-10",
                          cell === "black" ? "fill-black" : "fill-white stroke-black/20 stroke-[0.5px]",
                          lastMove?.c === c && lastMove?.r === r ? "scale-105" : "scale-100",
                        )}
                      />
                      {stoneNumber !== undefined && (
                        <span className={cn(
                          "absolute z-30 font-mono font-black pointer-events-none select-none",
                          cell === "black" ? "text-white" : "text-black",
                          size === 19 ? "text-[8px]" : size === 13 ? "text-[10px]" : "text-sm"
                        )}>
                          {stoneNumber}
                        </span>
                      )}
                    </>
                  )}
                  {lastMove?.c === c && lastMove?.r === r && (
                    <div className="absolute h-1/4 w-1/4 rounded-full bg-red-500/60 animate-pulse z-20"/>
                  )}
                  {!isInteractionDisabled && hoveredCell?.r === r && hoveredCell?.c === c && !cell && (
                    <Icons.Stone
                        className={cn(
                            "absolute h-[90%] w-[90%] z-10 opacity-30",
                            currentPlayer === 'black' ? "fill-black" : "fill-white stroke-black/20"
                        )}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <AlertDialog open={!!pendingMove} onOpenChange={(open) => !open && setPendingMove(null)}>
        <AlertDialogContent className="max-w-[280px] p-4 shadow-2xl border-2 bg-background/95 backdrop-blur-md">
          <AlertDialogHeader><AlertDialogTitle className="sr-only">确认落子</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter className="flex-row gap-3 mt-0 sm:justify-center">
            <AlertDialogCancel className="mt-0 flex-1 h-10 text-sm font-bold border-2">取消</AlertDialogCancel>
            <AlertDialogAction onClick={confirmMove} className="flex-1 h-10 text-sm font-bold bg-accent hover:bg-accent/90">确认落子</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
