
import { BoardState, Player, GameResult } from '../types';
import { ScoringStrategy } from './strategy';
import { GoLogic } from '../go-logic';

/**
 * 日韩规则比目法 (Territory Scoring / Bimu Fa) - 国际竞赛标准实现
 * 
 * 核心逻辑：
 * 1. 最终得分 = 围空点数 (Territory) - 己方死子数 (Prisoners)
 * 2. 双活 (Seki) 区域内的目数计为 0。
 * 3. 贴目 (Komi) 固定为 6.5 目。
 */
export class JapaneseScoring implements ScoringStrategy {
  calculate(board: BoardState, prisoners: { black: number, white: number } = { black: 0, white: 0 }): GameResult {
    const size = board.length;
    const KOMI = 6.5; // 国际竞赛标准 6.5 目

    // 1. 自动移除死子（比目法要求盘面干净，死子视同提子）
    const cleanedBoard = GoLogic.removeDeadStones(board);

    const visited = new Set<string>();
    let blackTerritory = 0;
    let whiteTerritory = 0;
    let sekiPoints = 0;

    // 2. 统计归属目数
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const key = `${r},${c}`;
        if (cleanedBoard[r][c] === null && !visited.has(key)) {
          // 寻找封闭空地，并判定归属
          const { points, owner } = GoLogic.findEnclosedArea(cleanedBoard, r, c, visited);
          
          if (owner === 'black') {
            blackTerritory += points.length;
          } else if (owner === 'white') {
            whiteTerritory += points.length;
          } else if (owner === 'seki') {
            // 在日韩规则下，双活（Seki）区域内的所有交叉点计为 0 分
            sekiPoints += points.length;
          }
        }
      }
    }

    // 3. 计算最终比分
    // 公式：黑得分 = 黑围空 + 黑提子
    // 公式：白得分 = 白围空 + 白提子 + 贴目
    const blackFinal = blackTerritory + (prisoners.black || 0);
    const whiteFinal = whiteTerritory + (prisoners.white || 0);

    const diff = blackFinal - (whiteFinal + KOMI);
    const winner: Player = diff > 0 ? 'black' : 'white';

    return {
      winner,
      reason: '比目法 (日韩竞技规则)',
      blackScore: blackFinal,
      whiteScore: whiteFinal + KOMI,
      diff: Math.abs(diff),
      komi: KOMI,
      details: {
        blackTerritory,
        whiteTerritory,
        blackPrisoners: prisoners.black || 0,
        whitePrisoners: prisoners.white || 0,
        blackDeadOnBoard: 0, // 已在 cleanedBoard 中移除并计入提子
        whiteDeadOnBoard: 0,
        neutralPoints: sekiPoints,
        komi: KOMI
      }
    };
  }
}
