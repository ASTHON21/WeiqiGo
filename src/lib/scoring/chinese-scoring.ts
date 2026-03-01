
import { BoardState, Player, GameResult } from '../types';
import { ScoringStrategy } from './strategy';
import { GoLogic } from '../go-logic';

/**
 * Chinese Rule Logic (Area Scoring - Shuzi Fa)
 * Mechanism: Score = Stones on board + Enclosed empty points.
 * Refined per renew.md: Any territory touching both colors is Dame (0 points).
 */
export class ChineseScoring implements ScoringStrategy {
  calculate(board: BoardState, prisoners: { black: number, white: number } = { black: 0, white: 0 }): GameResult {
    const size = board.length;
    const totalPoints = size * size;
    
    // Set Komi in Zi (Standard 19x19 is 3.75 zi which equals 7.5 points)
    let komiZi = 3.75;
    if (size === 13) komiZi = 3.25;
    if (size === 9) komiZi = 2.75;

    // The logic now expects 'board' to be pre-cleaned by GoLogic.removeDeadStones()
    const internalBoard = board;

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
    // In Chinese rules, areas touching both colors (owners.size > 1) are Dame (0 pts).
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
          // Note: If owner is 'seki' or null, it's Dame/Neutral. 0 points.
        }
      }
    }

    const blackTotal = blackStones + blackTerritory;
    const whiteTotal = whiteStones + whiteTerritory;

    // Threshold calculation for win detection
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
