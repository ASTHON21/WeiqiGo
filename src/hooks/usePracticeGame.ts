
"use client";

import { useState, useCallback } from 'react';
import { BoardState, Move, Player } from '@/lib/types';
import { GoLogic, createEmptyBoard } from '@/lib/go-logic';

/**
 * 驱动本地练棋模式的钩子
 * 集成了劫争 (Ko) 历史管理与提子统计
 */
export function usePracticeGame(boardSize: number = 19) {
  const [board, setBoard] = useState<BoardState>(createEmptyBoard(boardSize));
  const [history, setHistory] = useState<BoardState[]>([]);
  const [moveHistory, setMoveHistory] = useState<Move[]>([]);
  const [currentTurn, setCurrentTurn] = useState<Player>('black');
  const [prisoners, setPrisoners] = useState({ black: 0, white: 0 });

  const makeMove = useCallback((r: number, c: number) => {
    // 劫争规则要求传入历史记录
    // 通常只需比对上一手落子后的状态，但为了防止长生劫等复杂情况，可扩展比对范围
    const result = GoLogic.processMove(board, r, c, currentTurn, history.slice(-10));
    
    if (result.success) {
      // 记录当前状态用于未来的劫争校验
      setHistory(prev => [...prev, board.map(row => [...row])]);
      setBoard(result.newBoard);
      setMoveHistory(prev => [...prev, { r, c, player: currentTurn, index: prev.length }]);
      
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

    setHistory(prev => [...prev, board.map(row => [...row])]);
    setMoveHistory(prev => [...prev, { r: -1, c: -1, player: currentTurn, index: prev.length }]);
    setCurrentTurn(prev => prev === 'black' ? 'white' : 'black');

    return isConsecutivePass;
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
