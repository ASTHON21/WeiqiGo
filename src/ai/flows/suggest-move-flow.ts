
'use server';

/**
 * @fileOverview 围棋 AI 落子决策流
 * 
 * - suggestMove - 根据当前盘面建议下一步落子。
 * - SuggestMoveInput - 棋盘状态、规则及当前执子颜色。
 * - SuggestMoveOutput - 建议的落子坐标 (r, c)。
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SuggestMoveInputSchema = z.object({
  boardSize: z.number(),
  rules: z.string(),
  boardString: z.string().describe("棋盘的字符串表示，'.' 为空，'B' 为黑子，'W' 为白子"),
  playerColor: z.string(),
  history: z.array(z.string()).describe("最近几手的棋盘快照，用于避免劫争"),
});

export type SuggestMoveInput = z.infer<typeof SuggestMoveInputSchema>;

const SuggestMoveOutputSchema = z.object({
  r: z.number().describe("建议落子的行坐标，若建议弃权则为 -1"),
  c: z.number().describe("建议落子的列坐标，若建议弃权则为 -1"),
  evaluation: z.number().describe("AI 对当前局面的胜率评估 (0-1)"),
  thought: z.string().describe("AI 的思考逻辑简述"),
});

export type SuggestMoveOutput = z.infer<typeof SuggestMoveOutputSchema>;

const prompt = ai.definePrompt({
  name: 'suggestMovePrompt',
  input: { schema: SuggestMoveInputSchema },
  output: { schema: SuggestMoveOutputSchema },
  prompt: `你是一个顶尖的围棋 AI（类似 KataGo）。
请根据当前的棋盘状态、对局规则（{{rules}}）以及你的历史落子情况，为 {{playerColor}} 方建议下一步。

棋盘大小: {{boardSize}}x{{boardSize}}
当前盘面:
{{{boardString}}}

约束:
1. 必须遵守劫争规则 (Ko Rule)，不能落子在会导致盘面立即重复的位置。
2. 必须遵守禁着点规则，不能落子在己方无气且不能提子的地方。
3. 如果当前局面已经进入终官且没有价值更大的落子，可以建议弃权 (r: -1, c: -1)。
4. 你的输出必须是合法的坐标。

请计算出最佳的落子位置，并给出你的胜率评估和简短的思考过程。`,
});

export async function suggestMove(input: SuggestMoveInput): Promise<SuggestMoveOutput> {
  const { output } = await prompt(input);
  if (!output) throw new Error("AI 未能生成有效的落子建议");
  return output;
}
