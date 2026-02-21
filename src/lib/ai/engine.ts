import { BoardState, Player, Move } from '../types';
import { GoLogic } from '../go-logic';
import { BoardEvaluator } from './evaluator';
import { findSgfMatch } from './dictionary/index';

/**
 * 高级指挥层 (ShadowEngine)
 * 升级：迭代加深搜索 (Iterative Deepening) + 置换表 (Transposition Table)
 * 职责：在限定时间内通过多层探索寻找最优解。
 */
export class ShadowEngine {
  private evaluator: BoardEvaluator;
  private boardSize: number;
  private nodesEvaluated: number = 0;
  
  // 置换表：缓存已计算过的局面分值
  private transpositionTable = new Map<string, number>();
  
  // 搜索配置
  private readonly TIME_LIMIT = 4000; // 4秒限制
  private readonly MAX_DEPTH = 6;     // 最大深度

  constructor(boardSize: number) {
    this.boardSize = boardSize;
    this.evaluator = new BoardEvaluator(boardSize);
  }

  /**
   * 生成局面唯一哈希键 (用于置换表)
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
    
    // 1. --- 模块：本能响应 (SGF 字典) ---
    const sgfMatch = findSgfMatch(history, this.boardSize);
    if (sgfMatch) {
      return {
        bestMove: { r: sgfMatch.r, c: sgfMatch.c, player },
        explanation: `[本能匹配] ${sgfMatch.explanation}`,
        gamePhase: 'Opening',
        debugLog: { instinct: { status: "Hit", match: sgfMatch } }
      };
    }

    // 2. --- 模块：迭代加深搜索 ---
    const currentPhase = this.determinePhase(history.length);
    let bestMoveFound: Move | null = null;
    let finalDepth = 0;
    let bestValueFound = -Infinity;

    try {
      for (let depth = 1; depth <= this.MAX_DEPTH; depth++) {
        // 检查是否还有足够时间进行下一层搜索
        if (Date.now() - startTime > this.TIME_LIMIT * 0.8) break;

        const result = this.searchAtDepth(board, depth, player, boardHistory, startTime);
        if (result.move) {
          bestMoveFound = result.move;
          bestValueFound = result.value;
          finalDepth = depth;
        }
      }
    } catch (e) {
      console.log("[Engine] 搜索因时间耗尽强行中断。");
    }

    const elapsed = Date.now() - startTime;

    if (!bestMoveFound) {
      return { 
        bestMove: null, 
        explanation: "AI 认为当前局面已终了。", 
        gamePhase: currentPhase,
        debugLog: { status: "No moves" }
      };
    }

    return {
      bestMove: bestMoveFound,
      explanation: `[理性搜索] 深度 ${finalDepth} 层, 耗时 ${elapsed}ms, 评估分: ${bestValueFound.toFixed(1)}。`,
      gamePhase: currentPhase,
      debugLog: {
        rational: {
          nodes: this.nodesEvaluated,
          depth: finalDepth,
          time: elapsed,
          value: bestValueFound,
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
      // 每一手棋都检查时间
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
        [...boardHistory, result.newBoard],
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
    
    // 时间检查
    if (this.nodesEvaluated % 100 === 0 && Date.now() - startTime > this.TIME_LIMIT) {
      throw new Error("Timeout");
    }

    // 置换表查表
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
          [...boardHistory, result.newBoard],
          startTime
        );
        maxEval = Math.max(maxEval, evaluation);
        alpha = Math.max(alpha, evaluation);
        if (beta <= alpha) break;
      }
      resultValue = maxEval;
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
          [...boardHistory, result.newBoard],
          startTime
        );
        minEval = Math.min(minEval, evaluation);
        beta = Math.min(beta, evaluation);
        if (beta <= alpha) break;
      }
      resultValue = minEval;
    }

    this.transpositionTable.set(boardHash, resultValue);
    return resultValue;
  }

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
    // 启发式排序：优先探索高分落子点，极大提高剪枝效率
    return moves.sort((a, b) => b.score - a.score);
  }

  private determinePhase(moveCount: number): string {
    const total = this.boardSize * this.boardSize;
    if (moveCount < total * 0.15) return 'Fuseki';
    if (moveCount < total * 0.6) return 'Chuban';
    return 'Yose';
  }
}

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
