
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
        if (r === -1 || c === -1) return { success: true, newBoard: board, capturedCount: 0 }; 
        if (r < 0 || r >= size || c < 0 || c >= size) return { success: false, error: 'out_of_bounds', newBoard: board, capturedCount: 0 };
        if (board[r][c] !== null) return { success: false, error: 'occupied', newBoard: board, capturedCount: 0 };

        // 2. 预落子
        let newBoard = board.map(row => [...row]);
        newBoard[r][c] = player;

        // 3. 检查并处理提子
        const opponent: Player = player === 'black' ? 'white' : 'black';
        let capturedStones: [number, number][] = [];
        const neighbors: [number, number][] = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];

        for (const [nr, nc] of neighbors) {
            if (nr >= 0 && nr < size && nc >= 0 && nc < size && newBoard[nr][nc] === opponent) {
                if (GoLogic.calculateLiberties(newBoard, nr, nc) === 0) {
                    const group = GoLogic.getGroup(newBoard, nr, nc);
                    group.forEach(([gr, gc]) => {
                        newBoard[gr][gc] = null;
                        capturedStones.push([gr, gc]);
                    });
                }
            }
        }

        // 4. 自杀检查
        if (GoLogic.calculateLiberties(newBoard, r, c) === 0) {
          return { success: false, error: 'suicide', newBoard: board, capturedCount: 0 };
        }

        // 5. 劫争规则 (Ko Rule)
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
     * 自动清理死子（竞赛结算专用启发式）
     */
    removeDeadStones: (board: BoardState): BoardState => {
        const internalBoard = board.map(row => [...row]);
        const groups = GoLogic.getAllGroups(internalBoard);
        
        // 移除被完全包围且气数为 0 的棋块
        groups.forEach(group => {
            const pos = group.positions[0];
            if (GoLogic.calculateLiberties(internalBoard, pos[0], pos[1]) === 0) {
                group.positions.forEach(([r, c]) => {
                    internalBoard[r][c] = null;
                });
            }
        });
        return internalBoard;
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
     * 寻找封闭区域并判定归属（数目法核心）
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
        if (owners.size === 1) {
            owner = Array.from(owners)[0];
        } else if (owners.size > 1) {
            // 被多种颜色棋子包围，属于双活（Seki）区域
            owner = 'seki';
        }

        return { points, owner };
    },

    createEmptyBoard: (size: number): BoardState =>
      Array(size).fill(null).map(() => Array(size).fill(null))
};

export const createEmptyBoard = GoLogic.createEmptyBoard;
