'use server';

import { aiGamePhaseStrategist } from '@/ai/flows/ai-game-phase-strategist';
import { aiGoMoveSuggester, type AiGoMoveSuggesterInput } from '@/ai/flows/ai-go-move-suggester-flow';
import type { BoardState, Move, Player } from '@/lib/types';

// Helper to convert game state for the AI
function convertBoardForAI(board: BoardState): AiGoMoveSuggesterInput['boardState'] {
  return board.map(row =>
    row.map(cell => {
      if (cell === 'black') return 'B';
      if (cell === 'white') return 'W';
      return '_';
    })
  );
}

function convertPlayerForAI(player: Player): 'B' | 'W' {
    return player === 'black' ? 'B' : 'W';
}

export async function getAiMove(
  boardState: BoardState,
  playerTurn: Player,
  moveHistory: Move[],
  boardSize: number
) {
  try {
    const convertedBoard = convertBoardForAI(boardState);
    const convertedPlayer = convertPlayerForAI(playerTurn);
    const convertedHistory = moveHistory.map(m => ({
        row: m.row,
        col: m.col,
        player: convertPlayerForAI(m.player)
    }));

    // 1. Determine game phase
    const numberOfMoves = moveHistory.length;
    const occupiedSpaces = boardState.flat().filter((cell) => cell !== null).length;
    const boardOccupationPercentage = (occupiedSpaces / (boardSize * boardSize)) * 100;

    const phasePromise = aiGamePhaseStrategist({
      numberOfMoves,
      boardOccupationPercentage,
    });
    
    // 2. Get move suggestion
    const movePromise = aiGoMoveSuggester({
      boardState: convertedBoard,
      playerTurn: convertedPlayer,
      moveHistory: convertedHistory,
      boardSize,
    });

    const [phaseResult, moveResult] = await Promise.all([phasePromise, movePromise]);

    return {
      success: true,
      gamePhase: phaseResult.gamePhase,
      bestMove: moveResult.bestMove,
      explanation: moveResult.explanation,
    };
  } catch (error) {
    console.error('Error in getAiMove server action:', error);
    // Let the client handle the error.
    return { success: false, error: 'Failed to get AI move.' };
  }
}
