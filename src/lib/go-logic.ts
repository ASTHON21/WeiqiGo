import type { BoardState, Player, Move, ScoreDetails } from './types';

const KOMI = 6.5;

const isOnBoard = (row: number, col: number, size: number) => {
  return row >= 0 && row < size && col >= 0 && col < size;
};

const getNeighbors = (row: number, col: number, size: number) => {
  return [
    [row - 1, col],
    [row + 1, col],
    [row, col - 1],
    [row, col + 1],
  ].filter(([nr, nc]) => isOnBoard(nr, nc, size));
};

const findGroup = (row: number, col: number, board: BoardState, player: Player): { stones: [number, number][]; liberties: number } => {
  const size = board.length;
  const q: [number, number][] = [[row, col]];
  const visited = new Set<string>([`${row},${col}`]);
  const stones: [number, number][] = [];
  const libertySet = new Set<string>();

  while (q.length > 0) {
    const [curR, curC] = q.shift()!;
    stones.push([curR, curC]);

    for (const [nr, nc] of getNeighbors(curR, curC, size)) {
      if (board[nr][nc] === null) {
        libertySet.add(`${nr},${nc}`);
      } else if (board[nr][nc] === player && !visited.has(`${nr},${nc}`)) {
        visited.add(`${nr},${nc}`);
        q.push([nr, nc]);
      }
    }
  }

  return { stones, liberties: libertySet.size };
};

const isKoViolation = (board: BoardState, newBoard: BoardState, boardHistory: BoardState[]): boolean => {
    const newBoardString = JSON.stringify(newBoard);
    // Check only the immediate previous state for a simple Ko rule.
    if (boardHistory.length > 0) {
        const previousBoardString = JSON.stringify(boardHistory[boardHistory.length - 1]);
        if (previousBoardString === newBoardString) {
            return true;
        }
    }
    return false;
};


export const processMove = (
  board: BoardState,
  row: number,
  col: number,
  player: Player,
  boardHistory: BoardState[]
): { success: boolean; newBoard: BoardState; capturedStones: number; error?: 'occupied' | 'suicide' | 'ko' } => {
  const size = board.length;

  if (!isOnBoard(row, col, size) || board[row][col] !== null) {
    return { success: false, newBoard: board, capturedStones: 0, error: 'occupied' };
  }
  
  const tempBoard = board.map(r => [...r]);
  tempBoard[row][col] = player;
  
  let capturedStones = 0;
  const opponent: Player = player === 'black' ? 'white' : 'black';

  // Check for captures
  for (const [nr, nc] of getNeighbors(row, col, size)) {
    if (tempBoard[nr][nc] === opponent) {
      const { stones, liberties } = findGroup(nr, nc, tempBoard, opponent);
      if (liberties === 0) {
        capturedStones += stones.length;
        stones.forEach(([sr, sc]) => {
          tempBoard[sr][sc] = null;
        });
      }
    }
  }

  // Check for suicide
  const { liberties: selfLiberties } = findGroup(row, col, tempBoard, player);
  if (capturedStones === 0 && selfLiberties === 0) {
    return { success: false, newBoard: board, capturedStones: 0, error: 'suicide' };
  }
  
  // Check for Ko
  if (isKoViolation(board, tempBoard, boardHistory)) {
    return { success: false, newBoard: board, capturedStones: 0, error: 'ko' };
  }

  return { success: true, newBoard: tempBoard, capturedStones };
};


// A simplified scoring function based on territory and captured stones.
export const calculateScore = (board: BoardState): {
  winner: Player | 'draw';
  blackScore: number;
  whiteScore: number;
  details: ScoreDetails;
} => {
  let blackStones = 0;
  let whiteStones = 0;
  let blackTerritory = 0;
  let whiteTerritory = 0;
  
  const size = board.length;
  const territory: (Player | 'neutral' | null)[][] = Array(size).fill(null).map(() => Array(size).fill(null));

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (board[r][c] === 'black') {
        blackStones++;
      } else if (board[r][c] === 'white') {
        whiteStones++;
      } else if (territory[r][c] === null) {
        // Flood-fill to determine territory owner
        const q: [number, number][] = [[r, c]];
        const visited = new Set<string>([`${r},${c}`]);
        const area: [number, number][] = [];
        let touchesBlack = false;
        let touchesWhite = false;

        while (q.length > 0) {
          const [curR, curC] = q.shift()!;
          area.push([curR, curC]);

          for (const [nr, nc] of getNeighbors(curR, curC, size)) {
            const neighborStone = board[nr][nc];
            if (neighborStone === 'black') touchesBlack = true;
            else if (neighborStone === 'white') touchesWhite = true;
            else if (!visited.has(`${nr},${nc}`)) {
              visited.add(`${nr},${nc}`);
              q.push([nr, nc]);
            }
          }
        }
        
        let owner: Player | 'neutral' | null = null;
        if (touchesBlack && !touchesWhite) owner = 'black';
        else if (touchesWhite && !touchesBlack) owner = 'white';
        else owner = 'neutral';

        area.forEach(([ar, ac]) => {
          territory[ar][ac] = owner;
        });
      }
    }
  }

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (territory[r][c] === 'black') blackTerritory++;
      else if (territory[r][c] === 'white') whiteTerritory++;
    }
  }
  
  // Using Japanese scoring: territory + captures. The `captures` state from the UI isn't available here.
  // The UI should pass captures into this function for accurate scoring.
  // For now, we use territory + stones on board (Chinese style scoring) for simplicity.
  const blackScore = blackStones + blackTerritory;
  const whiteScore = whiteStones + whiteTerritory + KOMI;

  let winner: Player | 'draw' = 'draw';
  if (blackScore > whiteScore) {
    winner = 'black';
  } else if (whiteScore > blackScore) {
    winner = 'white';
  }

  return {
    winner,
    blackScore,
    whiteScore,
    details: {
      blackStones,
      whiteStones,
      blackTerritory,
      whiteTerritory,
      komi: KOMI
    }
  };
};
