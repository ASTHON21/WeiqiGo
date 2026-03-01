import { BoardState, Player, GameResult } from '../types';
import { ScoringStrategy } from './strategy';
import { GoLogic } from '../go-logic';

/**
 * Japanese Rule Logic (Territory Scoring - Bimu Fa)
 * Mechanism: Score = Enclosed empty points + Captured stones.
 * Dead stones are pre-cleared by the referee logic.
 */
export class JapaneseScoring implements ScoringStrategy {
  calculate(board: BoardState, prisoners: { black: number, white: number } = { black: 0, white: 0 }): GameResult {
    const size = board.length;
    const komi = 6.5;

    // Pre-processing: Dead stones are removed before counting
    const cleanedBoard = GoLogic.removeDeadStones(board);

    const visited = new Set<string>();
    let blackTerritory = 0;
    let whiteTerritory = 0;

    // Count territory using Flood Fill
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const key = `${r},${c}`;
        if (cleanedBoard[r][c] === null && !visited.has(key)) {
          const { points, owner } = GoLogic.findEnclosedArea(cleanedBoard, r, c, visited);
          if (owner === 'black') {
            blackTerritory += points.length;
          } else if (owner === 'white') {
            whiteTerritory += points.length;
          }
        }
      }
    }

    // Japanese Score = Territory + Stones captured from opponent.
    // prisoners.black is the count of white stones captured by Black.
    const blackFinal = blackTerritory + (prisoners.black || 0);
    const whiteFinal = whiteTerritory + (prisoners.white || 0);

    const diff = blackFinal - (whiteFinal + komi);
    const winner = diff > 0 ? 'black' : 'white';

    return {
      winner,
      reason: 'Territory Counting (Japanese Rules)',
      blackScore: blackFinal,
      whiteScore: whiteFinal + komi,
      diff: Math.abs(diff),
      komi: komi,
      details: {
        blackTerritory,
        whiteTerritory,
        blackPrisoners: prisoners.black || 0,
        whitePrisoners: prisoners.white || 0,
        blackDeadOnBoard: 0,
        whiteDeadOnBoard: 0,
        komi: komi
      }
    };
  }
}
