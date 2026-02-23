
"use client";

import { useState, useMemo } from 'react';
import { LevelData, BoardState, Move } from '@/lib/types';
import { GoLogic, createEmptyBoard } from '@/lib/go-logic';

/**
 * 驱动名局阅览模式的钩子
 */
export function useSgfViewer(gameData: LevelData) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // 根据当前索引计算棋盘快照
  const currentBoard = useMemo(() => {
    let board = createEmptyBoard(gameData.boardSize);
    
    // 应用初始摆子
    gameData.handicaps.forEach(m => {
      board[m.r][m.c] = m.player;
    });

    // 线性应用步进到当前索引的落子
    const activeMoves = gameData.moves.slice(0, currentIndex);
    const history: BoardState[] = [];

    activeMoves.forEach(m => {
      const result = GoLogic.processMove(board, m.r, m.c, m.player, history);
      if (result.success) {
        history.push(board);
        board = result.newBoard;
      }
    });

    return board;
  }, [gameData, currentIndex]);

  const nextStep = () => {
    if (currentIndex < gameData.totalSteps) {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    }
  };

  const reset = () => setCurrentIndex(0);

  return {
    currentBoard,
    currentIndex,
    totalSteps: gameData.totalSteps,
    metadata: gameData.metadata,
    nextStep,
    prevStep,
    reset,
    lastMove: currentIndex > 0 ? gameData.moves[currentIndex - 1] : null
  };
}
