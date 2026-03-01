
import { BoardState, Player, GameResult } from '../types';
import { ScoringStrategy } from './strategy';
import { GoLogic } from '../go-logic';

/**
 * Japanese Rule Logic (Territory Scoring - Bimu Fa)
 * Mechanism: Score = Enclosed empty points + Captured stones.
 * Refined per renew.md: Dame/Seki points are ignored.
 */
export class JapaneseScoring implements ScoringStrategy {
  calculate(board: BoardState, prisoners: { black: number, white: number } = { black: 0, white: 0 }): GameResult {
    const size = board.length;
    const komi = 6.5;

    // The logic now expects 'board' to be pre-cleaned by GoLogic.removeDeadStones()
    const liveBoard = board;

    const visited = new Set<string>();
    let blackTerritory = 0;
    let whiteTerritory = 0;

    // Count territory using Flood Fill
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const key = `${r},${c}`;
        if (liveBoard[r][c] === null && !visited.has(key)) {
          const { points, owner } = GoLogic.findEnclosedArea(liveBoard, r, c, visited);
          if (owner === 'black') {
            blackTerritory += points.length;
          } else if (owner === 'white') {
            whiteTerritory += points.length;
          }
          // Dame or Seki points count as 0 for both in Japanese rules.
          // findEnclosedArea correctly flags shared areas as 'seki'.
        }
      }
    }

    // Japanese Score = Territory + Stones captured from opponent.
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
        blackPrisoners: prisoners.white || 0,
        whitePrisoners: prisoners.black || 0,
        blackDeadOnBoard: 0, // In this implementation, dead stones are pre-cleared
        whiteDeadOnBoard: 0,
        komi: komi
      }
    };
  }
}
