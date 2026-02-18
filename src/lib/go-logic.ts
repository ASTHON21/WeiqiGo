import { BoardState, Player, Stone, ScoreDetails } from './types';

/**
 * 规则层 (GoLogic)
 * 职责：物理引擎与坐标转换。
 */
export const GoLogic = {
    // 基础规则引擎
    processMove: (board: BoardState, r: number, c: number, player: Player, boardHistory: BoardState[]) => {
        const size = board.length;
        if (board[r][c] !== null) return { success: false, error: 'occupied' };

        let newBoard = board.map(row => [...row]);
        newBoard[r][c] = player;

        // 提子逻辑
        const opponent = player === 'black' ? 'white' : 'black';
        let capturedCount = 0;
        const neighbors = [[r-1, c], [r+1, c], [r, c-1], [r, c+1]];

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

        // 自杀检查
        if (GoLogic.calculateLiberties(newBoard, r, c) === 0) {
            return { success: false, error: 'suicide' };
        }

        // 打劫检查 (简单历史对比)
        const boardStr = JSON.stringify(newBoard);
        if (boardHistory.some(h => JSON.stringify(h) === boardStr)) {
            return { success: false, error: 'ko' };
        }

        return { success: true, newBoard, capturedStones: capturedCount };
    },

    calculateLiberties: (board: BoardState, r: number, c: number): number => {
        const size = board.length;
        const player = board[r][c];
        const group = GoLogic.getGroup(board, r, c);
        const liberties = new Set<string>();

        group.forEach(([gr, gc]) => {
            [[gr-1, gc], [gr+1, gc], [gr, gc-1], [gr, gc+1]].forEach(([nr, nc]) => {
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
        const group: [number, number][] = [];
        const queue: [number, number][] = [[r, c]];
        const visited = new Set<string>([`${r},${c}`]);

        while (queue.length > 0) {
            const [currR, currC] = queue.shift()!;
            group.push([currR, currC]);
            [[currR-1, currC], [currR+1, currC], [currR, currC-1], [currR, currC+1]].forEach(([nr, nc]) => {
                if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === player && !visited.has(`${nr},${nc}`)) {
                    visited.add(`${nr},${nc}`);
                    queue.push([nr, nc]);
                }
            });
        }
        return group;
    },

    // 坐标转换
    sgfToCoord: (sgf: string) => ({
        r: sgf.charCodeAt(1) - 97,
        c: sgf.charCodeAt(0) - 97
    }),

    coordToSgf: (r: number, c: number) => 
        String.fromCharCode(c + 97) + String.fromCharCode(r + 97)
};

export const calculateScore = (board: BoardState): { winner: Player | 'draw'; blackScore: number; whiteScore: number; details: ScoreDetails } => {
    // 简化版中国规则结算
    const size = board.length;
    let blackStones = 0;
    let whiteStones = 0;
    board.forEach(row => row.forEach(s => {
        if (s === 'black') blackStones++;
        if (s === 'white') whiteStones++;
    }));
    
    const komi = 7.5;
    const blackScore = blackStones; 
    const whiteScore = whiteStones + komi;

    return {
        winner: blackScore > whiteScore ? 'black' : 'white',
        blackScore,
        whiteScore,
        details: { blackStones, whiteStones, blackTerritory: 0, whiteTerritory: 0, komi }
    };
};

export const processMove = GoLogic.processMove;
export const createEmptyBoard = (size: number): BoardState => Array(size).fill(null).map(() => Array(size).fill(null));
