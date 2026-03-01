
import { BoardState, Player, GameResult } from '../types';
import { ScoringStrategy } from './strategy';
import { GoLogic } from '../go-logic';

/**
 * Chinese Rule Logic (Area Scoring - Shuzi Fa)
 * 修正版公式：黑方领先目数 = (黑方子数 + 黑方围空 + 公气/2) - (总目数/2 + 3.75)
 * 该公式能够正确处理棋盘未铺满的情况。
 */
export class ChineseScoring implements ScoringStrategy {
  calculate(board: BoardState, prisoners: { black: number, white: number } = { black: 0, white: 0 }): GameResult {
    const size = board.length;
    const totalPoints = size * size;
    
    // 贴子 (Zi)：19x19 为 3.75子 (相当于 7.5目)
    let komiZi = 3.75;
    if (size === 13) komiZi = 3.25;
    if (size === 9) komiZi = 2.75;

    // 预处理：移除死子
    const cleanedBoard = GoLogic.removeDeadStones(board);

    const visited = new Set<string>();
    let blackStones = 0;
    let whiteStones = 0;
    let blackTerritory = 0;
    let whiteTerritory = 0;

    // 1. 数棋盘上的活子
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (cleanedBoard[r][c] === 'black') blackStones++;
        if (cleanedBoard[r][c] === 'white') whiteStones++;
      }
    }

    // 2. 洪水填充数围空
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
     * 核心修正逻辑：
     * 如果直接计算 BlackArea - (TotalPoints/2 + Komi)，在棋盘未落满时会导致白方领先巨大的 bug。
     * 正确做法是计算黑白双方实际占领区域的差值。
     * 领先子数 (Zi) = (BlackArea - WhiteArea - 2*Komi) / 2
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
        blackPrisoners: 0, 
        whitePrisoners: 0,
        blackDeadOnBoard: 0,
        whiteDeadOnBoard: 0,
        komi: komiZi
      }
    };
  }
}
