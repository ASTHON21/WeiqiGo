"use server";

import { findBestMove } from '@/lib/ai-engine';
import { BoardState, Player, Move } from '@/lib/types';

/**
 * Server Action to calculate the best move for the AI.
 * This runs on the server (Node.js), allowing access to the file system (JSON dictionary).
 */
export async function getAiMoveAction(
    board: BoardState, 
    player: Player, 
    history: Move[], 
    boardSize: number, 
    boardHistory: BoardState[]
) {
    try {
        // ShadowEngine is instantiated inside this server context
        const result = findBestMove(board, player, history, boardSize, boardHistory);
        return result;
    } catch (error: any) {
        console.error("AI Server Action Error:", error);
        return {
            bestMove: null,
            explanation: "The AI encountered a server-side error.",
            gamePhase: "Unknown",
            debugLog: { error: error.message }
        };
    }
}
