'use client';
import type { BoardState, Player, Move } from './types';
import { processMove, createEmptyBoard } from './go-logic';

/**
 * 真眼识别逻辑：
 * 1. 该坐标必须为空。
 * 2. 上下左右四个邻点必须全是己方棋子（或是棋盘边界）。
 * 3. 对角线四个点中，至少有 3 个是己方棋子（边缘和角部要求更严）。
 */
function isTrueEye(board: BoardState, r: number, c: number, player: Player): boolean {
    const size = board.length;
    if (board[r][c] !== null) return false;

    // A. 检查上下左右（十字邻点）
    const neighbors = [
        { r: r - 1, c }, { r: r + 1, c }, { r, c: c - 1 }, { r, c: c + 1 }
    ];
    for (const n of neighbors) {
        if (n.r >= 0 && n.r < size && n.c >= 0 && n.c < size) {
            if (board[n.r][n.c] !== player) return false;
        }
        // 注意：边界在围棋中被视为“天然的保护”，所以超出边界不计入失败
    }

    // B. 检查对角线点
    const diagonals = [
        { r: r - 1, c: c - 1 }, { r: r - 1, c: c + 1 },
        { r: r + 1, c: c - 1 }, { r: r + 1, c: c + 1 }
    ];
    
    let ownDiagonals = 0;
    let edgeCount = 0;

    for (const d of diagonals) {
        if (d.r >= 0 && d.r < size && d.c >= 0 && d.c < size) {
            if (board[d.r][d.c] === player) ownDiagonals++;
        } else {
            edgeCount++;
        }
    }

    // 判断真眼的经典标准：
    // 在中腹：至少需要 3 个对角线是自己的棋子
    // 在边缘或角部：所有的对角线（存在的那些）都必须是自己的
    if (edgeCount === 0) {
        return ownDiagonals >= 3;
    } else {
        return ownDiagonals + edgeCount === 4;
    }
}


// ============ 1. MCTS Node Definition ============
export class MCTSNode {
  visits: number = 0;
  wins: number = 0;
  children: MCTSNode[] = [];
  parent: MCTSNode | null = null;
  move: Move | null;
  player: Player;
  untriedMoves: Move[] = [];
  board: BoardState;
  boardHistory: BoardState[];

  constructor(
    board: BoardState,
    boardHistory: BoardState[],
    move: Move | null,
    parent: MCTSNode | null = null,
    player: Player
  ) {
    this.board = board;
    this.boardHistory = boardHistory;
    this.move = move;
    this.parent = parent;
    this.player = player;
  }

  getUntriedMoves(): Move[] {
    if (this.untriedMoves.length === 0) {
      this.untriedMoves = this.generateAllMoves(this.board, this.player);
    }
    return this.untriedMoves;
  }
  
  private generateAllMoves(board: BoardState, player: Player): Move[] {
    const moves: Move[] = [];
    const size = board.length;
    const priorityMoves: Move[] = [];
    const normalMoves: Move[] = [];
    
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (board[r][c] === null) {
            const { success } = processMove(board, r, c, player, this.boardHistory);
            if (success) {
                let hasNeighbor = false;
                for (let dr = -1; dr <= 1; dr++) {
                    for (let dc = -1; dc <= 1; dc++) {
                        if (dr === 0 && dc === 0) continue;
                        const nr = r + dr, nc = c + dc;
                        if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] !== null) {
                            hasNeighbor = true;
                            break;
                        }
                    }
                    if(hasNeighbor) break;
                }
                
                const move = { r, c, player };
                if (hasNeighbor) {
                    priorityMoves.push(move);
                } else {
                    normalMoves.push(move);
                }
            }
        }
      }
    }
    
    const passMove = { r: -1, c: -1, player };
    return [...priorityMoves, ...normalMoves, passMove];
  }

  selectBestChild(explorationConstant: number = 1.414): MCTSNode {
      if (this.children.some(c => c.visits === 0)) {
          return this.children.find(c => c.visits === 0)!;
      }
      
      return this.children.reduce((best, child) => {
          const ucb1 = (child.wins / child.visits) + explorationConstant * Math.sqrt(Math.log(this.visits) / child.visits);
          const bestUcb1 = (best.wins / best.visits) + explorationConstant * Math.sqrt(Math.log(this.visits) / best.visits);
          return ucb1 > bestUcb1 ? child : best;
      });
  }
  
  addChild(move: Move, newBoard: BoardState, newHistory: BoardState[]): MCTSNode {
    const child = new MCTSNode(
        newBoard,
        newHistory,
        move, 
        this, 
        this.player === 'black' ? 'white' : 'black'
    );
    this.children.push(child);
    return child;
  }
  
  isFullyExpanded(): boolean {
    return this.getUntriedMoves().length === 0;
  }
  
  isTerminal(): boolean {
      if (this.boardHistory.length < 2) return false;
      const lastMove = this.parent?.move;
      const secondLastMove = this.parent?.parent?.move;
      return (lastMove?.r === -1 && secondLastMove?.r === -1);
  }
}

// ============ 2. MCTS Search Engine ============
export class MCTSEngine {
  private simulationsPerMove: number;
  private explorationConstant: number;
  
  constructor(config?: { simulations?: number; exploration?: number }) {
    this.simulationsPerMove = config?.simulations ?? 2000;
    this.explorationConstant = config?.exploration ?? 1.414;
  }
  
  async findBestMove(
    board: BoardState,
    player: Player,
    moveHistory: Move[],
    boardSize: number
  ): Promise<{ bestMove: Move; explanation: string; gamePhase: string; debugLog: any; }> {
    const startTime = Date.now();
    const root = await this.buildRootNode(player, moveHistory, boardSize);
    
    for (let sim = 0; sim < this.simulationsPerMove; sim++) {
      let node = this.select(root);
      if (!node.isTerminal()) {
        node = this.expand(node);
        const result = this.simulate(node);
        this.backpropagate(node, result);
      } else {
        const result = this.simulate(node);
        this.backpropagate(node, result);
      }
    }
    
    const bestChild = this.selectBestChild(root);
    const bestMove = bestChild.move ?? { r: -1, c: -1, player };
    const gamePhase = this.determineGamePhase(moveHistory.length, boardSize);
    const explanation = this.generateExplanation(bestChild, bestMove);
    
    const timeSpent = Date.now() - startTime;
    
    return {
      bestMove,
      explanation,
      gamePhase,
      debugLog: { simulations: this.simulationsPerMove, timeMs: timeSpent, bestVisits: bestChild.visits, bestWinrate: bestChild.visits > 0 ? (bestChild.wins / bestChild.visits * 100).toFixed(1) + '%' : 'N/A' }
    };
  }
  
  private select(node: MCTSNode): MCTSNode {
    while (!node.isTerminal()) {
        if (!node.isFullyExpanded()) {
            return node;
        }
        if (node.children.length === 0) {
            return node; // Should not happen if not terminal, but as a safeguard
        }
        node = node.selectBestChild(this.explorationConstant);
    }
    return node;
  }
  
  private expand(node: MCTSNode): MCTSNode {
    const untriedMoves = node.getUntriedMoves();
    if (untriedMoves.length === 0) return node;

    const move = untriedMoves.pop()!;
    const { success, newBoard } = processMove(node.board, move.r, move.c, move.player, node.boardHistory);
    
    if (success) {
      const newHistory = [...node.boardHistory, newBoard];
      return node.addChild(move, newBoard, newHistory);
    }
    
    return this.expand(node); 
  }
  
  private simulate(node: MCTSNode): number {
    let currentBoard = JSON.parse(JSON.stringify(node.board));
    let currentPlayer = node.player;
    let boardHistory = [...node.boardHistory];
    let consecutivePasses = 0;
    
    for (let step = 0; step < 80; step++) {
        const moves = this.generateRandomMoves(currentBoard, currentPlayer, boardHistory);
        if (moves.length === 0) {
            consecutivePasses++;
            if (consecutivePasses >= 2) break;
            currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
            boardHistory.push(currentBoard); // Pass move
            continue;
        }
        
        consecutivePasses = 0;
        const randomMove = moves[Math.floor(Math.random() * moves.length)];
        const { success, newBoard } = processMove(currentBoard, randomMove.r, randomMove.c, currentPlayer, boardHistory);
        
        if (success) {
            currentBoard = newBoard;
            boardHistory.push(newBoard);
            currentPlayer = currentPlayer === 'black' ? 'white' : 'black';
        }
    }
    
    const score = this.simpleEvaluate(currentBoard);
    
    if (node.parent?.player === 'white') {
        return score > 0 ? 1 : 0;
    } else {
        return score < 0 ? 1 : 0;
    }
  }

  private generateRandomMoves(board: BoardState, player: Player, history: BoardState[]): Move[] {
    const moves: Move[] = [];
    const size = board.length;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (board[r][c] === null) {
           const {success} = processMove(board, r, c, player, history);
           if(success) {
               if ((r === 0 || r === size-1 || c === 0 || c === size-1) && Math.random() > 0.3) continue;
               moves.push({ r, c, player });
           }
        }
      }
    }
    moves.push({r: -1, c: -1, player});
    return moves;
  }
  
  private simpleEvaluate(board: BoardState): number {
    let blackStones = 0;
    let whiteStones = 0;
    for (let r = 0; r < board.length; r++) {
      for (let c = 0; c < board.length; c++) {
        if (board[r][c] === 'black') blackStones++;
        if (board[r][c] === 'white') whiteStones++;
      }
    }
    return whiteStones - blackStones + 6.5; // Komi for white
  }
  
  private backpropagate(node: MCTSNode, result: number) {
    let tempNode: MCTSNode | null = node;
    while (tempNode !== null) {
      tempNode.visits++;
      if (tempNode.parent?.player !== node.player) {
          tempNode.wins += result;
      } else {
          tempNode.wins += (1-result);
      }
      tempNode = tempNode.parent;
    }
  }
  
  private async buildRootNode(player: Player, moveHistory: Move[], boardSize: number): Promise<MCTSNode> {
    let currentBoard = createEmptyBoard(boardSize);
    const boardHistory: BoardState[] = [currentBoard];
    
    for (const move of moveHistory) {
      const result = processMove(currentBoard, move.r, move.c, move.player, boardHistory);
      if (result.success) {
        currentBoard = result.newBoard;
        boardHistory.push(currentBoard);
      }
    }
    
    return new MCTSNode(currentBoard, boardHistory, null, null, player);
  }
  
  private selectBestChild(node: MCTSNode): MCTSNode {
    if (node.children.length === 0) {
      // This should ideally not be reached if the node is not terminal
      // As a fallback, maybe expand a move? For now, we'll just return the node.
      return node;
    }
    return node.children.reduce((best, child) => (child.visits > best.visits ? child : best));
  }
  
  private determineGamePhase(moveCount: number, boardSize: number): string {
    const totalMoves = boardSize * boardSize;
    if (moveCount < totalMoves * 0.25) return "Fuseki";
    if (moveCount < totalMoves * 0.7) return "Chuban";
    return "Yose";
  }
  
  private generateExplanation(node: MCTSNode, move: Move): string {
    if (node.visits === 0) return `🤖 AI 分析：落子于 (${move.r}, ${move.c}) 是一个未经充分探索的选择。`;
    const winrate = (node.wins / node.visits * 100).toFixed(1);
    return `🤖 AI 分析：落子于 (${move.r}, ${move.c})，模拟 ${node.visits} 次后，预计胜率 ${winrate}%。`;
  }
}

export async function findBestMove(
  board: BoardState,
  player: Player,
  moveHistory: Move[],
  boardSize: number
): Promise<{ bestMove: Move; explanation: string; gamePhase: string; debugLog: any; }> {
  const engine = new MCTSEngine({ simulations: 2000 });
  return engine.findBestMove(board, player, moveHistory, boardSize);
}
