
import { BoardState, Player, Stone } from './types';
import { ChineseScoring } from './scoring/chinese-scoring';
import { JapaneseScoring } from './scoring/japanese-scoring';

/**
 * 围棋竞赛规则逻辑引擎
 * 包含：落子校验、提子逻辑、自杀检查、劫争规则 (Ko Rule)
 */
export const GoLogic = {
    /**
     * 处理一次落子动作
     * @param board 当前棋盘
     * @param r 行
     * @param c 列
     * @param player 玩家颜色
     * @param boardHistory 棋盘历史快照数组（用于劫争校验）
     */
    processMove: (
        board: BoardState, 
        r: number, 
        c: number, 
        player: Player, 
        boardHistory: BoardState[] = []
    ): { success: boolean; newBoard: BoardState; capturedCount: number; error?: string } => {
        const size = board.length;
        
        // 1. 基础合法性校验
        if (r === -1 || c === -1) return { success: true, newBoard: board, capturedCount: 0 }; // 弃权不涉及规则检查
        if (r < 0 || r >= size || c < 0 || c >= size) return { success: false, error: 'out_of_bounds', newBoard: board, capturedCount: 0 };
        if (board[r][c] !== null) return { success: false, error: 'occupied', newBoard: board, capturedCount: 0 };

        // 2. 预落子
        let newBoard = board.map(row => [...row]);
        newBoard[r][c] = player;

        // 3. 检查并处理提子 (提掉对方)
        const opponent: Player = player === 'black' ? 'white' : 'black';
        let capturedStones: [number, number][] = [];
        const neighbors: [number, number][] = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];

        for (const [nr, nc] of neighbors) {
            if (nr >= 0 && nr < size && nc >= 0 && nc < size && newBoard[nr][nc] === opponent) {
                // 如果对方这块棋没气了，则提掉
                if (GoLogic.calculateLiberties(newBoard, nr, nc) === 0) {
                    const group = GoLogic.getGroup(newBoard, nr, nc);
                    group.forEach(([gr, gc]) => {
                        newBoard[gr][gc] = null;
                        capturedStones.push([gr, gc]);
                    });
                }
            }
        }

        // 4. 自杀检查 (落子后己方必须有气，除非刚才提掉了对方)
        if (GoLogic.calculateLiberties(newBoard, r, c) === 0) {
          return { success: false, error: 'suicide', newBoard: board, capturedCount: 0 };
        }

        // 5. 劫争规则 (Ko Rule / 同型禁重)
        // 核心：新生成的盘面状态不能与该对局之前的状态重复
        if (boardHistory.length > 0) {
            const isRepeat = boardHistory.some(prevBoard => GoLogic.isSameBoard(newBoard, prevBoard));
            if (isRepeat) return { success: false, error: 'ko', newBoard: board, capturedCount: 0 };
        }

        return { success: true, newBoard, capturedCount: capturedStones.length };
    },

    /**
     * 计算中国规则分数 (子空皆地)
     */
    calculateChineseScore: (board: BoardState) => {
        const strategy = new ChineseScoring();
        return strategy.calculate(board);
    },

    /**
     * 计算日韩规则分数 (数目法)
     */
    calculateJapaneseScore: (board: BoardState, blackPrisoners: number = 0, whitePrisoners: number = 0) => {
        const strategy = new JapaneseScoring();
        return strategy.calculate(board, { black: blackPrisoners, white: whitePrisoners });
    },

    /**
     * 自动清理死子（启发式）
     */
    removeDeadStones: (board: BoardState): BoardState => {
        const internalBoard = board.map(row => [...row]);
        const groups = GoLogic.getAllGroups(internalBoard);
        
        groups.forEach(group => {
            if (!GoLogic.isGroupAliveHeuristic(internalBoard, group)) {
                group.positions.forEach(([r, c]) => {
                    internalBoard[r][c] = null;
                });
            }
        });
        return internalBoard;
    },

    /**
     * 辅助逻辑：判断两个盘面是否完全一致
     */
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

    /**
     * 辅助逻辑：获取某位置棋块的气数
     */
    calculateLiberties: (board: BoardState, r: number, c: number): number => {
        const group = GoLogic.getGroup(board, r, c);
        if (group.length === 0) return 0;
        
        const liberties = new Set<string>();
        const size = board.length;
        group.forEach(([gr, gc]) => {
            const neighbors: [number, number][] = [[gr - 1, gc], [gr + 1, gc], [gr, gc - 1], [gr, gc + 1]];
            neighbors.forEach(([nr, nc]) => {
                if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === null) {
                    liberties.add(`${nr},${nc}`);
                }
            });
        });
        return liberties.size;
    },

    /**
     * 辅助逻辑：获取相连的同色棋子块
     */
    getGroup: (board: BoardState, r: number, c: number): [number, number][] => {
        const player = board[r][c];
        if (!player) return [];
        const size = board.length;
        const group: [number, number][] = [];
        const queue: [number, number][] = [[r, c]];
        const visited = new Set<string>([`${r},${c}`]);
        while (queue.length > 0) {
            const current = queue.shift();
            if (!current) break;
            const [currR, currC] = current;
            group.push([currR, currC]);
            const neighbors: [number, number][] = [[currR - 1, currC], [currR + 1, currC], [currR, currC - 1], [currR, currC + 1]];
            neighbors.forEach(([nr, nc]) => {
                if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === player && !visited.has(`${nr},${nc}`)) {
                    visited.add(`${nr},${nc}`);
                    queue.push([nr, nc]);
                }
            });
        }
        return group;
    },

    /**
     * 获取所有棋块
     */
    getAllGroups: (board: BoardState): { positions: [number, number][], player: Player }[] => {
        const size = board.length;
        const visited = new Set<string>();
        const groups: { positions: [number, number][], player: Player }[] = [];
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (board[r][c] !== null && !visited.has(`${r},${c}`)) {
                    const groupPositions = GoLogic.getGroup(board, r, c);
                    groupPositions.forEach(([gr, gc]) => visited.add(`${gr},${gc}`));
                    groups.push({ positions: groupPositions, player: board[r][c] as Player });
                }
            }
        }
        return groups;
    },

    /**
     * 寻找封闭区域 (用于数子/数目)
     */
    findEnclosedArea: (board: BoardState, r: number, c: number, globalVisited: Set<string>): { points: [number, number][], owner: Player | 'seki' | null } => {
        const size = board.length;
        const queue: [number, number][] = [[r, c]];
        const points: [number, number][] = [];
        const localVisited = new Set<string>([`${r},${c}`]);
        const owners = new Set<Player>();

        while (queue.length > 0) {
            const current = queue.shift();
            if (!current) break;
            const [currR, currC] = current;
            points.push([currR, currC]);
            globalVisited.add(`${currR},${currC}`);

            const neighbors: [number, number][] = [[currR - 1, currC], [currR + 1, currC], [currR, currC - 1], [currR, currC + 1]];
            neighbors.forEach(([nr, nc]) => {
                if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                    if (board[nr][nc] === null) {
                        if (!localVisited.has(`${nr},${nc}`)) {
                            localVisited.add(`${nr},${nc}`);
                            queue.push([nr, nc]);
                        }
                    } else {
                        owners.add(board[nr][nc] as Player);
                    }
                }
            });
        }

        let owner: Player | 'seki' | null = null;
        if (owners.size === 1) owner = Array.from(owners)[0];
        else if (owners.size > 1) owner = 'seki';

        return { points, owner };
    },

    /**
     * 启发式存活判定
     */
    isGroupAliveHeuristic: (board: BoardState, group: { positions: [number, number][], player: Player }): boolean => {
        const firstPos = group.positions[0];
        if (!firstPos) return false;
        // 如果气 >= 4，初步判定为活块（简化逻辑，用于数子）
        if (GoLogic.calculateLiberties(board, firstPos[0], firstPos[1]) >= 4) return true;
        // 实际比赛中由棋手确认，这里作为自动数子的预处理
        return true; 
    },

    createEmptyBoard: (size: number): BoardState =>
      Array(size).fill(null).map(() => Array(size).fill(null))
};

export const createEmptyBoard = GoLogic.createEmptyBoard;
