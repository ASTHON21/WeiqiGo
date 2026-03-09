
import { BoardState, Player, GameResult } from '../types';
import { ScoringStrategy } from './strategy';
import { GoLogic } from '../go-logic';

/**
 * 中国规则数子法 (Area Scoring) - 国际竞赛标准实现
 * 
 * 核心逻辑：
 * 1. 活子 + 围空 = 总面积 (B 或 W)
 * 2. 贴子 (Komi) 以“子”为单位：
 *    - 19x19: 3.75 子 (7.5 目)
 *    - 13x13: 3.25 子 (6.5 目)
 *    - 9x9:   2.75 子 (5.5 目)
 * 3. 判定公式：黑得分 B >= (总点数/2 + 贴子) 则黑胜
 */
export class ChineseScoring implements ScoringStrategy {
  calculate(board: BoardState, prisoners: { black: number, white: number } = { black: 0, white: 0 }): GameResult {
    const size = board.length;
    const totalPoints = size * size;
    
    // 1. 获取竞赛标准的贴子 (Zi) 设定
    let komiZi = 3.75; 
    let blackWinsThreshold = 184.25; // 180.5 + 3.75

    if (size === 13) {
      komiZi = 3.25;
      blackWinsThreshold = 87.75; // 84.5 + 3.25
    } else if (size === 9) {
      komiZi = 2.75;
      blackWinsThreshold = 43.25; // 40.5 + 2.75
    }

    // 2. 移除死子（数子法前提是盘面仅剩活子，死子视同空地）
    const cleanedBoard = GoLogic.removeDeadStones(board);

    const visited = new Set<string>();
    let blackStones = 0;
    let whiteStones = 0;
    let blackTerritory = 0;
    let whiteTerritory = 0;
    let sekiPoints = 0;

    // 3. 统计活子
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (cleanedBoard[r][c] === 'black') blackStones++;
        else if (cleanedBoard[r][c] === 'white') whiteStones++;
      }
    }

    // 4. 统计归属领土 (Area)
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
            // 公气 (Seki points / Neutral points)
            sekiPoints += points.length;
          }
        }
      }
    }

    // 5. 面积计算 (Black Area = Stones + Territory)
    // 根据中国规则，公气通常在终局前应填满。如果未填满，双方平分。
    const blackArea = blackStones + blackTerritory + (sekiPoints / 2);
    const whiteArea = whiteStones + whiteTerritory + (sekiPoints / 2);

    // 6. 胜负判定 (Black Area vs Threshold)
    const isBlackWinner = blackArea >= blackWinsThreshold;
    const winner: Player = isBlackWinner ? 'black' : 'white';
    
    // 计算差距（以“点”或“目”为单位显示，1子 = 2点）
    const diffZi = Math.abs(blackArea - (totalPoints / 2 + komiZi));
    const diffPoints = diffZi * 2;

    return {
      winner,
      reason: '数子法 (中国竞赛规则)',
      blackScore: blackArea,
      whiteScore: whiteArea,
      diff: diffPoints,
      komi: komiZi,
      details: {
        blackTerritory,
        whiteTerritory,
        blackStones,
        whiteStones,
        neutralPoints: sekiPoints,
        blackArea,
        whiteArea,
        totalPoints,
        blackPrisoners: prisoners.black,
        whitePrisoners: prisoners.white,
        blackDeadOnBoard: 0, // 已在 cleanedBoard 中处理
        whiteDeadOnBoard: 0,
        komi: komiZi
      }
    };
  }
}
