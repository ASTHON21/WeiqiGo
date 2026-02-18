// 评分函数（包含你写的真眼、位置权重）
// src/lib/ai/evaluator.ts

import { BoardState, Player } from '../types';

export class BoardEvaluator {
    private size: number;

    constructor(size: number) {
        this.size = size;
    }

    /**
     * 核心评估函数：综合评估当前棋盘分数
     */
    public evaluate(board: BoardState, currentPlayer: Player, moveCount: number): number {
        let score = 0;
        const opponent = currentPlayer === 'black' ? 'white' : 'black';

        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                const stone = board[r][c];
                if (stone === currentPlayer) {
                    score += 100; // 基础子力分
                    score += this.getAdvancedPositionWeight(r, c, moveCount, board);
                } else if (stone === opponent) {
                    score -= 100;
                    score -= this.getAdvancedPositionWeight(r, c, moveCount, board);
                } else {
                    // 空间评估：真眼奖励
                    if (this.isTrueEye(board, r, c, currentPlayer)) score += 500;
                    if (this.isTrueEye(board, r, c, opponent)) score -= 500;
                }
            }
        }

        // 官子阶段额外权重：目数增益
        if (moveCount > (this.size * this.size * 0.7)) {
            score += this.calculateTerritoryBonus(board, currentPlayer);
        }

        return score;
    }
    

/**
 * 快速评分：用于搜索前的移动排序 (Move Ordering)
 * 只计算位置潜力，不涉及复杂的死活和目数
 */
public getQuickScore(r: number, c: number, moveCount: number): number {
    let score = 0;
    const dist = Math.min(r, c, this.size - 1 - r, this.size - 1 - c);
    
    // 优先考虑星位和三四线
    const isStar = this.checkStarPoint(r, c);
    if (isStar) score += 100;
    if (dist === 2) score += 60; // 三线
    if (dist === 3) score += 50; // 四线
    
    // 远离死亡线
    if (dist === 0) score -= 100;
    
    // 随机微扰：打破完全相同的分数，增加 AI 灵活性
    score += Math.random() * 5;

    return score;
}

    /**
     * 动态位置权重：结合棋理与棋局阶段
     */
    private getAdvancedPositionWeight(r: number, c: number, moveCount: number, board: BoardState): number {
        let weight = 0;
        const dist = Math.min(r, c, this.size - 1 - r, this.size - 1 - c);
        const isStarPoint = this.checkStarPoint(r, c);

        // 1. 基础位置分（金边银角草肚皮）
        if (isStarPoint) weight += 150;
        if (dist === 2) weight += 100; // 三线：实地
        if (dist === 3) weight += 80;  // 四线：外势
        if (dist === 0) weight -= 200; // 一线：死亡线

        // 2. 布局阶段 (前20手) 强化角部价值
        if (moveCount < 20) {
            if (dist <= 3 && this.isEmptyCorner(r, c, board)) {
                weight += 200; // 抢占空角
            }
        }

        // 3. 中央区域控制 (中盘阶段)
        if (moveCount >= 20 && moveCount <= 80) {
            if (dist >= 4) weight += 20; 
        }

        return weight;
    }

    /**
     * 真眼识别逻辑：防止 AI 自杀
     */
    private isTrueEye(board: BoardState, r: number, c: number, player: Player): boolean {
        if (board[r][c] !== null) return false;

        // 检查十字邻居是否全是己方棋子
        const neighbors = [
            [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]
        ];
        for (const [nr, nc] of neighbors) {
            if (nr >= 0 && nr < this.size && nc >= 0 && nc < this.size) {
                if (board[nr][nc] !== player) return false;
            }
        }

        // 检查角部对角线（至少需要控制 3/4 或 1/2 的对角线）
        const corners = [
            [r - 1, c - 1], [r - 1, c + 1], [r + 1, c - 1], [r + 1, c + 1]
        ];
        let cornerCount = 0;
        let validCorners = 0;
        for (const [cr, cc] of corners) {
            if (cr >= 0 && cr < this.size && cc >= 0 && cc < this.size) {
                validCorners++;
                if (board[cr][cc] === player) cornerCount++;
            }
        }
        
        // 边角眼位要求较低，中腹眼位要求较高
        return validCorners === 4 ? cornerCount >= 3 : cornerCount >= 1;
    }

    /**
     * 空角检测
     */
    private isEmptyCorner(r: number, c: number, board: BoardState): boolean {
        const isCornerArea = (r < 4 && c < 4) || (r < 4 && c > this.size - 5) || 
                             (r > this.size - 5 && c < 4) || (r > this.size - 5 && c > this.size - 5);
        if (!isCornerArea) return false;

        // 检查 3x3 范围内是否有棋子
        for (let i = r - 1; i <= r + 1; i++) {
            for (let j = c - 1; j <= c + 1; j++) {
                if (i >= 0 && i < this.size && j >= 0 && j < this.size) {
                    if (board[i][j] !== null) return false;
                }
            }
        }
        return true;
    }

    /**
     * 星位坐标判定
     */
    private checkStarPoint(r: number, c: number): boolean {
        const points = this.size === 13 ? [3, 6, 9] : (this.size === 9 ? [2, 4, 6] : [3, 9, 15]);
        return points.includes(r) && points.includes(c);
    }

    /**
     * 官子目数奖励：鼓励围空
     */
    private calculateTerritoryBonus(board: BoardState, player: Player): number {
        let bonus = 0;
        // 简单的扫描：如果空位被己方棋子包围，则增加评分
        return bonus; // 此处可扩展更精细的目数算法
    }
}
