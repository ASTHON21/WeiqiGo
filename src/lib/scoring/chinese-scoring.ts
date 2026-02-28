import { BoardState, Player, GameResult } from '../types';
import { ScoringStrategy } from './strategy';
import { GoLogic } from '../go-logic';

/**
 * Chinese Rule Logic (Area Scoring - Shuzi Fa)
 * Mechanism: Score = Stones on board + Enclosed empty points.
 * Refined for Seki/Dame: Only fully enclosed points count.
 */
export class ChineseScoring implements ScoringStrategy {
  calculate(board: BoardState, prisoners: { black: number, white: number } = { black: 0, white: 0 }): GameResult {
    const size = board.length;
    const totalPoints = size * size;
    
    // Set Komi in Zi (Standard 19x19 is 3.75 zi which equals 7.5 points)
    let komiZi = 3.75;
    if (size === 13) komiZi = 3.25;
    if (size === 9) komiZi = 2.75;

    // PRE-PROCESSING: Remove dead stones (stones with 0 liberties)
    // Professional play assumes dead stones are removed before counting.
    const internalBoard = board.map(row => [...row]);
    const allGroups = GoLogic.getAllGroups(internalBoard);
    allGroups.forEach(group => {
      const [r, c] = group.positions[0];
      if (GoLogic.calculateLiberties(internalBoard, r, c) === 0) {
        group.positions.forEach(([gr, gc]) => {
          internalBoard[gr][gc] = null;
        });
      }
    });

    const visited = new Set<string>();
    let blackStones = 0;
    let whiteStones = 0;
    let blackTerritory = 0;
    let whiteTerritory = 0;

    // 1. Count stones on board (Integers)
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (internalBoard[r][c] === 'black') blackStones++;
        if (internalBoard[r][c] === 'white') whiteStones++;
      }
    }

    // 2. Count territory using Flood Fill
    // Rule: Territory not fully enclosed by ONE color is Dame (0 points).
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const key = `${r},${c}`;
        if (internalBoard[r][c] === null && !visited.has(key)) {
          const { points, owner } = GoLogic.findEnclosedArea(internalBoard, r, c, visited);
          if (owner === 'black') {
            blackTerritory += points.length;
          } else if (owner === 'white') {
            whiteTerritory += points.length;
          }
          // Note: If owner is 'seki' or null (Dame), points count as 0 for both.
        }
      }
    }

    const blackTotal = blackStones + blackTerritory;
    const whiteTotal = whiteStones + whiteTerritory;

    // Condition: Black wins if Black Area >= (TotalPoints / 2 + Komi)
    // Threshold example for 19x19: 180.5 + 3.75 = 184.25
    const winThreshold = (totalPoints / 2) + komiZi;
    const diffZi = blackTotal - winThreshold;
    const winner = diffZi >= 0 ? 'black' : 'white';

    return {
      winner,
      reason: 'Area Counting (Chinese Rules)',
      blackScore: blackTotal,
      whiteScore: whiteTotal,
      diff: Math.abs(diffZi),
      komi: komiZi,
      details: {
        blackTerritory,
        whiteTerritory,
        blackPrisoners: 0, 
        whitePrisoners: 0,
        blackDeadOnBoard: 0,
        whiteDeadOnBoard: 0,
        komi: komiZi
      }
    };
  }
}
