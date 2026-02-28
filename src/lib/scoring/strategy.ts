import { BoardState, GameResult } from '../types';

/**
 * Interface for Go scoring strategies.
 */
export interface ScoringStrategy {
  /**
   * Calculates the final score for a given board state and prisoner count.
   * @param board The current state of the board.
   * @param prisoners The count of stones captured by each player { black: number, white: number }.
   * @returns A GameResult object containing the winner and score breakdown.
   */
  calculate(board: BoardState, prisoners: { black: number, white: number }): GameResult;
}
