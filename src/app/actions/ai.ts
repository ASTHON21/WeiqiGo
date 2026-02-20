"use server";

import { ShadowEngine } from '@/lib/ai/engine';
import { BoardState, Player, Move } from '@/lib/types';

/**
 * 引擎缓存：按棋盘尺寸缓存实例，确保棋谱数据库在服务端仅加载一次。
 * 使用 Record 缓存不同尺寸的引擎实例。
 */
const engineCache: Record<number, ShadowEngine> = {};

function getEngine(size: number): ShadowEngine {
    if (!engineCache[size]) {
        console.log(`[Server Action] 初始化 ${size}x${size} 规格的 ShadowEngine...`);
        engineCache[size] = new ShadowEngine(size);
    }
    return engineCache[size];
}

/**
 * 健壮的 AI 决策入口 (Server Action)
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
        
        // 执行重塑后的决策逻辑
        const result = engine.findBestMove(board, player, moveHistory, boardHistory);
        
        // 关键：确保返回的是纯净的 JSON 对象，不含函数或特殊类实例
        return {
            bestMove: result.bestMove ? { r: result.bestMove.r, c: result.bestMove.c, player: result.bestMove.player } : null,
            explanation: result.explanation,
            gamePhase: result.gamePhase,
            debugLog: JSON.parse(JSON.stringify(result.debugLog)) // 深度序列化确保安全
        };
    } catch (error: any) {
        // 服务端日志，用于定位 fs 或逻辑报错
        console.error("[Shadow AI Server Error]:", error.message);
        
        return {
            bestMove: null,
            explanation: "Shadow AI 在思考时遇到了服务器内部故障。",
            gamePhase: "Unknown",
            debugLog: { error: error.message }
        };
    }
}
