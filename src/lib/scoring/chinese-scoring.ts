
import { BoardState, Player, GameResult } from '../types';
import { ScoringStrategy } from './strategy';
import { GoLogic } from '../go-logic';

/**
 * 中国规则数子法 (Area Scoring)
 * 公式：黑棋胜负值 = 黑棋面积 - (总点数 / 2 + 贴子)
 * 胜负显示：|黑棋胜负值| * 2
 */
export class ChineseScoring implements ScoringStrategy {
  calculate(board: BoardState, prisoners: { black: number, white: number } = { black: 0, white: 0 }): GameResult {
    const size = board.length;
    const totalPoints = size * size;
    
    // 1. 获取贴子 (Zi) 设定
    let komiZi = 3.75; 
    if (size === 13) komiZi = 3.25;
    if (size === 9) komiZi = 2.75;

    // 2. 移除死子（数子法前提）
    const cleanedBoard = GoLogic.removeDeadStones(board);

    const visited = new Set<string>();
    let blackStones = 0;
    let whiteStones = 0;
    let blackTerritory = 0;
    let whiteTerritory = 0;

    // 3. 统计活子
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (cleanedBoard[r][c] === 'black') blackStones++;
        if (cleanedBoard[r][c] === 'white') whiteStones++;
      }
    }

    // 4. 统计归属领土
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

    // 5. 核心计算：数子法标准公式
    const blackArea = blackStones + blackTerritory;
    const whiteArea = whiteStones + whiteTerritory;
    const neutralPoints = totalPoints - blackArea - whiteArea;

    // 黑棋胜负子数 = 黑面积 - (总点数/2 + 贴子)
    const blackMarginZi = blackArea - (totalPoints / 2 + komiZi);
    
    // 转换为目/点显示
    const diffPoints = Math.abs(blackMarginZi) * 2;
    const winner: Player = blackMarginZi > 0 ? 'black' : 'white';

    return {
      winner,
      reason: '数子法 (中国规则)',
      blackScore: blackArea,
      whiteScore: whiteArea,
      diff: diffPoints,
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
