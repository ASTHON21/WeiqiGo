'use server';
/**
 * @fileOverview A Go game phase strategist AI agent.
 *
 * - aiGamePhaseStrategist - A function that determines the current phase of a Go game.
 * - AIGamePhaseStrategistInput - The input type for the aiGamePhaseStrategist function.
 * - AIGamePhaseStrategistOutput - The return type for the aiGamePhaseStrategist function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AIGamePhaseStrategistInputSchema = z.object({
  numberOfMoves: z.number().describe('The total number of moves played in the game so far.'),
  boardOccupationPercentage: z.number().describe('The percentage of the board that is currently occupied by stones (0-100).'),
});
export type AIGamePhaseStrategistInput = z.infer<typeof AIGamePhaseStrategistInputSchema>;

const AIGamePhaseStrategistOutputSchema = z.object({
  gamePhase: z.enum(['Fuseki', 'Chuban', 'Yose']).describe('The current phase of the Go game: Fuseki (opening), Chuban (mid-game), or Yose (endgame).'),
});
export type AIGamePhaseStrategistOutput = z.infer<typeof AIGamePhaseStrategistOutputSchema>;

export async function aiGamePhaseStrategist(input: AIGamePhaseStrategistInput): Promise<AIGamePhaseStrategistOutput> {
  return aiGamePhaseStrategistFlow(input);
}

const prompt = ai.definePrompt({
  name: 'aiGamePhaseStrategistPrompt',
  input: { schema: AIGamePhaseStrategistInputSchema },
  output: { schema: AIGamePhaseStrategistOutputSchema },
  prompt: `You are an expert Go strategist. Your task is to analyze the current state of a Go game and determine its current phase: Fuseki (opening), Chuban (mid-game), or Yose (endgame).

Consider the following information:
- Number of moves played: {{{numberOfMoves}}}
- Percentage of board occupied by stones: {{{boardOccupationPercentage}}}

Based on this information, output the most appropriate game phase.`,
});

const aiGamePhaseStrategistFlow = ai.defineFlow(
  {
    name: 'aiGamePhaseStrategistFlow',
    inputSchema: AIGamePhaseStrategistInputSchema,
    outputSchema: AIGamePhaseStrategistOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
