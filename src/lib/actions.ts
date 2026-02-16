'use server';

import type { BoardState, Move, Player } from '@/lib/types';

export async function getAiMove(
  boardState: BoardState,
  playerTurn: Player,
  moveHistory: Move[],
  boardSize: number
) {
    const errorMsg = 'AI functionality has been removed.';
    console.error('Error in getAiMove server action:', errorMsg);
    return { 
      success: false, 
      error: errorMsg,
      debugLog: {
        error: errorMsg
      }
    };
}
