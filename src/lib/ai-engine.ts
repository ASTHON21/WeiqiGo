import type { BoardState, Player, Move } from './types';
import { processMove, createEmptyBoard, findGroup, getNeighbors } from './go-logic';

// --- 1. Heuristic Evaluation Function ---
function evaluateBoard(board: BoardState, player: Player): number {
    const size = board.length;
    let score = 0;
    const opponent: Player = player === 'black' ? 'white' : 'black';

    let playerScore = 0;
    let opponentScore = 0;

    const visited = Array(size).fill(false).map(() => Array(size).fill(false));

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            const stone = board[r][c];
            if (stone === player) {
                playerScore += 1; // Stone count
                const group = findGroup(board, r, c);
                playerScore += group.liberties * 0.5; // Liberty score
            } else if (stone === opponent) {
                opponentScore += 1;
                const group = findGroup(board, r, c);
                opponentScore += group.liberties * 0.5;
            } else if (!visited[r][c]) {
                // Territory calculation
                const territory: { r: number, c: number }[] = [];
                const queue = [{ r: r, c: c }];
                visited[r][c] = true;
                let touchesPlayer = false;
                let touchesOpponent = false;
                
                let head = 0;
                while(head < queue.length) {
                    const { r: curR, c: curC } = queue[head++];
                    territory.push({ r: curR, c: curC });

                    const neighbors = getNeighbors(curR, curC, size);
                    for (const n of neighbors) {
                        if (board[n.r][n.c] === player) touchesPlayer = true;
                        else if (board[n.r][n.c] === opponent) touchesOpponent = true;
                        else if (!visited[n.r][n.c]) {
                            visited[n.r][n.c] = true;
                            queue.push(n);
                        }
                    }
                }

                if (touchesPlayer && !touchesOpponent) {
                    playerScore += territory.length;
                } else if (!touchesPlayer && touchesOpponent) {
                    opponentScore += territory.length;
                }
            }
        }
    }

    // Add Komi for white
    if (player === 'white') {
        playerScore += 6.5;
    } else {
        opponentScore += 6.5;
    }

    score = playerScore - opponentScore;
    return score;
}


function generateMoves(board: BoardState, player: Player, history: BoardState[]): Move[] {
    const moves: Move[] = [];
    const size = board.length;
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (board[r][c] === null) {
                // Check if the move is valid before adding
                const result = processMove(board, r, c, player, history);
                if (result.success) {
                    moves.push({ r, c, player });
                }
            }
        }
    }
    // Add pass move
    moves.push({ r: -1, c: -1, player });
    return moves;
}

// --- 2. Alpha-Beta Pruning ---
function alphaBeta(
    board: BoardState,
    history: BoardState[],
    depth: number,
    alpha: number,
    beta: number,
    maximizingPlayer: boolean,
    player: Player
): number {
    if (depth === 0) {
        return evaluateBoard(board, player);
    }

    const opponent: Player = player === 'black' ? 'white' : 'black';
    const currentPlayer = maximizingPlayer ? player : opponent;
    const moves = generateMoves(board, currentPlayer, history);
    
    // Simple move ordering: try captures first (not implemented, but good for future)
    // and then center moves. For now, just reverse to try center-ish moves first.
    moves.reverse();


    if (maximizingPlayer) {
        let maxEval = -Infinity;
        for (const move of moves) {
            const { success, newBoard } = processMove(board, move.r, move.c, currentPlayer, history);
            if (!success) continue;

            const newHistory = [...history, board];
            const evaluation = alphaBeta(newBoard, newHistory, depth - 1, alpha, beta, false, player);
            maxEval = Math.max(maxEval, evaluation);
            alpha = Math.max(alpha, evaluation);
            if (beta <= alpha) {
                break; // Beta cutoff
            }
        }
        return maxEval;
    } else { // Minimizing player
        let minEval = Infinity;
        for (const move of moves) {
             const { success, newBoard } = processMove(board, move.r, move.c, currentPlayer, history);
            if (!success) continue;
            
            const newHistory = [...history, board];
            const evaluation = alphaBeta(newBoard, newHistory, depth - 1, alpha, beta, true, player);
            minEval = Math.min(minEval, evaluation);
            beta = Math.min(beta, evaluation);
            if (beta <= alpha) {
                break; // Alpha cutoff
            }
        }
        return minEval;
    }
}


// --- 3. Main Exported Function ---
export function findBestMove(
    board: BoardState,
    player: Player,
    moveHistory: Move[],
    boardSize: number
): { bestMove: Move | null, explanation: string, gamePhase: string } {
    const SEARCH_DEPTH = 3;
    
    const boardHistory: BoardState[] = [createEmptyBoard(boardSize)];
    let currentBoard = createEmptyBoard(boardSize);
    for(const move of moveHistory) {
      const result = processMove(currentBoard, move.r, move.c, move.player, boardHistory);
      if (result.success) {
        currentBoard = result.newBoard;
        boardHistory.push(result.newBoard);
      }
    }

    const possibleMoves = generateMoves(currentBoard, player, boardHistory);

    if (possibleMoves.length === 0) {
        return { bestMove: { r: -1, c: -1, player }, explanation: "No valid moves found, passing.", gamePhase: "Yose" };
    }

    let bestMove: Move = possibleMoves[0];
    let bestValue = -Infinity;

    for (const move of possibleMoves) {
        const { success, newBoard } = processMove(currentBoard, move.r, move.c, player, boardHistory);
        if (!success) continue;

        const newHistory = [...boardHistory, newBoard];
        // The opponent will be minimizing our score, so the next call is for the minimizing player (false).
        const boardValue = alphaBeta(newBoard, newHistory, SEARCH_DEPTH - 1, -Infinity, Infinity, false, player);

        if (boardValue > bestValue) {
            bestValue = boardValue;
            bestMove = move;
        }
    }
    
    const moveCount = moveHistory.length;
    let gamePhase = "Fuseki";
    if (moveCount > boardSize * boardSize * 0.3) gamePhase = "Chuban";
    if (moveCount > boardSize * boardSize * 0.7) gamePhase = "Yose";

    const explanation = bestMove.r === -1 
        ? `Passing is the best option with a heuristic value of ${bestValue.toFixed(2)}.`
        : `After searching ${possibleMoves.length} moves, the best option seems to be at (${bestMove.r}, ${bestMove.c}). It has a heuristic value of ${bestValue.toFixed(2)}.`;

    return { 
        bestMove,
        explanation,
        gamePhase,
    };
}
