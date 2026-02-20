'use client';

import { Move } from '../types';

/**
 * SgfProcessor - 项目中的“翻译官”
 * 负责处理所有与 SGF 字符相关的转换逻辑，确保 AI 引擎与棋谱数据库之间的通讯无误。
 */
export const SgfProcessor = {
    /**
     * 将数字坐标转换为 SGF 字母坐标 (例如: r:3, c:15 -> "pd")
     */
    toSgf(r: number, c: number): string {
        if (r < 0 || c < 0) return "";
        const col = String.fromCharCode(c + 97);
        const row = String.fromCharCode(r + 97);
        return `${col}${row}`;
    },

    /**
     * 将 SGF 字母坐标转换为数字坐标 (例如: "pd" -> {r:3, c:15})
     */
    fromSgf(sgf: string): { r: number; c: number } {
        if (!sgf || sgf.length < 2) return { r: -1, c: -1 };
        return {
            c: sgf.charCodeAt(0) - 97,
            r: sgf.charCodeAt(1) - 97
        };
    },

    /**
     * 生成当前对局路径的唯一哈希键
     * 保持与 sync-sgf.js 相同的格式: "r,c|r,c|..."
     */
    generatePathKey(moves: Move[]): string {
        return moves.map(m => `${m.r},${m.c}`).join('|');
    },

    /**
     * 生成 8 种对称变换的路径 (旋转与镜像)
     */
    getSymmetricPaths(history: Move[], size: number) {
        const symmetries = Array.from({ length: 8 }, (_, type) => ({
            type,
            moves: [] as Move[]
        }));

        for (const move of history) {
            const { r, c, player } = move;
            // 0: 原始 (Identity)
            symmetries[0].moves.push({ r, c, player });
            // 1: 旋转 90 度 (r, c) -> (c, size-1-r)
            symmetries[1].moves.push({ r: c, c: size - 1 - r, player });
            // 2: 旋转 180 度 (r, c) -> (size-1-r, size-1-c)
            symmetries[2].moves.push({ r: size - 1 - r, c: size - 1 - c, player });
            // 3: 旋转 270 度 (r, c) -> (size-1-c, r)
            symmetries[3].moves.push({ r: size - 1 - c, c: r, player });
            // 4: 水平翻转 (r, c) -> (size-1-r, c)
            symmetries[4].moves.push({ r: size - 1 - r, c, player });
            // 5: 垂直翻转 (r, c) -> (r, size-1-c)
            symmetries[5].moves.push({ r, c: size - 1 - c, player });
            // 6: 对角线翻转 1 (r, c) -> (c, r)
            symmetries[6].moves.push({ r: c, c: r, player });
            // 7: 对角线翻转 2 (r, c) -> (size-1-c, size-1-r)
            symmetries[7].moves.push({ r: size - 1 - c, c: size - 1 - r, player });
        }
        return symmetries;
    },

    /**
     * 逆向变换：将变换空间下的坐标还原回原始棋盘空间
     */
    invertTransform(coord: { r: number, c: number }, type: number, size: number): { r: number, c: number } {
        const { r, c } = coord;
        if (r === -1 || c === -1) return { r, c };
        
        switch (type) {
            case 0: return { r, c };
            case 1: return { r: size - 1 - c, c: r }; // 旋转 90 的逆变换是旋转 270
            case 2: return { r: size - 1 - r, c: size - 1 - c }; // 180 是自逆
            case 3: return { r: c, c: size - 1 - r }; // 旋转 270 的逆变换是旋转 90
            case 4: return { r: size - 1 - r, c }; // 翻转都是自逆
            case 5: return { r, c: size - 1 - c };
            case 6: return { r: c, c: r };
            case 7: return { r: size - 1 - c, c: size - 1 - r };
            default: return { r, c };
        }
    },

    /**
     * 辅助功能：解析简单的 SGF 属性值 (例如 SZ[19] -> "19")
     */
    extractProperty(sgfText: string, prop: string): string | null {
        const regex = new RegExp(`${prop}\\[(.*?)\\]`);
        const match = sgfText.match(regex);
        return match ? match[1] : null;
    }
};