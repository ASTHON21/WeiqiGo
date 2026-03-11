
"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import type { BoardState, Move, Player, MoveSetting } from "@/lib/types"; 
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
  moveSetting = 'direct'
}: GoBoardProps) {
  const [hoveredCell, setHoveredCell] = useState<{ r: number; c: number } | null>(null);
  const [pendingMove, setPendingMove] = useState<{ r: number; c: number } | null>(null);
  const [lastClicked, setLastClicked] = useState<{ r: number; c: number; time: number } | null>(null);
  
  // 音效引用与棋盘状态快照
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevBoardRef = useRef<BoardState | null>(null);
  const hasUnlockedAudio = useRef(false);
  
  // 初始化音频资源 (使用高可靠性的开源落子音效)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const audio = new Audio('https://raw.githubusercontent.com/sabaki-go/Sabaki/master/resources/audio/move.mp3');
      audio.volume = 1.0;
      audio.preload = 'auto';
      audioRef.current = audio;
    }
  }, []);

  // 执行播放逻辑
  const playStoneSound = () => {
    if (audioRef.current) {
      // 必须先重置进度以支持连续快速落子
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => {
        // 静默处理自动播放限制错误
        console.debug("Audio play blocked until interaction:", err);
      });
    }
  };

  // 核心：监测落子动作并触发音效 (支持本地与在线同步)
  useEffect(() => {
    if (prevBoardRef.current && prevBoardRef.current.length === size) {
      let stoneAdded = false;
      for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
          // 检测到棋盘上位置从 null 变为有子
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
    // 更新上一手快照
    prevBoardRef.current = board.map(row => [...row]);
  }, [board, size]);

  const starPoints = useMemo(() => getStarPoints(size), [size]);
  const interactiveCellSize = `${(1 / (size - 1)) * 100}%`;
  const isInteractionDisabled = disabled || readOnly;

  // 用户交互触发解锁 (规避浏览器自动播放限制)
  const unlockAudio = () => {
    if (!hasUnlockedAudio.current && audioRef.current) {
      hasUnlockedAudio.current = true;
      // 通过一次播放空音频的 Promise 链解锁系统音轨
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          // 成功解锁后立即暂停，等待后续实际落子触发
          audioRef.current?.pause();
          audioRef.current!.currentTime = 0;
        }).catch(() => {
          hasUnlockedAudio.current = false; // 解锁失败，下次重试
        });
      }
    }
  };

  const handleCellClick = (r: number, c: number) => {
    // 任何点击都尝试解锁音频
    unlockAudio();

    if (isInteractionDisabled || board[r][c] !== null) return;

    if (moveSetting === 'direct') {
      onMove?.(r, c);
      // 主动触发一次音效确保响应性
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
