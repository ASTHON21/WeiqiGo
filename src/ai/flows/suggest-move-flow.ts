'use server';

/**
 * @fileOverview [已废弃] 围棋 AI 落子决策流
 * 
 * 现已改用 src/lib/ai/katago-engine.ts 中的本地 KataGo WASM 引擎，
 * 以提供更专业的博弈水准和更低的延迟。
 */

export async function suggestMove() {
  console.warn("suggestMove flow is deprecated. Use KataGo WASM engine instead.");
  return null;
}
