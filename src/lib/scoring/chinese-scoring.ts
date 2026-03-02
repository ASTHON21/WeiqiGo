
import { BoardState, Player, GameResult } from '../types';
import { ScoringStrategy } from './strategy';
import { GoLogic } from '../go-logic';

/**
 * 中国规则数子法 (Area Scoring)
 * 核心公式：得分 = 棋盘活子 + 围空
 */
export class ChineseScoring implements ScoringStrategy {
  calculate(board: BoardState, prisoners: { black: number, white: number } = { black: 0, white: 0 }): GameResult {
    const size = board.length;
    const totalPoints = size * size;
    
    // 贴子 (Zi) 设定
    // 19x19 标准贴子 3.75 子 (即 7.5 目)
    let komiZi = 3.75; 
    if (size === 13) komiZi = 3.25;
    if (size === 9) komiZi = 2.75;

    // 1. 获取清理过死子的棋盘（数子法通常先移除死子）
    const cleanedBoard = GoLogic.removeDeadStones(board);

    const visited = new Set<string>();
    let blackStones = 0;
    let whiteStones = 0;
    let blackTerritory = 0;
    let whiteTerritory = 0;

    // 2. 统计活子数量
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (cleanedBoard[r][c] === 'black') blackStones++;
        if (cleanedBoard[r][c] === 'white') whiteStones++;
      }
    }

    // 3. 统计归属领土
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const key = `${r},${c}`;
        if (cleanedBoard[r][c] === null && !visited.has(key)) {
          const { points, owner } = GoLogic.findEnclosedArea(cleanedBoard, r, c, visited);
          if (owner === 'black') blackTerritory += points.length;
          else if (owner === 'white') whiteTerritory += points.length;
        }
      }
    }

    // 4. 计算总面积 (Area = Stones + Territory)
    const blackArea = blackStones + blackTerritory;
    const whiteArea = whiteStones + whiteTerritory;
    const neutralPoints = totalPoints - blackArea - whiteArea;

    // 5. 判定胜负 (黑棋需超过 180.5 + 3.75 = 184.25)
    const blackThreshold = (totalPoints / 2) + komiZi;
    const marginZi = blackArea - blackThreshold;
    const winner: Player = marginZi > 0 ? 'black' : 'white';

    return {
      winner,
      reason: '数子法 (中国规则)',
      blackScore: blackArea,
      whiteScore: whiteArea,
      diff: Math.abs(marginZi),
      komi: komiZi,
      details: {
        blackTerritory,
        whiteTerritory,
        blackStones,
        whiteStones,
        neutralPoints,
        blackArea,
        whiteArea,
        totalPoints,
        blackPrisoners: prisoners.black,
        whitePrisoners: prisoners.white,
        blackDeadOnBoard: 0,
        whiteDeadOnBoard: 0,
        komi: komiZi
      }
    };
  }
}
