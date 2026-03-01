
import { BoardState, Player, Move } from './types';
import { ChineseScoring } from './scoring/chinese-scoring';
import { JapaneseScoring } from './scoring/japanese-scoring';

/**
 * 围棋竞赛规则逻辑加固版
 * 修复了 Seki 判定、Dame 忽略以及死活启发式算法
 */
export const GoLogic = {
    processMove: (
        board: BoardState, 
        r: number, 
        c: number, 
        player: Player, 
        boardHistory: BoardState[] = []
    ) => {
        const size = board.length;
        if (r === -1 || c === -1) return { success: true, newBoard: board, capturedCount: 0 };
        if (board[r][c] !== null) return { success: false, error: 'occupied' };

        let newBoard = board.map(row => [...row]);
        newBoard[r][c] = player;

        const opponent = player === 'black' ? 'white' : 'black';
        let capturedStones: [number, number][] = [];
        const neighbors = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];

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

        if (GoLogic.calculateLiberties(newBoard, r, c) === 0) return { success: false, error: 'suicide' };

        // 性能优化版打劫检测
        if (boardHistory.length > 0) {
            const isRepeat = boardHistory.some(prevBoard => GoLogic.isSameBoard(newBoard, prevBoard));
            if (isRepeat) return { success: false, error: 'ko' };
        }

        return { success: true, newBoard, capturedCount: capturedStones.length };
    },

    calculateChineseScore: (board: BoardState) => {
        const strategy = new ChineseScoring();
        return strategy.calculate(board);
    },

    calculateJapaneseScore: (board: BoardState, blackPrisoners: number = 0, whitePrisoners: number = 0) => {
        const strategy = new JapaneseScoring();
        return strategy.calculate(board, { black: blackPrisoners, white: whitePrisoners });
    },

    /**
     * 死活判定启发式算法
     */
    removeDeadStones: (board: BoardState): BoardState => {
        const internalBoard = board.map(row => [...row]);
        const groups = GoLogic.getAllGroups(internalBoard);
        
        groups.forEach(group => {
            // 启发式判断：如果没有两只真眼且不处于双活状态，则在结算前移除
            if (!GoLogic.isGroupAliveHeuristic(internalBoard, group)) {
                group.positions.forEach(([r, c]) => {
                    internalBoard[r][c] = null;
                });
            }
        });
        return internalBoard;
    },

    isGroupAliveHeuristic: (board: BoardState, group: { positions: [number, number][], player: Player }) => {
        const [r, c] = group.positions[0];
        if (GoLogic.calculateLiberties(board, r, c) >= 4) return true; // 气数极多暂视为活
        if (GoLogic.countTrueEyes(board, group) >= 2) return true;
        return GoLogic.checkSekiSimple(board, group);
    },

    countTrueEyes: (board: BoardState, group: { positions: [number, number][], player: Player }) => {
        let trueEyes = 0;
        const size = board.length;
        const visited = new Set<string>();
        group.positions.forEach(([r, c]) => {
            [[r-1, c], [r+1, c], [r, c-1], [r, c+1]].forEach(([nr, nc]) => {
                if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === null && !visited.has(`${nr},${nc}`)) {
                    const { points, owner } = GoLogic.findEnclosedArea(board, nr, nc, visited);
                    if (owner === group.player && points.length <= 2) trueEyes++;
                }
            });
        });
        return trueEyes;
    },

    checkSekiSimple: (board: BoardState, group: { positions: [number, number][], player: Player }) => {
        const size = board.length;
        const visited = new Set<string>();
        let isSeki = false;
        group.positions.forEach(([r, c]) => {
            [[r-1, c], [r+1, c], [r, c-1], [r, c+1]].forEach(([nr, nc]) => {
                if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === null && !visited.has(`${nr},${nc}`)) {
                    const { owner } = GoLogic.findEnclosedArea(board, nr, nc, visited);
                    if (owner === 'seki') isSeki = true;
                }
            });
        });
        return isSeki;
    },

    findEnclosedArea: (board: BoardState, r: number, c: number, globalVisited: Set<string>) => {
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
        if (owners.size === 1) owner = Array.from(owners)[0];
        else if (owners.size > 1) owner = 'seki'; // 中性点/双活公气

        return { points, owner };
    },

    getAllGroups: (board: BoardState) => {
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

    calculateLiberties: (board: BoardState, r: number, c: number): number => {
        const group = GoLogic.getGroup(board, r, c);
        const liberties = new Set<string>();
        const size = board.length;
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
        const player = board[r][c];
        if (!player) return [];
        const size = board.length;
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
