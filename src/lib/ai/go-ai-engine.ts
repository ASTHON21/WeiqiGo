
import { BoardState, Player, Move } from '../types';
import { GoLogic } from '../go-logic';

/**
 * Shadow Go AI 引擎
 * 实现 Alpha-Beta 剪枝搜索与 FSM 状态逻辑
 */

export interface SearchNode {
  move: string;
  score: number;
  depth: number;
  children: SearchNode[];
}

export class GoAiEngine {
  private size: number;
  private maxDepth: number = 2;
  private nodesVisited: number = 0;

  constructor(size: number) {
    this.size = size;
  }

  /**
   * FSM 策略选择：根据当前步数决定权重
   */
  private getPhase(moveCount: number) {
    if (moveCount < (this.size * this.size) / 10) return 'fuseki';
    if (moveCount < (this.size * this.size) / 3) return 'chuban';
    return 'yose';
  }

  /**
   * 获取最佳落子
   */
  public findBestMove(board: BoardState, player: Player, moveHistory: Move[]): { r: number, c: number, evaluation: number, tree?: SearchNode } {
    this.nodesVisited = 0;
    const phase = this.getPhase(moveHistory.length);
    const candidates = this.getCandidateMoves(board, player, phase);
    
    let bestScore = player === 'black' ? -Infinity : Infinity;
    let bestMove = { r: -1, c: -1 };
    const tree: SearchNode = { move: 'root', score: 0, depth: 0, children: [] };

    for (const move of candidates) {
      const result = GoLogic.processMove(board, move.r, move.c, player, []);
      if (result.success) {
        const score = this.alphaBeta(result.newBoard, this.maxDepth - 1, -Infinity, Infinity, player === 'black' ? 'white' : 'black');
        
        const node: SearchNode = { 
          move: `${String.fromCharCode(move.c + 97)}${this.size - move.r}`, 
          score, 
          depth: 1, 
          children: [] 
        };
        tree.children.push(node);

        if (player === 'black') {
          if (score > bestScore) {
            bestScore = score;
            bestMove = move;
          }
        } else {
          if (score < bestScore) {
            bestScore = score;
            bestMove = move;
          }
        }
      }
    }

    // 如果没有合法落子，则弃权
    return { ...bestMove, evaluation: bestScore, tree };
  }

  private alphaBeta(board: BoardState, depth: number, alpha: number, beta: number, player: Player): number {
    this.nodesVisited++;
    if (depth === 0) return this.evaluate(board);

    const candidates = this.getCandidateMoves(board, player, 'standard');
    
    if (player === 'black') {
      let maxEval = -Infinity;
      for (const move of candidates) {
        const result = GoLogic.processMove(board, move.r, move.c, 'black', []);
        if (result.success) {
          const evalScore = this.alphaBeta(result.newBoard, depth - 1, alpha, beta, 'white');
          maxEval = Math.max(maxEval, evalScore);
          alpha = Math.max(alpha, evalScore);
          if (beta <= alpha) break;
        }
      }
      return maxEval === -Infinity ? this.evaluate(board) : maxEval;
    } else {
      let minEval = Infinity;
      for (const move of candidates) {
        const result = GoLogic.processMove(board, move.r, move.c, 'white', []);
        if (result.success) {
          const evalScore = this.alphaBeta(result.newBoard, depth - 1, alpha, beta, 'black');
          minEval = Math.min(minEval, evalScore);
          beta = Math.min(beta, evalScore);
          if (beta <= alpha) break;
        }
      }
      return minEval === Infinity ? this.evaluate(board) : minEval;
    }
  }

  /**
   * 启发式评估函数
   */
  private evaluate(board: BoardState): number {
    let score = 0;
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (board[r][c] === 'black') {
          score += 10; // 活子得分
          score += this.getLibertiesWeight(board, r, c); // 气数权重
        } else if (board[r][c] === 'white') {
          score -= 10;
          score -= this.getLibertiesWeight(board, r, c);
        }
      }
    }
    return score;
  }

  private getLibertiesWeight(board: BoardState, r: number, c: number): number {
    const liberties = GoLogic.calculateLiberties(board, r, c);
    return liberties * 2;
  }

  /**
   * 候选点筛选逻辑
   */
  private getCandidateMoves(board: BoardState, player: Player, phase: string): { r: number, c: number }[] {
    const candidates: { r: number, c: number }[] = [];
    
    // 基础筛选：只在已有棋子周围落子，或者布局阶段占据空角/空边
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (board[r][c] === null) {
          if (phase === 'fuseki') {
            // 布局优先占据星位
            if (this.isStarPoint(r, c)) {
              candidates.push({ r, c });
              continue;
            }
          }
          
          // 检查周围是否有子
          let hasNeighbor = false;
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const nr = r + dr, nc = c + dc;
              if (nr >= 0 && nr < this.size && nc >= 0 && nc < this.size && board[nr][nc] !== null) {
                hasNeighbor = true;
                break;
              }
            }
          }
          if (hasNeighbor || phase === 'fuseki') {
             candidates.push({ r, c });
          }
        }
      }
    }

    // 随机采样以减少搜索空间（提高性能）
    return candidates.sort(() => Math.random() - 0.5).slice(0, 15);
  }

  private isStarPoint(r: number, c: number): boolean {
    const stars = this.size === 19 ? [3, 9, 15] : this.size === 13 ? [3, 6, 9] : [2, 4, 6];
    return stars.includes(r) && stars.includes(c);
  }
}
