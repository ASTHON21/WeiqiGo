import type { BoardState, Player, Move } from './types';
// Note: Only import what is actually exported from go-logic
import { processMove, createEmptyBoard } from './go-logic';

/**
 * Core: Local AI Logic Engine
 * Uses Alpha-Beta pruning, runs entirely on the client, and does not consume API quotas.
 */

// --- 1. Simple Heuristic Evaluation Function ---
function evaluateBoard(board: BoardState, player: Player): number {
    const size = board.length;
    let playerScore = 0;
    let opponentScore = 0;
    const opponent: Player = player === 'black' ? 'white' : 'black';

    // Basic scoring: number of stones (reflects capture benefits as opponent's stones decrease)
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (board[r][c] === player) playerScore += 1;
            else if (board[r][c] === opponent) opponentScore += 1;
        }
    }

    // Komi
    if (player === 'white') playerScore += 6.5;
    else opponentScore += 6.5;

    return playerScore - opponentScore;
}

// Generate a list of legal moves
function generateMoves(board: BoardState, player: Player, history: BoardState[]): Move[] {
    const moves: Move[] = [];
    const size = board.length;

    // Performance optimization: prioritize searching empty points near existing stones
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (board[r][c] === null) {
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

// --- 2. Alpha-Beta Pruning Recursion ---
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

    if (maximizingPlayer) {
        let maxEval = -Infinity;
        for (const move of moves) {
            const { success, newBoard } = processMove(board, move.r, move.c, currentPlayer, history);
            if (!success) continue;
            const evalScore = alphaBeta(newBoard, [...history, board], depth - 1, alpha, beta, false, player);
            maxEval = Math.max(maxEval, evalScore);
            alpha = Math.max(alpha, evalScore);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const move of moves) {
            const { success, newBoard } = processMove(board, move.r, move.c, currentPlayer, history);
            if (!success) continue;
            const evalScore = alphaBeta(newBoard, [...history, board], depth - 1, alpha, beta, true, player);
            minEval = Math.min(minEval, evalScore);
            beta = Math.min(beta, evalScore);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

// --- 3. Main Interface for the Page to Call ---
export function findBestMove(
    board: BoardState,
    player: Player,
    moveHistory: Move[],
    boardSize: number
) {
    // For student projects, a depth of 2 is recommended to ensure response speed is under 500ms.
    // A depth of 3 will lag on a 19x19 board.
    const SEARCH_DEPTH = 2; 
    
    // Build board history for Ko detection
    const boardHistory: BoardState[] = [createEmptyBoard(boardSize)];
    let currentTempBoard = createEmptyBoard(boardSize);
    for (const m of moveHistory) {
        const res = processMove(currentTempBoard, m.r, m.c, m.player, boardHistory);
        if (res.success) {
            currentTempBoard = res.newBoard;
            boardHistory.push(res.newBoard);
        }
    }

    const possibleMoves = generateMoves(board, player, boardHistory);

    let bestMove: Move = { r: -1, c: -1, player };
    let bestValue = -Infinity;

    for (const move of possibleMoves) {
        if (move.r === -1) continue; // Temporarily prevent the AI from passing

        const { success, newBoard } = processMove(board, move.r, move.c, player, boardHistory);
        if (!success) continue;

        const boardValue = alphaBeta(newBoard, [...boardHistory, board], SEARCH_DEPTH - 1, -Infinity, Infinity, false, player);

        if (boardValue > bestValue) {
            bestValue = boardValue;
            bestMove = move;
        }
    }

    const moveCount = moveHistory.length;
    let gamePhase = "Fuseki";
    if (moveCount > boardSize * boardSize * 0.3) gamePhase = "Chuban";
    if (moveCount > boardSize * boardSize * 0.7) gamePhase = "Yose";

    return {
        bestMove,
        explanation: `Local AI analysis: Playing at (${bestMove.r}, ${bestMove.c}) is expected to yield an advantage of ${bestValue.toFixed(1)} points.`,
        gamePhase,
        debugLog: { nodes: possibleMoves.length, depth: SEARCH_DEPTH }
    };
}
