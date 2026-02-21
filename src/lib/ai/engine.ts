import { BoardState, Player, Move } from '../types';
import { GoLogic } from '../go-logic';
import { BoardEvaluator } from './evaluator';
import { findSgfMatch } from './dictionary/index';

/**
 * 高级指挥层 (ShadowEngine)
 * 升级：结合动态长度字典匹配与带置换表的迭代加深搜索
 */
export class ShadowEngine {
  private evaluator: BoardEvaluator;
  private boardSize: number;
  private nodesEvaluated: number = 0;
  
  // 置换表：缓存已计算过的局面分值，提高搜索效率
  private transpositionTable = new Map<string, number>();
  
  // 搜索配置
  private readonly TIME_LIMIT = 4000; // 4秒时间预算

  constructor(boardSize: number) {
    this.boardSize = boardSize;
    this.evaluator = new BoardEvaluator(boardSize);
  }

  /**
   * 生成局面唯一哈希键
   */
  private getBoardHash(board: BoardState): string {
    return board.map(row => row.map(cell => cell || '.').join('')).join('|');
  }

  /**
   * 主决策函数
   */
  public findBestMove(
    board: BoardState,
    player: Player,
    history: Move[],
    boardHistory: BoardState[]
  ): { bestMove: Move | null; explanation: string; gamePhase: string; debugLog: any } {
    this.nodesEvaluated = 0;
    this.transpositionTable.clear();
    const startTime = Date.now();
    
    // 1. --- 模块：本能响应 (升级：动态长度匹配) ---
    const sgfMatch = findSgfMatch(history, this.boardSize);
    if (sgfMatch) {
      return {
        bestMove: { r: sgfMatch.r, c: sgfMatch.c, player },
        explanation: sgfMatch.explanation,
        gamePhase: 'Opening',
        debugLog: { 
          instinct: { status: "Hit", match: sgfMatch },
          rational: {
            nodesEvaluated: 0,
            bestValue: 0,
            depth: 0,
            time: 0
          }
        }
      };
    }

    // 2. --- 模块：迭代加深逻辑搜索 ---
    const currentPhase = this.determinePhase(history.length);
    let bestMoveFound: Move | null = null;
    let finalDepth = 0;
    let bestValueFound = 0;

    try {
      // 迭代加深：1层，2层... 直到时间耗尽或达到上限
      for (let depth = 1; depth <= 6; depth++) {
        const elapsed = Date.now() - startTime;
        if (elapsed > this.TIME_LIMIT * 0.8) break; // 留出 20% 安全余量

        const result = this.searchAtDepth(board, depth, player, boardHistory, startTime);
        
        if (result.move) {
          bestMoveFound = result.move;
          bestValueFound = result.value;
          finalDepth = depth;
        }
      }
    } catch (e) {
      console.log("[Engine] 搜索超时中断，返回当前最佳。");
    }

    const totalElapsed = Date.now() - startTime;

    if (!bestMoveFound) {
      return { 
        bestMove: null, 
        explanation: "AI 认为当前局面已终了。", 
        gamePhase: currentPhase,
        debugLog: { 
          instinct: { status: "Miss" },
          rational: { nodesEvaluated: this.nodesEvaluated, bestValue: 0, depth: 0, time: totalElapsed }
        }
      };
    }

    return {
      bestMove: bestMoveFound,
      explanation: `[逻辑搜索] 深度:${finalDepth} 耗时:${totalElapsed}ms 评估:${bestValueFound.toFixed(1)}`,
      gamePhase: currentPhase,
      debugLog: {
        instinct: { status: "Miss" },
        rational: {
          nodesEvaluated: this.nodesEvaluated,
          depth: finalDepth,
          time: totalElapsed,
          bestValue: bestValueFound,
          tableSize: this.transpositionTable.size
        }
      }
    };
  }

  private searchAtDepth(
    board: BoardState, 
    depth: number, 
    player: Player, 
    boardHistory: BoardState[],
    startTime: number
  ): { move: Move | null, value: number } {
    let bestValue = -Infinity;
    let bestMove: Move | null = null;
    const possibleMoves = this.getOrderedMoves(board, player, boardHistory.length);

    for (const move of possibleMoves) {
      if (Date.now() - startTime > this.TIME_LIMIT) throw new Error("Timeout");

      const result = GoLogic.processMove(board, move.r, move.c, player, boardHistory);
      if (!result.success) continue;

      const val = this.alphaBeta(
        result.newBoard,
        depth - 1,
        -Infinity,
        Infinity,
        false, 
        player,
        boardHistory.length + 1,
        [...boardHistory, board],
        startTime
      );

      if (val > bestValue) {
        bestValue = val;
        bestMove = move;
      }
    }

    return { move: bestMove, value: bestValue };
  }

  private alphaBeta(
    board: BoardState,
    depth: number,
    alpha: number,
    beta: number,
    isMaximizing: boolean,
    aiPlayer: Player,
    moveCount: number,
    boardHistory: BoardState[],
    startTime: number
  ): number {
    this.nodesEvaluated++;
    
    // 定期检查时间，避免深度递归时失控
    if (this.nodesEvaluated % 128 === 0 && Date.now() - startTime > this.TIME_LIMIT) {
      throw new Error("Timeout");
    }

    const boardHash = this.getBoardHash(board);
    if (this.transpositionTable.has(boardHash)) {
      return this.transpositionTable.get(boardHash)!;
    }

    if (depth === 0) {
      const score = this.evaluator.evaluate(board, aiPlayer, moveCount);
      this.transpositionTable.set(boardHash, score);
      return score;
    }

    const opponent = aiPlayer === 'black' ? 'white' : 'black';
    const currentPlayer = isMaximizing ? aiPlayer : opponent;
    const moves = this.getOrderedMoves(board, currentPlayer, moveCount);

    let resultValue: number;
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
          [...boardHistory, board],
          startTime
        );
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break;
      }
      resultValue = maxEval === -Infinity ? this.evaluator.evaluate(board, aiPlayer, moveCount) : maxEval;
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
          [...boardHistory, board],
          startTime
        );
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) break;
      }
      resultValue = minEval === Infinity ? this.evaluator.evaluate(board, aiPlayer, moveCount) : minEval;
    }

    this.transpositionTable.set(boardHash, resultValue);
    return resultValue;
  }

  private getOrderedMoves(board: BoardState, player: Player, moveCount: number): Move[] {
    const moves: { r: number; c: number; player: Player; score: number }[] = [];
    const size = board.length;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (board[r][c] === null) {
          const score = this.evaluator.getQuickScore(r, c, moveCount);
          moves.push({ r, c, player, score });
        }
      }
    }
    return moves.sort((a, b) => b.score - a.score);
  }

  private determinePhase(moveCount: number): string {
    const total = this.boardSize * this.boardSize;
    if (moveCount < total * 0.1) return 'Opening';
    if (moveCount < total * 0.5) return 'Midgame';
    return 'Endgame';
  }
}
