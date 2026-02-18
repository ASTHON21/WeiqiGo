import { BoardState, Player } from '../types';

/**
 * 直觉层 (BoardEvaluator)
 * 职责：棋盘价值评估。
 * 核心：动态权重、真眼识别、官子评分。
 */
export class BoardEvaluator {
    private size: number;

    constructor(size: number) {
        this.size = size;
    }

    public evaluate(board: BoardState, currentPlayer: Player, moveCount: number): number {
        let score = 0;
        const opponent = currentPlayer === 'black' ? 'white' : 'black';

        for (let r = 0; r < this.size; r++) {
            for (let c = 0; c < this.size; c++) {
                const stone = board[r][c];
                if (stone === currentPlayer) {
                    score += 100;
                    score += this.getPositionWeight(r, c, moveCount);
                } else if (stone === opponent) {
                    score -= 100;
                    score -= this.getPositionWeight(r, c, moveCount);
                } else {
                    if (this.isTrueEye(board, r, c, currentPlayer)) score += 300;
                    if (this.isTrueEye(board, r, c, opponent)) score -= 300;
                }
            }
        }
        return score;
    }

    public getQuickScore(r: number, c: number, moveCount: number): number {
        let score = 0;
        const dist = Math.min(r, c, this.size - 1 - r, this.size - 1 - c);
        
        if (this.isStarPoint(r, c)) score += 150;
        if (dist === 2) score += 100; // 三线
        if (dist === 3) score += 80;  // 四线
        if (dist === 0) score -= 150; // 一线
        
        score += Math.random() * 10; // 增加灵活性
        return score;
    }

    private getPositionWeight(r: number, c: number, moveCount: number): number {
        const dist = Math.min(r, c, this.size - 1 - r, this.size - 1 - c);
        let weight = 0;
        
        if (this.isStarPoint(r, c)) weight += 50;
        if (dist === 2) weight += 30;
        if (dist === 3) weight += 20;
        
        // 布局阶段加强边角
        if (moveCount < 30 && dist <= 3) weight += 50;
        
        return weight;
    }

    private isTrueEye(board: BoardState, r: number, c: number, player: Player): boolean {
        if (board[r][c] !== null) return false;
        const neighbors = [[r-1, c], [r+1, c], [r, c-1], [r, c+1]];
        for (const [nr, nc] of neighbors) {
            if (nr >= 0 && nr < this.size && nc >= 0 && nc < this.size) {
                if (board[nr][nc] !== player) return false;
            }
        }
        return true; 
    }

    private isStarPoint(r: number, c: number): boolean {
        const pts = this.size === 19 ? [3, 9, 15] : (this.size === 13 ? [3, 6, 9] : [2, 4, 6]);
        return pts.includes(r) && pts.includes(c);
    }
}
