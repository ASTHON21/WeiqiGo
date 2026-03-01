import { BoardState, Player, GameResult } from '../types';
import { ScoringStrategy } from './strategy';
import { GoLogic } from '../go-logic';

/**
 * Chinese Rule Logic (Area Scoring - Shuzi Fa)
 * Mechanism: Score = Stones on board + Enclosed empty points.
 * Refined: Neutral points (Dame) are split in the margin calculation to prevent 
 * mathematically impossible leads in mid-game/partial boards.
 */
export class ChineseScoring implements ScoringStrategy {
  calculate(board: BoardState, prisoners: { black: number, white: number } = { black: 0, white: 0 }): GameResult {
    const size = board.length;
    const totalPoints = size * size;
    
    // Set Komi in Zi (Standard 19x19 is 3.75 zi which equals 7.5 points)
    let komiZi = 3.75;
    if (size === 13) komiZi = 3.25;
    if (size === 9) komiZi = 2.75;

    // Pre-processing: Dead stones are removed before counting
    const cleanedBoard = GoLogic.removeDeadStones(board);

    const visited = new Set<string>();
    let blackStones = 0;
    let whiteStones = 0;
    let blackTerritory = 0;
    let whiteTerritory = 0;

    // 1. Count stones on board
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (cleanedBoard[r][c] === 'black') blackStones++;
        if (cleanedBoard[r][c] === 'white') whiteStones++;
      }
    }

    // 2. Count territory using Flood Fill
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

    const blackArea = blackStones + blackTerritory;
    const whiteArea = whiteStones + whiteTerritory;
    const neutralPoints = totalPoints - blackArea - whiteArea;

    /**
     * Correct Area Counting Margin (Zi)
     * 
     * Tournament Formula for a finished board: Margin = BlackArea - (Total / 2 + Komi)
     * To handle boards with neutral points (Dame) correctly and avoid the "348.5 points" bug:
     * Margin = (BlackArea + Neutral / 2) - (Total / 2 + Komi)
     * This simplifies to: 0.5 * (BlackArea - WhiteArea - Komi * 2)
     */
    const blackAdjusted = blackArea + (neutralPoints / 2);
    const winThreshold = (totalPoints / 2) + komiZi;
    const diffZi = blackAdjusted - winThreshold;
    
    const winner = diffZi >= 0 ? 'black' : 'white';

    return {
      winner,
      reason: 'Area Counting (Chinese Rules)',
      blackScore: blackArea,
      whiteScore: whiteArea,
      diff: Math.abs(diffZi),
      komi: komiZi,
      details: {
        blackStones,
        whiteStones,
        blackTerritory,
        whiteTerritory,
        neutralPoints,
        blackArea,
        whiteArea,
        totalPoints,
        blackPrisoners: 0, 
        whitePrisoners: 0,
        blackDeadOnBoard: 0,
        whiteDeadOnBoard: 0,
        komi: komiZi
      }
    };
  }
}
