
import { BoardState, Player, GameResult } from '../types';
import { ScoringStrategy } from './strategy';
import { GoLogic } from '../go-logic';

/**
 * Chinese Rule Logic (Area Scoring - Shuzi Fa)
 * Refined formula to handle incomplete games correctly:
 * Margin (Zi) = 0.5 * (BlackArea - WhiteArea - 2*Komi)
 * This ensures mathematical logic even when the board is not full of stones.
 */
export class ChineseScoring implements ScoringStrategy {
  calculate(board: BoardState, prisoners: { black: number, white: number } = { black: 0, white: 0 }): GameResult {
    const size = board.length;
    const totalPoints = size * size;
    
    // Komi (Zi): Standard is 3.75 for 19x19 (equals 7.5 points)
    let komiZi = 3.75;
    if (size === 13) komiZi = 3.25;
    if (size === 9) komiZi = 2.75;

    // Referee cleanup: removes dead stones using the eye-based heuristic
    const cleanedBoard = GoLogic.removeDeadStones(board);

    const visited = new Set<string>();
    let blackStones = 0;
    let whiteStones = 0;
    let blackTerritory = 0;
    let whiteTerritory = 0;

    // 1. Count stones currently on the board
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (cleanedBoard[r][c] === 'black') blackStones++;
        if (cleanedBoard[r][c] === 'white') whiteStones++;
      }
    }

    // 2. Count fully enclosed empty points (Territory)
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
     * Correct Margin Logic for Chinese Rules:
     * In a full game, Black wins if BlackArea > 180.5 + 3.75 (for 19x19).
     * The margin in "Mu" (points) is always double the "Zi" difference.
     */
    const diffZi = 0.5 * (blackArea - whiteArea - (komiZi * 2));
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
        blackPrisoners: 0, // Ignored in Chinese rules
        whitePrisoners: 0,
        blackDeadOnBoard: 0,
        whiteDeadOnBoard: 0,
        komi: komiZi
      }
    };
  }
}
