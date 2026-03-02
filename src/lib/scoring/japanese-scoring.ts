
import { BoardState, Player, GameResult } from '../types';
import { ScoringStrategy } from './strategy';
import { GoLogic } from '../go-logic';

/**
 * 日韩规则比目法 (Territory Scoring - Bimu Fa)
 */
export class JapaneseScoring implements ScoringStrategy {
  calculate(board: BoardState, prisoners: { black: number, white: number } = { black: 0, white: 0 }): GameResult {
    const size = board.length;
    const komi = 6.5; // 标准 6.5 目

    // 先移除死子
    const cleanedBoard = GoLogic.removeDeadStones(board);

    const visited = new Set<string>();
    let blackTerritory = 0;
    let whiteTerritory = 0;

    // 1. 数空
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

    // 2. 比目法公式：得分 = 围空 - 被对方提掉的死子
    // 注意：在界面上通常简化为：黑得分 = 黑围空 + 黑提子
    const blackFinal = blackTerritory + (prisoners.black || 0);
    const whiteFinal = whiteTerritory + (prisoners.white || 0);

    const diff = blackFinal - (whiteFinal + komi);
    const winner = diff > 0 ? 'black' : 'white';

    return {
      winner,
      reason: '比目法 (日韩规则)',
      blackScore: blackFinal,
      whiteScore: whiteFinal + komi,
      diff: Math.abs(diff),
      komi: komi,
      details: {
        blackTerritory,
        whiteTerritory,
        blackPrisoners: prisoners.black || 0,
        whitePrisoners: prisoners.white || 0,
        blackDeadOnBoard: 0,
        whiteDeadOnBoard: 0,
        komi: komi
      }
    };
  }
}
