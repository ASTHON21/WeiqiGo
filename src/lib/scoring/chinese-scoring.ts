
import { BoardState, Player, GameResult } from '../types';
import { ScoringStrategy } from './strategy';
import { GoLogic } from '../go-logic';

/**
 * 中国规则数子法 (Area Scoring)
 * 核心逻辑：得分 = 棋盘活子 + 围空
 * 
 * 修正说明：
 * 为了解决棋盘未填满（存在大量中立点）时绝对阈值法产生的“天文数字”偏差，
 * 采用相对差异法：胜负点数 = (黑面积 - 白面积) - 2 * 贴子
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

    // 1. 移除死子（数子法前提）
    const cleanedBoard = GoLogic.removeDeadStones(board);

    const visited = new Set<string>();
    let blackStones = 0;
    let whiteStones = 0;
    let blackTerritory = 0;
    let whiteTerritory = 0;

    // 2. 统计活子
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

    // 4. 计算总归属面积 (Area = Stones + Territory)
    const blackArea = blackStones + blackTerritory;
    const whiteArea = whiteStones + whiteTerritory;
    const neutralPoints = totalPoints - blackArea - whiteArea;

    // 5. 核心计算：使用相对差异法计算“点数 (Points/Moku)”
    // 公式：(黑归属 - 白归属) - 2 * 贴子
    const diffPoints = blackArea - whiteArea - (2 * komiZi);
    const winner: Player = diffPoints > 0 ? 'black' : 'white';

    return {
      winner,
      reason: '数子法 (中国规则)',
      blackScore: blackArea,
      whiteScore: whiteArea,
      diff: Math.abs(diffPoints),
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
