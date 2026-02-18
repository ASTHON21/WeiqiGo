//​第一优先级（本能）：调用 dictionary/index.ts。如果 SGF 库里有，直接秒回。
//​第二优先级（直觉）：调用 evaluator.ts。如果没有定式，利用“位置权重表”找大场。
//​第三优先级（深度思考）：执行 Alpha-Beta 搜索。

// src/lib/ai/engine.ts

import { BoardState, Player, Move } from '../types';
import { GoLogic } from '../go-logic';
import { BoardEvaluator } from './evaluator';
import { findSgfMatch } from './dictionary'; // 需要在 dictionary/index.ts 中实现

export class ShadowEngine {
    private evaluator: BoardEvaluator;
    private boardSize: number;
    private maxDepth: number = 3; // 搜索深度

    constructor(boardSize: number) {
        this.boardSize = boardSize;
        this.evaluator = new BoardEvaluator(boardSize);
    }

    /**
     * 主决策函数：获取最佳落子点
     */
    public findBestMove(
        board: BoardState, 
        player: Player, 
        history: Move[]
    ): { bestMove: Move | null; explanation: string } {
        
        // 1. 第一优先级：SGF 数据库路径匹配（本能响应）
        const sgfMatch = findSgfMatch(history, this.boardSize);
        if (sgfMatch) {
            return {
                bestMove: { r: sgfMatch.r, c: sgfMatch.c, player },
                explanation: `[定式匹配] ${sgfMatch.explanation}`
            };
        }

        // 2. 第二优先级：获取所有合法落子点
        const possibleMoves = this.getOrderedMoves(board, player, history.length);
        if (possibleMoves.length === 0) {
            return { bestMove: null, explanation: "棋局结束，无处可落子。" };
        }

        // 3. 第三优先级：Alpha-Beta 剪枝搜索（深度思考）
        let bestValue = -Infinity;
        let bestMove = possibleMoves[0];

        for (const move of possibleMoves) {
            // 模拟落子
            const nextState = GoLogic.processMove(board, move.r, move.c, player);
            if (!nextState.success) continue;

            // 深度优先搜索
            const boardValue = this.alphaBeta(
                nextState.newBoard,
                this.maxDepth - 1,
                -Infinity,
                Infinity,
                false,
                player,
                history.length + 1
            );

            if (boardValue > bestValue) {
                bestValue = boardValue;
                bestMove = move;
            }
        }

        return {
            bestMove: bestMove,
            explanation: `[深度搜索] 基于 Alpha-Beta 算法计算，当前选点评分：${bestValue.toFixed(1)}`
        };
    }

    /**
     * Alpha-Beta 剪枝搜索算法
     */
    private alphaBeta(
        board: BoardState,
        depth: number,
        alpha: number,
        beta: number,
        isMaximizing: boolean,
        aiPlayer: Player,
        moveCount: number
    ): number {
        // 到达叶子节点：返回评估器的分数
        if (depth === 0) {
            return this.evaluator.evaluate(board, aiPlayer, moveCount);
        }

        const opponent = aiPlayer === 'black' ? 'white' : 'black';
        const currentPlayer = isMaximizing ? aiPlayer : opponent;
        const moves = this.getOrderedMoves(board, currentPlayer, moveCount);

        if (isMaximizing) {
            let maxEval = -Infinity;
            for (const move of moves) {
                const nextState = GoLogic.processMove(board, move.r, move.c, currentPlayer);
                if (!nextState.success) continue;
                
                const evaluation = this.alphaBeta(nextState.newBoard, depth - 1, alpha, beta, false, aiPlayer, moveCount + 1);
                maxEval = Math.max(maxEval, evaluation);
                alpha = Math.max(alpha, evaluation);
                if (beta <= alpha) break; // 剪枝
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const move of moves) {
                const nextState = GoLogic.processMove(board, move.r, move.c, currentPlayer);
                if (!nextState.success) continue;
                
                const evaluation = this.alphaBeta(nextState.newBoard, depth - 1, alpha, beta, true, aiPlayer, moveCount + 1);
                minEval = Math.min(minEval, evaluation);
                beta = Math.min(beta, evaluation);
                if (beta <= alpha) break; // 剪枝
            }
            return minEval;
        }
    }

    /**
     * 启发式移动排序：优先搜索价值更高的位置（如星位、靠近已有棋子的位置）
     * 这能极大提高 Alpha-Beta 剪枝的效率
     */
    private getOrderedMoves(board: BoardState, player: Player, moveCount: number): Move[] {
        const moves: { r: number, c: number, player: Player, score: number }[] = [];

        for (let r = 0; r < this.boardSize; r++) {
            for (let c = 0; c < this.boardSize; c++) {
                if (board[r][c] === null) {
                    // 基础分来源于 Evaluator 的位置权重，用于初步排序
                    const score = this.evaluator.getQuickScore(r, c, moveCount);
                    moves.push({ r, c, player, score });
                }
            }
        }

        // 按预估分数降序排列
        return moves.sort((a, b) => b.score - a.score);
    }
}