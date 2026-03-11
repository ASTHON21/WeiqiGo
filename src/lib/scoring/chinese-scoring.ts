
import { BoardState, Player, GameResult } from '../types';
import { ScoringStrategy } from './strategy';
import { GoLogic } from '../go-logic';

/**
 * 优化后的中国规则数子法 (Area Scoring)
 * 遵循核心公式：
 * 黑方总数 = 黑活子数 + 黑围空
 * 白方总数 = 白活子数 + 白围空
 * 贴子 = 3.75 (固定值)
 * 黑胜 ⇔ 黑总数 > 白总数 + 3.75
 * 
 * 注意：中国规则中不计提子。
 */
export class ChineseScoring implements ScoringStrategy {
  calculate(board: BoardState, _prisoners: { black: number, white: number } = { black: 0, white: 0 }): GameResult {
    const size = board.length;
    const KOMI = 3.75; // 固定贴子 3.75 子

    // 1. 识别并移除死子
    const cleanedBoard = GoLogic.removeDeadStones(board);
    
    let blackDeadOnBoard = 0;
    let whiteDeadOnBoard = 0;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (board[r][c] !== cleanedBoard[r][c]) {
          if (board[r][c] === 'black') blackDeadOnBoard++;
          else if (board[r][c] === 'white') whiteDeadOnBoard++;
        }
      }
    }

    const visited = new Set<string>();
    let blackStones = 0;
    let whiteStones = 0;
    let blackTerritory = 0;
    let whiteTerritory = 0;
    let neutralPoints = 0;

    // 2. 统计活子数量
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (cleanedBoard[r][c] === 'black') blackStones++;
        else if (cleanedBoard[r][c] === 'white') whiteStones++;
      }
    }

    // 3. 统计围空归属
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
            neutralPoints += points.length;
          }
        }
      }
    }

    // 4. 计算总数 (子空皆地)
    // 公气对半分
    const blackTotal = parseFloat((blackStones + blackTerritory + (neutralPoints / 2)).toFixed(2));
    const whiteTotal = parseFloat((whiteStones + whiteTerritory + (neutralPoints / 2)).toFixed(2));

    // 5. 胜负判定过程
    const isBlackWinner = blackTotal > (whiteTotal + KOMI);
    const winner: Player = isBlackWinner ? 'black' : 'white';
    
    // 计算差距 (胜子数)
    const diffZi = parseFloat(Math.abs(blackTotal - (whiteTotal + KOMI)).toFixed(2));

    return {
      winner,
      reason: '中国规则数子法 (精确结算)',
      blackScore: blackTotal,
      whiteScore: whiteTotal,
      diff: diffZi,
      komi: KOMI,
      details: {
        blackTerritory,
        whiteTerritory,
        blackStones,
        whiteStones,
        neutralPoints,
        blackArea: blackTotal,
        whiteArea: whiteTotal,
        totalPoints: size * size,
        blackPrisoners: 0, // 中国规则不应用提子
        whitePrisoners: 0, 
        blackDeadOnBoard,
        whiteDeadOnBoard,
        komi: KOMI
      }
    };
  }
}
