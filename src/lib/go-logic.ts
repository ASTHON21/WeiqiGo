import type { BoardState, Player, ScoreDetails } from './types';

function getNeighbors(r: number, c: number, size: number): { r: number, c: number }[] {
    return [
        { r: r - 1, c }, { r: r + 1, c },
        { r, c: c - 1 }, { r, c: c + 1 }
    ].filter(p => p.r >= 0 && p.r < size && p.c >= 0 && p.c < size);
}

function findGroup(board: BoardState, startR: number, startC: number): { stones: { r: number, c: number }[], liberties: number } {
    const color = board[startR][startC];
    if (color === null) return { stones: [], liberties: 0 };

    const size = board.length;
    const stones: { r: number, c: number }[] = [];
    const libertySet = new Set<string>();
    const visited = new Set<string>();
    const stack = [{ r: startR, c: startC }];
    visited.add(`${startR},${startC}`);

    while (stack.length > 0) {
        const { r, c } = stack.pop()!;
        stones.push({ r, c });

        getNeighbors(r, c, size).forEach(n => {
            const neighborColor = board[n.r][n.c];
            const key = `${n.r},${n.c}`;
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
    r: number,
    c: number,
    player: Player,
    history: BoardState[] = []
): { success: boolean; newBoard: BoardState; capturedStones: number; error?: string } {
    const size = board.length;
    
    if (r < 0 || r >= size || c < 0 || c >= size) {
        return { success: false, newBoard: board, capturedStones: 0, error: 'out of bounds' };
    }
    if (board[r][c] !== null) {
        return { success: false, newBoard: board, capturedStones: 0, error: 'occupied' };
    }

    let newBoard = board.map(row => [...row]);
    newBoard[r][c] = player;

    const opponent: Player = player === 'black' ? 'white' : 'black';
    let totalCaptured = 0;
    
    // Check for captures
    getNeighbors(r, c, size).forEach(n => {
        if (newBoard[n.r][n.c] === opponent) {
            const group = findGroup(newBoard, n.r, n.c);
            if (group.liberties === 0) {
                totalCaptured += group.stones.length;
                group.stones.forEach(stone => {
                    newBoard[stone.r][stone.c] = null;
                });
            }
        }
    });

    // Check for suicide
    if (totalCaptured === 0) {
        const ownGroup = findGroup(newBoard, r, c);
        if (ownGroup.liberties === 0) {
            return { success: false, newBoard: board, capturedStones: 0, error: 'suicide' };
        }
    }

    // Ko rule check: check if the new board state has appeared in the history.
    for (const oldBoard of history) {
      if (isBoardEqual(newBoard, oldBoard)) {
        return { success: false, newBoard: board, capturedStones: 0, error: 'ko' };
      }
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

            const territory: {r: number, c: number}[] = [];
            const queue = [{r: r, c: c}];
            visited[r][c] = true;
            let touchesBlack = false;
            let touchesWhite = false;
            
            let head = 0;
            while(head < queue.length) {
                const { r: curR, c: curC } = queue[head++];
                territory.push({r: curR, c: curC});

                const neighbors = getNeighbors(curR, curC, size);
                for (const n of neighbors) {
                    if (board[n.r][n.c] === 'black') touchesBlack = true;
                    else if (board[n.r][n.c] === 'white') touchesWhite = true;
                    else if (!visited[n.r][n.c]) {
                        visited[n.r][n.c] = true;
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
