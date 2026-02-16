import type { BoardState, Player, ScoreDetails } from './types';

function getNeighbors(row: number, col: number, size: number): { row: number, col: number }[] {
    return [
        { row: row - 1, col }, { row: row + 1, col },
        { row, col: col - 1 }, { row, col: col + 1 }
    ].filter(p => p.row >= 0 && p.row < size && p.col >= 0 && p.col < size);
}

function findGroup(board: BoardState, startRow: number, startCol: number): { stones: { row: number, col: number }[], liberties: number } {
    const color = board[startRow][startCol];
    if (color === null) return { stones: [], liberties: 0 };

    const size = board.length;
    const stones: { row: number, col: number }[] = [];
    const libertySet = new Set<string>();
    const visited = new Set<string>();
    const stack = [{ row: startRow, col: startCol }];
    visited.add(`${startRow},${startCol}`);

    while (stack.length > 0) {
        const { row, col } = stack.pop()!;
        stones.push({ row, col });

        getNeighbors(row, col, size).forEach(n => {
            const neighborColor = board[n.row][n.col];
            const key = `${n.row},${n.col}`;
            if (neighborColor === null) {
                libertySet.add(key);
            } else if (neighborColor === color && !visited.has(key)) {
                visited.add(key);
                stack.push(n);
            }
        });
    }
    return { stones, liberties: libertySet.size };
}


function isBoardEqual(b1: BoardState, b2: BoardState): boolean {
    if (!b1 || !b2 || b1.length !== b2.length) return false;
    for (let r = 0; r < b1.length; r++) {
        if (b1[r].length !== b2[r].length) return false;
        for (let c = 0; c < b1[r].length; c++) {
            if (b1[r][c] !== b2[r][c]) return false;
        }
    }
    return true;
}

export function createEmptyBoard(size: number): BoardState {
    return Array.from({ length: size }, () => Array(size).fill(null));
}

export function processMove(
    board: BoardState,
    row: number,
    col: number,
    player: Player,
    history: BoardState[] = []
): { success: boolean; newBoard: BoardState; capturedStones: number; error?: string } {
    const size = board.length;
    
    if (row < 0 || row >= size || col < 0 || col >= size) {
        return { success: false, newBoard: board, capturedStones: 0, error: 'out of bounds' };
    }
    if (board[row][col] !== null) {
        return { success: false, newBoard: board, capturedStones: 0, error: 'occupied' };
    }

    let newBoard = board.map(r => [...r]);
    newBoard[row][col] = player;

    const opponent: Player = player === 'black' ? 'white' : 'black';
    let totalCaptured = 0;
    
    // Check for captures
    getNeighbors(row, col, size).forEach(n => {
        if (newBoard[n.row][n.col] === opponent) {
            const group = findGroup(newBoard, n.row, n.col);
            if (group.liberties === 0) {
                totalCaptured += group.stones.length;
                group.stones.forEach(stone => {
                    newBoard[stone.row][stone.col] = null;
                });
            }
        }
    });

    // Check for suicide
    if (totalCaptured === 0) {
        const ownGroup = findGroup(newBoard, row, col);
        if (ownGroup.liberties === 0) {
            return { success: false, newBoard: board, capturedStones: 0, error: 'suicide' };
        }
    }

    // Simple Ko rule check: cannot repeat the board state from two moves ago.
    const prevBoardState = history.length > 1 ? history[history.length - 2] : null;
    if (prevBoardState && isBoardEqual(newBoard, prevBoardState)) {
         return { success: false, newBoard: board, capturedStones: 0, error: 'ko' };
    }
    
    return { success: true, newBoard, capturedStones: totalCaptured };
}

export function calculateScore(board: BoardState): { winner: Player | 'draw', blackScore: number, whiteScore: number, details: ScoreDetails } {
    const size = board.length;
    let blackStones = 0;
    let whiteStones = 0;
    let blackTerritory = 0;
    let whiteTerritory = 0;
    const komi = 6.5;

    const visited = Array(size).fill(false).map(() => Array(size).fill(false));

    for(let r=0; r<size; r++) {
        for(let c=0; c<size; c++) {
            const stone = board[r][c];
            if (stone === 'black') blackStones++;
            if (stone === 'white') whiteStones++;

            if (visited[r][c] || stone !== null) continue;

            const territory: {row: number, col: number}[] = [];
            const queue = [{row: r, col: c}];
            visited[r][c] = true;
            let touchesBlack = false;
            let touchesWhite = false;
            
            let head = 0;
            while(head < queue.length) {
                const { row, col } = queue[head++];
                territory.push({row, col});

                const neighbors = getNeighbors(row, col, size);
                for (const n of neighbors) {
                    if (board[n.row][n.col] === 'black') touchesBlack = true;
                    else if (board[n.row][n.col] === 'white') touchesWhite = true;
                    else if (!visited[n.row][n.col]) {
                        visited[n.row][n.col] = true;
                        queue.push(n);
                    }
                }
            }

            if(touchesBlack && !touchesWhite) {
                blackTerritory += territory.length;
            } else if (!touchesBlack && touchesWhite) {
                whiteTerritory += territory.length;
            }
        }
    }
    
    const blackScore = blackStones + blackTerritory;
    const whiteScore = whiteStones + whiteTerritory + komi;
    
    const winner = blackScore > whiteScore ? 'black' : (whiteScore > blackScore ? 'white' : 'draw');
    
    return { 
        winner, 
        blackScore, 
        whiteScore, 
        details: {
            blackStones,
            whiteStones,
            blackTerritory,
            whiteTerritory,
            komi,
        }
    };
}
