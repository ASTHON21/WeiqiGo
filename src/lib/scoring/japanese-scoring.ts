import { BoardState, Player, GameResult } from '../types';
import { ScoringStrategy } from './strategy';
import { GoLogic } from '../go-logic';

/**
 * 日韩规则比目法 (Territory Scoring) - 国际竞赛标准实现通用版
 * * 核心逻辑：
 * 1. 得分 = 围空 (Territory) + 提子 (Prisoners) + 盘面死子 (Dead stones on board)
 * 2. 贴目 (Komi) 标准为 6.5 目 (可根据盘面大小动态调整)。
 * 3. 双活 (Seki) 及未闭合的中立区域目数严格计为 0 分。
 */
export class JapaneseScoring implements ScoringStrategy {
  calculate(board: BoardState, prisoners: { black: number, white: number } = { black: 0, white: 0 }): GameResult {
    const size = board.length;
    
    // 1. 获取贴目 (Komi) 设定
    // 日韩规则通常全尺寸固定为 6.5 目，但 9x9 有时采用 5.5 目，此处提供灵活配置
    let KOMI = 6.5; 
    if (size === 13) KOMI = 5.5;
    if (size === 9) KOMI = 5.5;

    // 2. 移除死子，并统计被移除的盘面死子数 (极为关键)
    const cleanedBoard = GoLogic.removeDeadStones(board);
    
    let blackDeadOnBoard = 0; // 盘面死掉的白棋 (算作黑方的提子)
    let whiteDeadOnBoard = 0; // 盘面死掉的黑棋 (算作白方的提子)

    // 对比原始棋盘和清理后的棋盘，找出死子归属
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (board[r][c] === 'white' && cleanedBoard[r][c] === null) {
          blackDeadOnBoard++; 
        }
        if (board[r][c] === 'black' && cleanedBoard[r][c] === null) {
          whiteDeadOnBoard++;
        }
      }
    }

    const visited = new Set<string>();
    let blackTerritory = 0;
    let whiteTerritory = 0;
    let neutralOrSekiPoints = 0;

    // 3. 统计纯粹围空
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
            // 重要：日韩规则中，双活(seki)、单官或未完全封闭的区域计为 0 分
            neutralOrSekiPoints += points.length;
          }
        }
      }
    }

    // 4. 核心计算：比目法标准公式
    // 黑方总分 = 己方围空 + 历次提掉的白子 + 终局盘面拿掉的白方死子
    const blackFinal = blackTerritory + (prisoners.black || 0) + blackDeadOnBoard;
    
    // 白方总分 = 己方围空 + 历次提掉的黑子 + 终局盘面拿掉的黑方死子 + 贴目
    const whiteFinal = whiteTerritory + (prisoners.white || 0) + whiteDeadOnBoard + KOMI;

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
        blackPrisoners: prisoners.black || 0, // 历史对局提子
        whitePrisoners: prisoners.white || 0, // 历史对局提子
        blackDeadOnBoard, // 终局抓死的白子
        whiteDeadOnBoard, // 终局抓死的黑子
        neutralPoints: neutralOrSekiPoints,
        komi: KOMI
      }
    };
  }
}
