"use server";

import { ShadowEngine } from '@/lib/ai/engine';
import { BoardState, Player, Move } from '@/lib/types';

/**
 * 引擎缓存：按棋盘尺寸缓存实例，确保棋谱数据库在服务端仅加载一次。
 */
const engineCache: Record<number, ShadowEngine> = {};

function getEngine(size: number): ShadowEngine {
    if (!engineCache[size]) {
        engineCache[size] = new ShadowEngine(size);
    }
    return engineCache[size];
}

/**
 * 重塑后的 AI 决策入口 (Server Action)
 * 职责：作为前端与高性能 Node.js 逻辑库之间的“安全桥梁”。
 */
export async function getAiMove(
    board: BoardState, 
    player: Player, 
    moveHistory: Move[],
    boardSize: number,
    boardHistory: BoardState[]
) {
    try {
        const engine = getEngine(boardSize);
        // 执行重塑后的四层架构决策逻辑
        const result = engine.findBestMove(board, player, moveHistory, boardHistory);
        return result;
    } catch (error: any) {
        console.error("AI Server Action Error:", error);
        return {
            bestMove: null,
            explanation: "Shadow AI 思考时遇到了服务器错误。",
            gamePhase: "Unknown",
            debugLog: { error: error.message }
        };
    }
}
