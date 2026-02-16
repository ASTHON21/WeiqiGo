'use server';
/**
 * @fileOverview A Genkit flow for an AI Go opponent that suggests optimal moves.
 *
 * - aiGoMoveSuggester - A function that suggests the best Go move based on the current board state.
 * - AiGoMoveSuggesterInput - The input type for the aiGoMoveSuggester function.
 * - AiGoMoveSuggesterOutput - The return type for the aiGoMoveSuggester function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AiGoMoveSuggesterInputSchema = z.object({
  boardState: z.array(z.array(z.enum(['_', 'B', 'W']))).describe(
    "A 2D array representing the current Go board. '_' is empty, 'B' is Black, 'W' is White. The array should be 0-indexed."
  ),
  playerTurn: z.enum(['B', 'W']).describe(
    "The player whose turn it is to move. 'B' for Black, 'W' for White."
  ),
  moveHistory: z.array(
    z.object({
      row: z.number().int().min(0).describe('The 0-indexed row coordinate of the move.'),
      col: z.number().int().min(0).describe('The 0-indexed column coordinate of the move.'),
      player: z.enum(['B', 'W']).describe('The player who made this move.'),
    })
  ).describe('An ordered list of all previous moves in the game.').default([]),
  boardSize: z.number().int().min(5).max(19).describe('The size of one side of the square Go board (e.g., 9, 13, 19).'),
});
export type AiGoMoveSuggesterInput = z.infer<typeof AiGoMoveSuggesterInputSchema>;

const AiGoMoveSuggesterOutputSchema = z.object({
  bestMove: z.object({
    row: z.number().int().min(0).describe('The 0-indexed row coordinate of the suggested best move.'),
    col: z.number().int().min(0).describe('The 0-indexed column coordinate of the suggested best move.'),
  }).describe('The coordinates of the suggested optimal move.'),
  explanation: z.string().describe('A concise explanation of the strategic rationale behind the suggested move, considering Alpha-Beta pruning and pattern matching principles.'),
});
export type AiGoMoveSuggesterOutput = z.infer<typeof AiGoMoveSuggesterOutputSchema>;

export async function aiGoMoveSuggester(input: AiGoMoveSuggesterInput): Promise<AiGoMoveSuggesterOutput> {
  return aiGoMoveSuggesterFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiGoMoveSuggesterPrompt',
  input: { schema: AiGoMoveSuggesterInputSchema },
  output: { schema: AiGoMoveSuggesterOutputSchema },
  prompt: `You are an expert Go AI designed to suggest the optimal next move on a Go board.
Your decision-making process is based on advanced Go strategy, incorporating principles similar to Alpha-Beta pruning for evaluating move sequences and extensive pattern matching for common joseki (corner patterns), fuseki (opening), chuban (mid-game), and yose (end-game) scenarios.

Current board size: {{{boardSize}}}x{{{boardSize}}}
Current player turn: {{{playerTurn}}}

Current Board State (represented as a 2D array where '_' is empty, 'B' is Black, 'W' is White. Coordinates are 0-indexed):
{{{boardState}}}

Move History (chronological order):
{{#if moveHistory}}
{{#each moveHistory}}
  Player {{this.player}} played at ({{this.row}}, {{this.col}}).
{{/each}}
{{else}}
  No moves have been played yet.
{{/if}}

Analyze the current board state and move history to determine the single most strategic move for the current player. Provide the coordinates (row, col) of the best move and a concise explanation of its strategic rationale. The coordinates should be 0-indexed. Ensure the suggested move is on an empty intersection.
`,
});

const aiGoMoveSuggesterFlow = ai.defineFlow(
  {
    name: 'aiGoMoveSuggesterFlow',
    inputSchema: AiGoMoveSuggesterInputSchema,
    outputSchema: AiGoMoveSuggesterOutputSchema,
  },
  async (input) => {
    const { output } = await prompt({
      boardState: JSON.stringify(input.boardState),
      playerTurn: input.playerTurn,
      moveHistory: input.moveHistory,
      boardSize: input.boardSize,
    });
    return output!;
  }
);
