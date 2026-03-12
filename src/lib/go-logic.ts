import { BoardState, Player, Stone } from './types';
import { ChineseScoring } from './scoring/chinese-scoring';
import { JapaneseScoring } from './scoring/japanese-scoring';

/**
 * 围棋竞赛规则逻辑引擎
 * 核心任务：提供底层图形识别与状态推演，不干预顶层规则结算
 */
export const GoLogic = {
  /**
   * 获取四周相邻坐标的辅助函数 (上下左右)
   */
  getNeighbors: (r: number, c: number, size: number): [number, number][] => {
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    const neighbors: [number, number][] = [];
    for (const [dr, dc] of directions) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
        neighbors.push([nr, nc]);
      }
    }
    return neighbors;
  },

  /**
   * 基础落子逻辑（含提子、劫争与自杀检查）
   */
  processMove: (
    board: BoardState,
    r: number,
    c: number,
    player: Player,
    boardHistory: BoardState[] = []
  ): { success: boolean; newBoard: BoardState; capturedCount: number; error?: string } => {
    const size = board.length;
    
    // 1. Pass 停之一手
    if (r === -1 || c === -1) return { success: true, newBoard: board, capturedCount: 0 };
    
    // 2. 边界与落点占用检查
    if (r < 0 || r >= size || c < 0 || c >= size) return { success: false, error: 'out_of_bounds', newBoard: board, capturedCount: 0 };
    if (board[r][c] !== null) return { success: false, error: 'occupied', newBoard: board, capturedCount: 0 };

    // 创建新棋盘副本
    const newBoard = board.map(row => [...row]);
    newBoard[r][c] = player;

    const opponent: Player = player === 'black' ? 'white' : 'black';
    const capturedStones: [number, number][] = [];
    const neighbors = GoLogic.getNeighbors(r, c, size);

    // 3. 检查相邻的对手棋子是否被吃 (先提子)
    for (const [nr, nc] of neighbors) {
      if (newBoard[nr][nc] === opponent) {
        const { positions, liberties } = GoLogic.getGroupInfo(newBoard, nr, nc);
        if (liberties.size === 0) {
          // 对手气尽，执行提子
          positions.forEach(([gr, gc]) => {
            newBoard[gr][gc] = null;
            capturedStones.push([gr, gc]);
          });
        }
      }
    }

    // 4. 检查自身是否处于无气状态 (自杀禁手检查)
    const { liberties: selfLiberties } = GoLogic.getGroupInfo(newBoard, r, c);
    if (selfLiberties.size === 0) {
      return { success: false, error: 'suicide', newBoard: board, capturedCount: 0 };
    }

    // 5. 打劫判定 (全局同型再现检查 - Positional Superko)
    if (boardHistory.length > 0) {
      const isRepeat = boardHistory.some(prevBoard => GoLogic.isSameBoard(newBoard, prevBoard));
      if (isRepeat) return { success: false, error: 'ko', newBoard: board, capturedCount: 0 };
    }

    return { success: true, newBoard, capturedCount: capturedStones.length };
  },

  calculateChineseScore: (board: BoardState) => {
    return new ChineseScoring().calculate(board);
  },

  calculateJapaneseScore: (board: BoardState, blackPrisoners: number = 0, whitePrisoners: number = 0) => {
    return new JapaneseScoring().calculate(board, { black: blackPrisoners, white: whitePrisoners });
  },

  /**
   * 区域所有权探测器 (用于计算围空)
   * BFS 遍历一片连续的空地，并判断周围包裹它的棋子颜色
   */
  findEnclosedArea: (
    board: BoardState,
    r: number,
    c: number,
    globalVisited: Set<string>
  ): { points: [number, number][], owner: Player | 'seki' | null } => {
    const size = board.length;
    const queue: [number, number][] = [[r, c]];
    const points: [number, number][] = [];
    
    // localVisited 防止本次 BFS 内部死循环
    const localVisited = new Set<string>([`${r},${c}`]);
    const owners = new Set<Player>();

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) break;
      
      const [currR, currC] = current;
      points.push([currR, currC]);
      // 加入全局访问，避免外部重复扫描该空地
      globalVisited.add(`${currR},${currC}`);

      const neighbors = GoLogic.getNeighbors(currR, currC, size);
      
      for (const [nr, nc] of neighbors) {
        if (board[nr][nc] === null) {
          if (!localVisited.has(`${nr},${nc}`)) {
            localVisited.add(`${nr},${nc}`);
            queue.push([nr, nc]);
          }
        } else {
          // 碰到棋子，记录颜色
          owners.add(board[nr][nc] as Player);
        }
      }
    }

    // 判定逻辑：仅被一种颜色包围则为该方领土，被两种颜色包围则判定为双活/中立 (seki)
    let owner: Player | 'seki' | null = null;
    if (owners.size === 1) {
      owner = Array.from(owners)[0];
    } else if (owners.size > 1) {
      owner = 'seki';
    }

    return { points, owner };
  },

  /**
   * 获取一块棋的所有坐标及其气的集合 (核心性能优化：一次遍历全搞定)
   */
  getGroupInfo: (board: BoardState, r: number, c: number): { positions: [number, number][], liberties: Set<string> } => {
    const player = board[r][c];
    if (!player) return { positions: [], liberties: new Set() };

    const size = board.length;
    const positions: [number, number][] = [];
    const liberties = new Set<string>();
    
    const queue: [number, number][] = [[r, c]];
    const visited = new Set<string>([`${r},${c}`]);

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current) break;
      
      const [currR, currC] = current;
      positions.push([currR, currC]);

      const neighbors = GoLogic.getNeighbors(currR, currC, size);
      for (const [nr, nc] of neighbors) {
        if (board[nr][nc] === null) {
          liberties.add(`${nr},${nc}`); // 记录气
        } else if (board[nr][nc] === player && !visited.has(`${nr},${nc}`)) {
          visited.add(`${nr},${nc}`);
          queue.push([nr, nc]); // 相同颜色的子加入 BFS 队列
        }
      }
    }

    return { positions, liberties };
  },

  /**
   * 兼容旧版 API 的快捷方法
   */
  calculateLiberties: (board: BoardState, r: number, c: number): number => {
    return GoLogic.getGroupInfo(board, r, c).liberties.size;
  },

  /**
   * 兼容旧版 API 的快捷方法
   */
  getGroup: (board: BoardState, r: number, c: number): [number, number][] => {
    return GoLogic.getGroupInfo(board, r, c).positions;
  },

  /**
   * 辅助逻辑：清理死子
   * 注意：这只能清理物理上已经“0气”的死子。
   * 在真实围棋中，战略死子（有气但做不出两眼的死棋）需要 AI 识别或玩家手动标记。
   */
  removeDeadStones: (board: BoardState): BoardState => {
    const size = board.length;
    const internalBoard = board.map(row => [...row]);
    const visited = new Set<string>();

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (internalBoard[r][c] !== null && !visited.has(`${r},${c}`)) {
          const { positions, liberties } = GoLogic.getGroupInfo(internalBoard, r, c);
          
          positions.forEach(([gr, gc]) => visited.add(`${gr},${gc}`));

          // 如果该块棋已经没有气了，则移除（通常用于异常状态兜底）
          if (liberties.size === 0) {
            positions.forEach(([gr, gc]) => {
              internalBoard[gr][gc] = null;
            });
          }
        }
      }
    }
    return internalBoard;
  },

  getAllGroups: (board: BoardState): { positions: [number, number][], player: Player }[] => {
    const size = board.length;
    const visited = new Set<string>();
    const groups: { positions: [number, number][], player: Player }[] = [];

    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (board[r][c] !== null && !visited.has(`${r},${c}`)) {
          const { positions } = GoLogic.getGroupInfo(board, r, c);
          positions.forEach(([gr, gc]) => visited.add(`${gr},${gc}`));
          groups.push({ positions, player: board[r][c] as Player });
        }
      }
    }
    return groups;
  },

  isSameBoard: (boardA: BoardState, boardB: BoardState): boolean => {
    const size = boardA.length;
    if (boardB.length !== size) return false;
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (boardA[r][c] !== boardB[r][c]) return false;
      }
    }
    return true;
  },

  createEmptyBoard: (size: number): BoardState =>
    Array(size).fill(null).map(() => Array(size).fill(null))
};

export const createEmptyBoard = GoLogic.createEmptyBoard;
