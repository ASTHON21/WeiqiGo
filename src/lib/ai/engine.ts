import { BoardState, Player, Move } from '../types';
import { GoLogic } from '../go-logic';
import { BoardEvaluator } from './evaluator';
import { findSgfMatch } from './dictionary/index';

/**
 * 指挥层 (ShadowEngine)
 * 职责：决策总调度。
 * 优先级：1. SGF 字典匹配 (本能) -> 2. Alpha-Beta 启发式搜索 (理性)
 */
export class ShadowEngine {
  private evaluator: BoardEvaluator;
  private boardSize: number;
  private maxDepth: number = 3;

  constructor(boardSize: number) {
    this.boardSize = boardSize;
    this.evaluator = new BoardEvaluator(boardSize);
  }

  /**
   * 主决策函数
   */
  public findBestMove(
    board: BoardState,
    player: Player,
    history: Move[],
    boardHistory: BoardState[]
  ): { bestMove: Move | null; explanation: string; gamePhase: string } {
    
    // 1. --- 模块：本能响应 (SGF 字典) ---
    // 只要历史路径匹配，AI 就会瞬间下出高手走法
    const sgfMatch = findSgfMatch(history, this.boardSize);
    if (sgfMatch) {
      return {
        bestMove: { r: sgfMatch.r, c: sgfMatch.c, player },
        explanation: `[记忆匹配] 发现对局库中的经典走法 (源自: ${sgfMatch.source})。`,
        gamePhase: 'Joseki'
      };
    }

    // 2. --- 模块：环境评估 ---
    const currentPhase = this.determinePhase(history.length);
    const possibleMoves = this.getOrderedMoves(board, player, history.length);

    if (possibleMoves.length === 0) {
      return { bestMove: null, explanation: "已无合法落子点，建议停着。", gamePhase: currentPhase };
    }

    // 3. --- 模块：自主思考 (Alpha-Beta 搜索) ---
    let bestValue = -Infinity;
    let bestMove = possibleMoves[0];

    for (const move of possibleMoves) {
      // 模拟落子，注意传入 boardHistory 用于打劫判断
      const result = GoLogic.processMove(board, move.r, move.c, player, boardHistory);
      if (!result.success) continue;

      const val = this.alphaBeta(
        result.newBoard,
        this.maxDepth - 1,
        -Infinity,
        Infinity,
        false, // 下一层是对手回合
        player,
        history.length + 1,
        [...boardHistory, result.newBoard]
      );

      if (val > bestValue) {
        bestValue = val;
        bestMove = move;
      }
    }

    // 如果搜索结果分值过低，可能意味着局面无望，但目前作为 MVP 版本暂不实现自动投子
    return {
      bestMove: bestMove,
      explanation: `[逻辑搜索] 字典未命中，已计算最佳评估分: ${bestValue.toFixed(1)}。`,
      gamePhase: currentPhase
    };
  }

  /**
   * Alpha-Beta 剪枝递归
   */
  private alphaBeta(
    board: BoardState,
    depth: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean,
    aiPlayer: Player,
    moveCount: number,
    boardHistory: BoardState[]
  ): number {
    if (depth === 0) {
      return this.evaluator.evaluate(board, aiPlayer, moveCount);
    }

    const opponent = aiPlayer === 'black' ? 'white' : 'black';
    const currentPlayer = isMaximizing ? aiPlayer : opponent;
    const moves = this.getOrderedMoves(board, currentPlayer, moveCount);

    if (isMaximizing) {
      let maxEval = -Infinity;
      for (const move of moves) {
        const result = GoLogic.processMove(board, move.r, move.c, currentPlayer, boardHistory);
        if (!result.success) continue;

        const evaluation = this.alphaBeta(
          result.newBoard,
          depth - 1,
          alpha,
          beta,
          false,
          aiPlayer,
          moveCount + 1,
          [...boardHistory, result.newBoard]
        );
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break;
      }
      return maxEval;
    } else {
      let minEval = Infinity;
      for (const move of moves) {
        const result = GoLogic.processMove(board, move.r, move.c, currentPlayer, boardHistory);
        if (!result.success) continue;

        const evaluation = this.alphaBeta(
          result.newBoard,
          depth - 1,
          alpha,
          beta,
          true,
          aiPlayer,
          moveCount + 1,
          [...boardHistory, result.newBoard]
        );
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) break;
      }
      return minEval;
    }
  }

  /**
   * 启发式移动排序
   */
  private getOrderedMoves(board: BoardState, player: Player, moveCount: number): Move[] {
    const moves: { r: number; c: number; player: Player; score: number }[] = [];
    for (let r = 0; r < this.boardSize; r++) {
      for (let c = 0; c < this.boardSize; c++) {
        if (board[r][c] === null) {
          const score = this.evaluator.getQuickScore(r, c, moveCount);
          moves.push({ r, c, player, score });
        }
      }
    }
    // 按评分降序排列，提高剪枝效率
    return moves.sort((a, b) => b.score - a.score);
  }

  /**
   * 识别游戏阶段
   */
  private determinePhase(moveCount: number): string {
    const total = this.boardSize * this.boardSize;
    if (moveCount < total * 0.2) return 'Fuseki';
    if (moveCount < total * 0.7) return 'Chuban';
    return 'Yose';
  }
}

/**
 * 兼容性导出入口
 */
export function findBestMove(
  board: BoardState,
  player: Player,
  moveHistory: Move[],
  boardSize: number,
  boardHistory: BoardState[]
) {
  const engine = new ShadowEngine(boardSize);
  return engine.findBestMove(board, player, moveHistory, boardHistory);
}
