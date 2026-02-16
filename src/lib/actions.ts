'use server';

import { aiGamePhaseStrategist } from '@/ai/flows/ai-game-phase-strategist';
import { aiGoMoveSuggester } from '@/ai/flows/ai-go-move-suggester-flow';
import type { Board, Move, Player } from '@/types';

export async function getAiMove(
  boardState: Board,
  playerTurn: Player,
  moveHistory: Move[],
  boardSize: number
) {
  try {
    // 1. Determine game phase
    const numberOfMoves = moveHistory.length;
    const occupiedSpaces = boardState.flat().filter((cell) => cell !== '_').length;
    const boardOccupationPercentage = (occupiedSpaces / (boardSize * boardSize)) * 100;

    const phaseResult = await aiGamePhaseStrategist({
      numberOfMoves,
      boardOccupationPercentage,
    });
    
    // 2. Get move suggestion
    const moveResult = await aiGoMoveSuggester({
      boardState,
      playerTurn,
      moveHistory,
      boardSize,
    });

    return {
      gamePhase: phaseResult.gamePhase,
      bestMove: moveResult.bestMove,
      explanation: moveResult.explanation,
    };
  } catch (error) {
    console.error('Error in getAiMove server action:', error);
    // In case of an AI error, we could return a default "pass" move or re-throw.
    // For now, we'll let the client handle the error.
    throw new Error('Failed to get AI move.');
  }
}
