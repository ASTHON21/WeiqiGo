import { BoardState, Player, GameResult } from '../types';
import { ScoringStrategy } from './strategy';
import { GoLogic } from '../go-logic';

/**
 * Chinese Rule Logic (Area Scoring - Shuzi Fa)
 * Mechanism: Score = Stones on board + Enclosed empty points.
 * Captured stones (prisoners) are ignored in the final calculation.
 */
export class ChineseScoring implements ScoringStrategy {
  calculate(board: BoardState, prisoners: { black: number, white: number } = { black: 0, white: 0 }): GameResult {
    const size = board.length;
    const totalPoints = size * size;
    
    // Set Komi in Zi (3.75 zi = 7.5 points)
    let komiZi = 3.75;
    if (size === 13) komiZi = 3.25;
    if (size === 9) komiZi = 2.75;

    const visited = new Set<string>();
    let blackStones = 0;
    let whiteStones = 0;
    let blackTerritory = 0;
    let whiteTerritory = 0;

    // 1. Count stones on board
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (board[r][c] === 'black') blackStones++;
        if (board[r][c] === 'white') whiteStones++;
      }
    }

    // 2. Count territory using Flood Fill
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const key = `${r},${c}`;
        if (board[r][c] === null && !visited.has(key)) {
          const { points, owner } = GoLogic.findEnclosedArea(board, r, c, visited);
          if (owner === 'black') {
            blackTerritory += points.length;
          } else if (owner === 'white') {
            whiteTerritory += points.length;
          } else if (owner === 'seki') {
            // Chinese rules: Seki points are split 50/50
            blackTerritory += points.length / 2;
            whiteTerritory += points.length / 2;
          }
          // Dame (unclaimed territory) results in 0 points for both
        }
      }
    }

    const blackTotal = blackStones + blackTerritory;
    const whiteTotal = whiteStones + whiteTerritory;

    // Condition: Black wins if Black Score >= (Total/2 + Komi)
    const winThreshold = (totalPoints / 2) + komiZi;
    const diff = blackTotal - winThreshold;
    const winner = diff >= 0 ? 'black' : 'white';

    return {
      winner,
      reason: 'Area Counting (Chinese Rules)',
      blackScore: blackTotal,
      whiteScore: whiteTotal,
      diff: Math.abs(diff),
      komi: komiZi,
      details: {
        blackTerritory: Math.floor(blackTerritory),
        whiteTerritory: Math.floor(whiteTerritory),
        blackPrisoners: 0, // Ignored in Chinese rules
        whitePrisoners: 0, // Ignored in Chinese rules
        blackDeadOnBoard: 0,
        whiteDeadOnBoard: 0,
        komi: komiZi
      }
    };
  }
}
