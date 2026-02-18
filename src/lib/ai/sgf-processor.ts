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
    generatePathKey(history: Move[]): string {
        return history.map(m => `${m.r},${m.c}`).join('|');
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
