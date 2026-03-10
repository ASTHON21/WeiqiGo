
import { BoardState, Player, GameResult } from '../types';
import { ScoringStrategy } from './strategy';
import { GoLogic } from '../go-logic';

/**
 * 中国规则数子法 (Area Scoring) - 国际竞赛标准实现
 * 
 * 核心逻辑：
 * 1. 面积 = 活子 + 围空。
 * 2. 贴子 (Komi) 以“子”为单位，根据棋盘尺寸自动适配：
 *    - 19x19: 3.75 子
 *    - 13x13: 3.25 子
 *    - 9x9:   2.75 子
 * 3. 判定：黑得分 >= (总点数/2 + 贴子) 则黑胜。
 */
export class ChineseScoring implements ScoringStrategy {
  calculate(board: BoardState, prisoners: { black: number, white: number } = { black: 0, white: 0 }): GameResult {
    const size = board.length;
    const totalPoints = size * size;
    
    // 1. 获取竞赛标准的贴子 (Zi) 设定
    let komiZi = 3.75; 
    let blackWinsThreshold = 184.25; // (361 / 2) + 3.75

    if (size === 13) {
      komiZi = 3.25;
      blackWinsThreshold = 87.75; // (169 / 2) + 3.25
    } else if (size === 9) {
      komiZi = 2.75;
      blackWinsThreshold = 43.25; // (81 / 2) + 2.75
    }

    // 2. 移除死子（数子法前提是盘面仅剩活子，死子视同空地）
    const cleanedBoard = GoLogic.removeDeadStones(board);

    const visited = new Set<string>();
    let blackStones = 0;
    let whiteStones = 0;
    let blackTerritory = 0;
    let whiteTerritory = 0;
    let neutralPoints = 0;

    // 3. 统计活子数量
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (cleanedBoard[r][c] === 'black') blackStones++;
        else if (cleanedBoard[r][c] === 'white') whiteStones++;
      }
    }

    // 4. 统计围空归属 (Area)
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const key = `${r},${c}`;
        if (cleanedBoard[r][c] === null && !visited.has(key)) {
          const { points, owner } = GoLogic.findEnclosedArea(cleanedBoard, r, c, visited);
          if (owner === 'black') {
            blackTerritory += points.length;
          } else if (owner === 'white') {
            whiteTerritory += points.length;
          } else {
            // 公气：在数子法中，终局未填满的公气由双方平分
            neutralPoints += points.length;
          }
        }
      }
    }

    // 5. 最终面积计算
    const blackArea = blackStones + blackTerritory + (neutralPoints / 2);
    const whiteArea = whiteStones + whiteTerritory + (neutralPoints / 2);

    // 6. 胜负判定
    const isBlackWinner = blackArea >= blackWinsThreshold;
    const winner: Player = isBlackWinner ? 'black' : 'white';
    
    // 计算差距：中国规则常以“子”显示，1子 = 2目
    const diffZi = Math.abs(blackArea - (totalPoints / 2 + komiZi));

    return {
      winner,
      reason: '数子法 (中国竞赛规则)',
      blackScore: blackArea,
      whiteScore: whiteArea,
      diff: diffZi * 2, // 转换为目数显示以保持界面一致
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
