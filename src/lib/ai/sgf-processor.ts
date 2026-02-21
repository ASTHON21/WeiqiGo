import { Move, LevelData } from '../types';

/**
 * SgfProcessor - 镜像系统核心解析器
 * 负责将 SGF 文件转换为有序的动作序列，支持解析预摆棋子。
 */
export const SgfProcessor = {
    /**
     * 解析 SGF 坐标 (如 "pd" -> {r:15, c:15})
     */
    fromSgf(sgf: string): { r: number; c: number } {
        if (!sgf || sgf.length < 2) return { r: -1, c: -1 };
        return {
            c: sgf.charCodeAt(0) - 97,
            r: sgf.charCodeAt(1) - 97
        };
    },

    /**
     * 解析完整的 SGF 字符串为 LevelData
     */
    parseLevel(id: string, content: string): LevelData {
        const moves: Move[] = [];
        const handicaps: Move[] = [];
        
        // 解析标题 [SZ] [KM] [PB] [PW] 等标签 (简易实现)
        const boardSizeMatch = content.match(/SZ\[(\d+)\]/);
        const boardSize = boardSizeMatch ? parseInt(boardSizeMatch[1]) : 19;

        // 解析预摆棋子 AB[pd][pp]...
        const abMatches = content.matchAll(/AB\[([a-s]{2})\]/g);
        for (const match of abMatches) {
            const coord = this.fromSgf(match[1]);
            handicaps.push({ ...coord, player: 'black' });
        }
        
        const awMatches = content.matchAll(/AW\[([a-s]{2})\]/g);
        for (const match of awMatches) {
            const coord = this.fromSgf(match[1]);
            handicaps.push({ ...coord, player: 'white' });
        }

        // 解析步进序列 ;B[pd];W[dp]...
        const moveMatches = content.matchAll(/;([BW])\[([a-s]{2})\]/g);
        let index = 0;
        for (const match of moveMatches) {
            const player = match[1] === 'B' ? 'black' : 'white';
            const coord = this.fromSgf(match[2]);
            moves.push({ ...coord, player, index: index++ });
        }

        return {
            id,
            title: `AlphaGo vs Human - ${id}`,
            description: "复刻 AlphaGo 的传奇思路",
            difficulty: 'Hard',
            boardSize,
            handicaps,
            moves,
            totalSteps: moves.length
        };
    }
};
