import { BoardState, Player, Move } from './types';

/**
 * 镜像校验逻辑 (GoLogic)
 */
export const GoLogic = {
    /**
     * 校验玩家落子是否与棋谱一致
     */
    validateMirrorMove: (userMove: {r: number, c: number}, expectedMove: Move): boolean => {
        return userMove.r === expectedMove.r && userMove.c === expectedMove.c;
    },

    /**
     * 执行物理落子 (包含提子)
     */
    processMove: (board: BoardState, r: number, c: number, player: Player) => {
        const size = board.length;
        if (board[r][c] !== null) return { success: false, error: 'occupied' };

        let newBoard = board.map(row => [...row]);
        newBoard[r][c] = player;

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

        return { success: true, newBoard, capturedStones: capturedCount };
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

    createEmptyBoard: (size: number): BoardState =>
      Array(size).fill(null).map(() => Array(size).fill(null))
};

export const createEmptyBoard = GoLogic.createEmptyBoard;
