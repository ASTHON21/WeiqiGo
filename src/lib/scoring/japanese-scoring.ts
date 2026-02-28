import { BoardState, Player, GameResult } from '../types';
import { ScoringStrategy } from './strategy';
import { GoLogic } from '../go-logic';

/**
 * Japanese Rule Logic (Territory Scoring - Bimu Fa)
 * Mechanism: Score = Enclosed empty points + Captured stones - Dead stones on board.
 */
export class JapaneseScoring implements ScoringStrategy {
  calculate(board: BoardState, prisoners: { black: number, white: number } = { black: 0, white: 0 }): GameResult {
    const size = board.length;
    const komi = 6.5;

    const visited = new Set<string>();
    let blackTerritory = 0;
    let whiteTerritory = 0;

    // 1. Identify dead stones on board (Simplified: stones with 0 liberties are dead)
    // In a real match, players agree on dead stones. Here we use physics.
    const allGroups = GoLogic.getAllGroups(board);
    const deadStones = { black: 0, white: 0 };
    const liveBoard = board.map(row => [...row]);

    allGroups.forEach(group => {
      if (!GoLogic.isGroupAlive(board, group)) {
        group.positions.forEach(([r, c]) => {
          deadStones[group.player as 'black' | 'white']++;
          liveBoard[r][c] = null; // Treat dead stones as empty territory for scoring
        });
      }
    });

    // 2. Count territory using Flood Fill on the "Live" board
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
          // Dame or Seki points count as 0 for both in Japanese rules
        }
      }
    }

    // Japanese Score = Territory + Stones captured from opponent - My stones that died
    // Math: BlackFinal = BlackTerritory + WhitePrisonersHeldByBlack - BlackDeadStonesOnBoard
    // But since we use common UI stats:
    // prisoners.black = stones captured by BLACK (white's loss)
    // prisoners.white = stones captured by WHITE (black's loss)
    const blackFinal = blackTerritory + (prisoners.black || 0) - deadStones.black;
    const whiteFinal = whiteTerritory + (prisoners.white || 0) - deadStones.white;

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
        blackPrisoners: prisoners.white || 0, // Stones black lost to white
        whitePrisoners: prisoners.black || 0, // Stones white lost to black
        blackDeadOnBoard: deadStones.black,
        whiteDeadOnBoard: deadStones.white,
        komi: komi
      }
    };
  }
}
