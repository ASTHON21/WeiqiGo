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

  const makeMove = useCallback((r: number, c: number) => {
    const result = GoLogic.processMove(board, r, c, currentTurn, history);
    if (result.success) {
      setHistory(prev => [...prev, board]);
      setBoard(result.newBoard);
      setMoveHistory(prev => [...prev, { r, c, player: currentTurn }]);
      setCurrentTurn(prev => prev === 'black' ? 'white' : 'black');
      return { success: true };
    }
    return { success: false, error: result.error };
  }, [board, currentTurn, history]);

  const pass = useCallback(() => {
    setHistory(prev => [...prev, board]);
    setMoveHistory(prev => [...prev, { r: -1, c: -1, player: currentTurn }]);
    setCurrentTurn(prev => prev === 'black' ? 'white' : 'black');
  }, [board, currentTurn]);

  const undo = () => {
    if (history.length > 0) {
      const prevBoard = history[history.length - 1];
      setBoard(prevBoard);
      setHistory(prev => prev.slice(0, -1));
      setMoveHistory(prev => prev.slice(0, -1));
      setCurrentTurn(prev => prev === 'black' ? 'white' : 'black');
    }
  };

  const reset = () => {
    setBoard(createEmptyBoard(boardSize));
    setHistory([]);
    setMoveHistory([]);
    setCurrentTurn('black');
  };

  return {
    board,
    currentTurn,
    moveHistory,
    makeMove,
    pass,
    undo,
    reset
  };
}