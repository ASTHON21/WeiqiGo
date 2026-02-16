import type { Board, Cell, Player, Move } from '@/types';

export const createEmptyBoard = (size: number): Board => {
  return Array(size).fill(null).map(() => Array(size).fill('_'));
};

const isOnBoard = (r: number, c: number, size: number) => {
  return r >= 0 && r < size && c >= 0 && c < size;
};

const getNeighbors = (r: number, c: number, size: number) => {
  return [
    [r - 1, c],
    [r + 1, c],
    [r, c - 1],
    [r, c + 1],
  ].filter(([nr, nc]) => isOnBoard(nr, nc, size));
};

// Finds all stones in a group and its liberties
const findGroup = (r: number, c: number, board: Board, player: Player): { stones: [number, number][], liberties: number } => {
  const size = board.length;
  const q: [number, number][] = [[r, c]];
  const visited = new Set<string>([`${r},${c}`]);
  const stones: [number, number][] = [];
  const libertySet = new Set<string>();

  while (q.length > 0) {
    const [curR, curC] = q.shift()!;
    stones.push([curR, curC]);

    for (const [nr, nc] of getNeighbors(curR, curC, size)) {
      if (board[nr][nc] === '_') {
        libertySet.add(`${nr},${nc}`);
      } else if (board[nr][nc] === player && !visited.has(`${nr},${nc}`)) {
        visited.add(`${nr},${nc}`);
        q.push([nr, nc]);
      }
    }
  }

  return { stones, liberties: libertySet.size };
};

export const placeStoneAndHandleCaptures = (board: Board, r: number, c: number, player: Player) => {
  const newBoard = board.map(row => [...row]);
  newBoard[r][c] = player;
  
  let newCapturedStones = 0;
  const opponent: Player = player === 'B' ? 'W' : 'B';

  for (const [nr, nc] of getNeighbors(r, c, board.length)) {
    if (newBoard[nr][nc] === opponent) {
      const { stones, liberties } = findGroup(nr, nc, newBoard, opponent);
      if (liberties === 0) {
        newCapturedStones += stones.length;
        for (const [sr, sc] of stones) {
          newBoard[sr][sc] = '_';
        }
      }
    }
  }

  return { newBoard, newCapturedStones };
};

// Simple Ko rule check: does this move revert the board to the previous state?
const isKo = (newBoard: Board, moveHistory: Move[], boardSize: number) => {
  if (moveHistory.length < 2) return false;
  
  const previousState = createEmptyBoard(boardSize);
  for (let i = 0; i < moveHistory.length - 1; i++) {
    const move = moveHistory[i];
    previousState[move.row][move.col] = move.player;
  }
  // This is a simplified check for captures on the previous turn. A more robust implementation would be needed.
  // For this app, we'll assume the AI avoids simple Ko.
  const { newBoard: boardBeforeLastMove } = placeStoneAndHandleCaptures(previousState, moveHistory[moveHistory.length - 1].row, moveHistory[moveHistory.length - 1].col, moveHistory[moveHistory.length - 1].player);

  return JSON.stringify(newBoard) === JSON.stringify(boardBeforeLastMove);
}

const isSuicide = (board: Board, r: number, c: number, player: Player): boolean => {
    const testBoard = board.map(row => [...row]);
    testBoard[r][c] = player;

    // Check if the move captures any opponent stones. If so, not suicide.
    const opponent: Player = player === 'B' ? 'W' : 'B';
    for (const [nr, nc] of getNeighbors(r, c, board.length)) {
        if (testBoard[nr][nc] === opponent) {
            const { liberties } = findGroup(nr, nc, testBoard, opponent);
            if (liberties === 0) {
                return false;
            }
        }
    }

    // If no opponent stones are captured, check if the placed stone's group has liberties.
    const { liberties } = findGroup(r, c, testBoard, player);
    return liberties === 0;
};


export const isValidMove = (board: Board, r: number, c: number, player: Player, moveHistory: Move[]): boolean => {
  // Is the spot on the board?
  if (!isOnBoard(r, c, board.length)) return false;

  // Is the spot empty?
  if (board[r][c] !== '_') return false;

  // Would this be a suicide move?
  if (isSuicide(board, r, c, player)) return false;
  
  // Create a temporary board to check for Ko
  const { newBoard } = placeStoneAndHandleCaptures(board, r, c, player);
  if (isKo(newBoard, moveHistory, board.length)) return false;
  
  return true;
};
