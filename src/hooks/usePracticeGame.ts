
"use client";

import { useState, useCallback } from 'react';
import { BoardState, Move, Player } from '@/lib/types';
import { GoLogic, createEmptyBoard } from '@/lib/go-logic';

/**
 * 驱动本地练棋模式的钩子
 */
export function usePracticeGame(boardSize: number = 19) {
  const [board, setBoard] = useState<BoardState>(createEmptyBoard(boardSize));
  const [history, setHistory] = useState<BoardState[]>([]);
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [currentTurn, setCurrentTurn] = useState<Player>('black');
  
  // 提子统计
  const [prisoners, setPrisoners] = useState({ black: 0, white: 0 });

  const makeMove = useCallback((r: number, c: number) => {
    const result = GoLogic.processMove(board, r, c, currentTurn, history);
    if (result.success) {
      setHistory(prev => [...prev, board]);
      setBoard(result.newBoard);
      setMoveHistory(prev => [...prev, { r, c, player: currentTurn }]);
      
      // 更新提子统计 (如果是黑方下子提掉的是白子)
      if (result.capturedCount > 0) {
        setPrisoners(prev => ({
          ...prev,
          [currentTurn === 'black' ? 'black' : 'white']: prev[currentTurn === 'black' ? 'black' : 'white'] + result.capturedCount
        }));
      }
      
      setCurrentTurn(prev => prev === 'black' ? 'white' : 'black');
      return { success: true };
    }
    return { success: false, error: result.error };
  }, [board, currentTurn, history]);

  const pass = useCallback(() => {
    const lastMove = moveHistory[moveHistory.length - 1];
    const isConsecutivePass = lastMove && lastMove.r === -1 && lastMove.c === -1;

    setHistory(prev => [...prev, board]);
    setMoveHistory(prev => [...prev, { r: -1, c: -1, player: currentTurn }]);
    setCurrentTurn(prev => prev === 'black' ? 'white' : 'black');

    return isConsecutivePass; // 返回是否为连续弃权
  }, [board, currentTurn, moveHistory]);

  const reset = () => {
    setBoard(createEmptyBoard(boardSize));
    setHistory([]);
    setMoveHistory([]);
    setCurrentTurn('black');
    setPrisoners({ black: 0, white: 0 });
  };

  return {
    board,
    currentTurn,
    moveHistory,
    prisoners,
    makeMove,
    pass,
    reset
  };
}
