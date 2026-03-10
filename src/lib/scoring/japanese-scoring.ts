
import { BoardState, Player, GameResult } from '../types';
import { ScoringStrategy } from './strategy';
import { GoLogic } from '../go-logic';

/**
 * 日韩规则比目法 (Territory Scoring) - 国际竞赛标准实现
 * 
 * 核心逻辑：
 * 1. 得分 = 围空 (Territory) + 提子 (Prisoners)
 * 2. 贴目 (Komi) 固定为 6.5 目。
 * 3. 双活 (Seki) 区域内的目数严格计为 0 分。
 */
export class JapaneseScoring implements ScoringStrategy {
  calculate(board: BoardState, prisoners: { black: number, white: number } = { black: 0, white: 0 }): GameResult {
    const size = board.length;
    const KOMI = 6.5; 

    // 1. 自动移除死子
    const cleanedBoard = GoLogic.removeDeadStones(board);

    const visited = new Set<string>();
    let blackTerritory = 0;
    let whiteTerritory = 0;
    let sekiPoints = 0;

    // 2. 统计纯粹围空
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const key = `${r},${c}`;
        if (cleanedBoard[r][c] === null && !visited.has(key)) {
          const { points, owner } = GoLogic.findEnclosedArea(cleanedBoard, r, c, visited);
          
          if (owner === 'black') {
            blackTerritory += points.length;
          } else if (owner === 'white') {
            whiteTerritory += points.length;
          } else if (owner === 'seki') {
            // 重要：日韩规则中，双活区域内的交叉点计为 0 分
            sekiPoints += points.length;
          }
        }
      }
    }

    // 3. 计算结果
    // 黑方总分 = 围空 + 黑方提掉的子
    // 白方总分 = 围空 + 白方提掉的子 + 贴目
    const blackFinal = blackTerritory + (prisoners.black || 0);
    const whiteFinal = whiteTerritory + (prisoners.white || 0) + KOMI;

    const diff = blackFinal - whiteFinal;
    const winner: Player = diff > 0 ? 'black' : 'white';

    return {
      winner,
      reason: '比目法 (日韩竞技规则)',
      blackScore: blackFinal,
      whiteScore: whiteFinal,
      diff: Math.abs(diff),
      komi: KOMI,
      details: {
        blackTerritory,
        whiteTerritory,
        blackPrisoners: prisoners.black || 0,
        whitePrisoners: prisoners.white || 0,
        blackDeadOnBoard: 0,
        whiteDeadOnBoard: 0,
        neutralPoints: sekiPoints,
        komi: KOMI
      }
    };
  }
}
