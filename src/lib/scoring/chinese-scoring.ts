
import { BoardState, Player, GameResult } from '../types';
import { ScoringStrategy } from './strategy';
import { GoLogic } from '../go-logic';

/**
 * 中国规则数子法 (Area Scoring - Shuzi Fa)
 * 核心修正：确保总点数之和恒等于棋盘格点数 (如 19x19 = 361)
 * 胜负计算公式：领先子数 (Zi) = 黑方占地 - (总点数 / 2 + 贴子)
 */
export class ChineseScoring implements ScoringStrategy {
  calculate(board: BoardState, prisoners: { black: number, white: number } = { black: 0, white: 0 }): GameResult {
    const size = board.length;
    const totalPoints = size * size;
    
    // 贴子 (Zi): 19路为 3.75子 (即 7.5目)
    let komiZi = 3.75;
    if (size === 13) komiZi = 3.25;
    if (size === 9) komiZi = 2.75;

    // 裁判逻辑：结算前先通过启发式清理死子
    const cleanedBoard = GoLogic.removeDeadStones(board);

    const visited = new Set<string>();
    let blackStones = 0;
    let whiteStones = 0;
    let blackTerritory = 0;
    let whiteTerritory = 0;

    // 1. 统计棋盘活子
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (cleanedBoard[r][c] === 'black') blackStones++;
        if (cleanedBoard[r][c] === 'white') whiteStones++;
      }
    }

    // 2. 统计封闭领地
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

    // 计算领先子数 (Zi)
    // 根据中国规则：黑方需超过 (总点数/2 + 贴子) 才能获胜
    const marginZi = blackArea - (totalPoints / 2 + komiZi);
    const winner = marginZi > 0 ? 'black' : 'white';

    return {
      winner,
      reason: 'Area Counting (Chinese Rules)',
      blackScore: blackArea,
      whiteScore: whiteArea,
      diff: Math.abs(marginZi), // 内部存储 Zi
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
