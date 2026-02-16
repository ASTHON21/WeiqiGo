'use server';

import type { BoardState, Move, Player } from '@/lib/types';
import { findBestMove } from './ai-engine';

// This function is no longer called by the client but is kept for potential future use or server-side game logic.
export async function getAiMove(
  boardState: BoardState,
  playerTurn: Player,
  moveHistory: Move[],
  boardSize: number
) {
    try {
        const { bestMove, explanation, gamePhase } = findBestMove(
            boardState,
            playerTurn,
            moveHistory,
            boardSize
        );
        
        if (!bestMove) {
            return {
                success: false,
                error: "AI could not find a valid move.",
                debugLog: { error: "No best move returned from `findBestMove`." }
            };
        }

        return {
            success: true,
            bestMove: { r: bestMove.r, c: bestMove.c },
            explanation,
            gamePhase,
            debugLog: {
                phaseInput: {
                    gamePhase,
                    moveHistory: moveHistory.length,
                },
                phaseResult: {
                    gamePhase
                },
                moveInput: {
                    boardState,
                    playerTurn,
                    moveHistory,
                    boardSize,
                },
                moveResult: {
                    bestMove,
                    explanation,
                }
            }
        };

    } catch (e: any) {
        console.error('Error in getAiMove server action:', e);
        return { 
            success: false, 
            error: e.message || "An unexpected error occurred in the AI engine.",
            debugLog: {
                error: e.toString(),
            }
        };
    }
}
