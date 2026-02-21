"use server";

import { ShadowEngine } from '@/lib/ai/engine';
import { BoardState, Player, Move } from '@/lib/types';
import { GoLogic, createEmptyBoard } from '@/lib/go-logic';

/**
 * 引擎缓存：按棋盘尺寸缓存实例，确保棋谱数据库在服务端仅加载一次。
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
 * 职责：作为前端与服务端引擎之间的桥梁。
 * 优化：在服务端重建棋盘历史，避免传输庞大的 BoardState[] 数组。
 */
export async function getAiMove(
    board: BoardState, 
    player: Player, 
    moveHistory: Move[],
    boardSize: number
) {
    try {
        const engine = getEngine(boardSize);
        
        // 在服务端重建 boardHistory，用于打劫判断
        // 这极大地减小了从前端传输到后端的 payload 大小
        const reconstructedHistory: BoardState[] = [];
        let tempBoard = createEmptyBoard(boardSize);
        
        for (const move of moveHistory) {
            // 存入落子前的快照
            reconstructedHistory.push(tempBoard.map(row => [...row]));
            
            if (move.r !== -1) {
                const result = GoLogic.processMove(tempBoard, move.r, move.c, move.player, reconstructedHistory.slice(0, -1));
                if (result.success) {
                    tempBoard = result.newBoard;
                }
            }
        }

        // 执行决策逻辑
        const result = engine.findBestMove(board, player, moveHistory, reconstructedHistory);
        
        // 关键：确保返回的是纯净的 JSON 对象，不含函数或特殊类实例
        return {
            bestMove: result.bestMove ? { r: result.bestMove.r, c: result.bestMove.c, player: result.bestMove.player } : null,
            explanation: result.explanation,
            gamePhase: result.gamePhase,
            debugLog: JSON.parse(JSON.stringify(result.debugLog)) // 深度序列化确保安全
        };
    } catch (error: any) {
        // 服务端日志
        console.error("[Shadow AI Server Error]:", error.message);
        
        return {
            bestMove: null,
            explanation: "Shadow AI 在思考时遇到了服务器内部故障。",
            gamePhase: "Unknown",
            debugLog: { error: error.message }
        };
    }
}
