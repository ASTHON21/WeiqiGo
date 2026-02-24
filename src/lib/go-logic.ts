import { BoardState, Player, Move } from './types';

/**
 * 中国围棋竞赛规则逻辑实现 (v2.0)
 */
export const GoLogic = {
    /**
     * 执行物理落子 (包含提子、禁着点校验、打劫校验)
     */
    processMove: (
        board: BoardState, 
        r: number, 
        c: number, 
        player: Player, 
        boardHistory: BoardState[] = []
    ) => {
        const size = board.length;
        
        // 处理弃权 (Pass)
        if (r === -1 || c === -1) {
            return { 
                success: true, 
                newBoard: board, 
                capturedCount: 0 
            };
        }

        if (board[r][c] !== null) return { success: false, error: 'occupied' };

        let newBoard = board.map(row => [...row]);
        newBoard[r][c] = player;

        const opponent = player === 'black' ? 'white' : 'black';
        let capturedStones: [number, number][] = [];
        const neighbors = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];

        // 1. 检查并移除对方无气的棋子 (提子优先级)
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

        // 2. 检查自杀 (禁着点 Rule 2.3)
        if (GoLogic.calculateLiberties(newBoard, r, c) === 0) {
            return { success: false, error: 'suicide' };
        }

        // 3. 打劫检查 (Ko Rule 3.1)
        if (boardHistory.length > 0) {
            const lastBoard = boardHistory[boardHistory.length - 1];
            if (GoLogic.isSameBoard(newBoard, lastBoard)) {
                return { success: false, error: 'ko' };
            }
        }

        return { 
            success: true, 
            newBoard, 
            capturedCount: capturedStones.length 
        };
    },

    /**
     * 中国规则数子法 (Rule 5.2)
     */
    calculateScore: (board: BoardState) => {
        const size = board.length;
        const KOMI = 3.75; // 黑棋贴 3.75 子
        
        let blackStones = 0;
        let whiteStones = 0;
        let visited = new Set<string>();
        
        // 1. 统计棋盘上的活子
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (board[r][c] === 'black') blackStones++;
                if (board[r][c] === 'white') whiteStones++;
            }
        }

        // 2. 统计归属领地
        let blackTerritory = 0;
        let whiteTerritory = 0;

        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                const key = `${r},${c}`;
                if (board[r][c] === null && !visited.has(key)) {
                    const { points, owner } = GoLogic.getAreaInfo(board, r, c, visited);
                    if (owner === 'black') blackTerritory += points.length;
                    if (owner === 'white') whiteTerritory += points.length;
                }
            }
        }

        const blackTotal = blackStones + blackTerritory;
        const whiteTotal = whiteStones + whiteTerritory;
        const diff = blackTotal - whiteTotal - (KOMI * 2); 
        const winner = diff > 0 ? 'black' : 'white';

        return {
            blackTotal,
            whiteTotal,
            komi: KOMI,
            winner,
            diff: Math.abs(diff) / 2
        };
    },

    getAreaInfo: (board: BoardState, r: number, c: number, globalVisited: Set<string>) => {
        const size = board.length;
        const queue: [number, number][] = [[r, c]];
        const points: [number, number][] = [];
        const localVisited = new Set<string>([`${r},${c}`]);
        const owners = new Set<Player>();

        while (queue.length > 0) {
            const [currR, currC] = queue.shift()!;
            points.push([currR, currC]);
            globalVisited.add(`${currR},${currC}`);

            [[currR - 1, currC], [currR + 1, currC], [currR, currC - 1], [currR, currC + 1]].forEach(([nr, nc]) => {
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
            owner = 'seki'; 
        }

        return { points, owner };
    },

    calculateLiberties: (board: BoardState, r: number, c: number): number => {
        const size = board.length;
        const group = GoLogic.getGroup(board, r, c);
        const liberties = new Set<string>();
        group.forEach(([gr, gc]) => {
            [[gr - 1, gc], [gr + 1, gc], [gr, gc - 1], [gr, gc + 1]].forEach(([nr, nc]) => {
                if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === null) {
                    liberties.add(`${nr},${nc}`);
                }
            });
        });
        return liberties.size;
    },

    getGroup: (board: BoardState, r: number, c: number): [number, number][] => {
        const size = board.length;
        const player = board[r][c];
        if (!player) return [];
        const group: [number, number][] = [];
        const queue: [number, number][] = [[r, c]];
        const visited = new Set<string>([`${r},${c}`]);
        while (queue.length > 0) {
            const [currR, currC] = queue.shift()!;
            group.push([currR, currC]);
            [[currR - 1, currC], [currR + 1, currC], [currR, currC - 1], [currR, currC + 1]].forEach(([nr, nc]) => {
                if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === player && !visited.has(`${nr},${nc}`)) {
                    visited.add(`${nr},${nc}`);
                    queue.push([nr, nc]);
                }
            });
        }
        return group;
    },

    isSameBoard: (boardA: BoardState, boardB: BoardState): boolean => {
        const size = boardA.length;
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