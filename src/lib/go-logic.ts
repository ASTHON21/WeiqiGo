// src/lib/go-logic.ts

import { BoardState, Player, ScoreDetails } from './types';
import { SgfProcessor } from './ai/sgf-processor';

/**
 * 规则层 (GoLogic)
 * 职责：处理围棋物理规则、提子、打劫判断及终局点目。
 */
export const GoLogic = {
    /**
     * 执行落子逻辑
     */
    processMove: (board: BoardState, r: number, c: number, player: Player, boardHistory: BoardState[]) => {
        const size = board.length;
        
        // 1. 基础校验
        if (board[r][c] !== null) return { success: false, error: 'occupied' };

        let newBoard = board.map(row => [...row]);
        newBoard[r][c] = player;

        // 2. 提子逻辑
        const opponent = player === 'black' ? 'white' : 'black';
        let capturedCount = 0;
        const neighbors = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];

        for (const [nr, nc] of neighbors) {
            if (nr >= 0 && nr < size && nc >= 0 && nc < size && newBoard[nr][nc] === opponent) {
                if (GoLogic.calculateLiberties(newBoard, nr, nc) === 0) {
                    const group = GoLogic.getGroup(newBoard, nr, nc);
                    group.forEach(([gr, gc]) => {
                        newBoard[gr][gc] = null;
                        capturedCount++;
                    });
                }
            }
        }

        // 3. 高级打劫检查 (Ko Rule)
        // 逻辑：禁止落子后局面回到对手落子前的状态（同形禁着）
        if (boardHistory && boardHistory.length > 0) {
            const lastBoard = boardHistory[boardHistory.length - 1];
            if (GoLogic.isSameBoard(newBoard, lastBoard)) {
                return { success: false, error: 'ko' };
            }
        }

        // 4. 自杀检查
        if (GoLogic.calculateLiberties(newBoard, r, c) === 0) {
            return { success: false, error: 'suicide' };
        }

        return { success: true, newBoard, capturedStones: capturedCount };
    },

    /**
     * 判断两个棋盘状态是否完全相同
     */
    isSameBoard: (boardA: BoardState, boardB: BoardState): boolean => {
        const size = boardA.length;
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (boardA[r][c] !== boardB[r][c]) return false;
            }
        }
        return true;
    },

    /**
     * 计算气数
     */
    calculateLiberties: (board: BoardState, r: number, c: number): number => {
        const size = board.length;
        const stone = board[r][c];
        if (!stone) return 0;

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

    /**
     * 获取相连的棋子集群 (BFS)
     */
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

    sgfToCoord: SgfProcessor.fromSgf,
    coordToSgf: SgfProcessor.toSgf
};

/**
 * 辅助：创建空棋盘
 */
export const createEmptyBoard = (size: number): BoardState =>
  Array(size)
    .fill(null)
    .map(() => Array(size).fill(null));

/**
 * 自动点目辅助：漫水填充
 */
function findEmptyArea(board: BoardState, r: number, c: number, globalVisited: Set<string>) {
    const size = board.length;
    const queue: [number, number][] = [[r, c]];
    const areaPoints: [number, number][] = [];
    const localVisited = new Set<string>([`${r},${c}`]);
    const borders = new Set<Player>();

    while (queue.length > 0) {
        const [currR, currC] = queue.shift()!;
        areaPoints.push([currR, currC]);
        globalVisited.add(`${currR},${currC}`);

        [[currR-1, currC], [currR+1, currC], [currR, currC-1], [currR, currC+1]].forEach(([nr, nc]) => {
            if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                const occupant = board[nr][nc];
                if (occupant === null) {
                    if (!localVisited.has(`${nr},${nc}`)) {
                        localVisited.add(`${nr},${nc}`);
                        queue.push([nr, nc]);
                    }
                } else {
                    borders.add(occupant);
                }
            }
        });
    }

    let owner: Player | null = null;
    if (borders.size === 1) {
        owner = borders.has('black') ? 'black' : 'white';
    }
    return { points: areaPoints.length, owner };
}

/**
 * 胜负点目计算
 */
export const calculateScore = (board: BoardState): { winner: Player | 'draw'; blackScore: number; whiteScore: number; details: ScoreDetails } => {
    const size = board.length;
    let blackStones = 0;
    let whiteStones = 0;
    let blackTerritory = 0;
    let whiteTerritory = 0;
    const visited = new Set<string>();

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (board[r][c] === 'black') blackStones++;
            else if (board[r][c] === 'white') whiteStones++;
            else if (!visited.has(`${r},${c}`)) {
                const area = findEmptyArea(board, r, c, visited);
                if (area.owner === 'black') blackTerritory += area.points;
                if (area.owner === 'white') whiteTerritory += area.points;
            }
        }
    }

    const komi = 7.5;
    const blackTotal = blackStones + blackTerritory;
    const whiteTotal = whiteStones + whiteTerritory + komi;

    return {
        winner: blackTotal > whiteTotal ? 'black' : (blackTotal < whiteTotal ? 'white' : 'draw'),
        blackScore: blackTotal,
        whiteScore: whiteTotal,
        details: { blackStones, whiteStones, blackTerritory, whiteTerritory, komi }
    };
};

export const processMove = GoLogic.processMove;
