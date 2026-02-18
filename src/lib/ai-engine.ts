import { BoardState, Player, Move } from './types';
import { ShadowEngine } from './ai/engine';

/**
 * AI 决策入口函数 (适配原有业务代码)
 */
export function findBestMove(
  board: BoardState,
  player: Player,
  moveHistory: Move[],
  boardSize: number,
  boardHistory: BoardState[]
) {
  const engine = new ShadowEngine(boardSize);
  return engine.findBestMove(board, player, moveHistory, boardHistory);
}
