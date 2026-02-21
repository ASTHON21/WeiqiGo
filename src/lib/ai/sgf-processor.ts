import { Move } from '../types';

/**
 * SgfProcessor - 项目中的“翻译官”
 * 负责处理所有与 SGF 字符相关的转换逻辑，并提供 8 种棋盘矩阵对称变换。
 */
export const SgfProcessor = {
    /**
     * 将数字坐标转换为 SGF 字母坐标 (例如: 3, 15 -> "pd")
     */
    toSgf(r: number, c: number): string {
        if (r < 0 || c < 0) return "";
        const col = String.fromCharCode(c + 97);
        const row = String.fromCharCode(r + 97);
        return `${col}${row}`;
    },

    /**
     * 将 SGF 字母坐标转换为数字坐标
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
     */
    generatePathKey(history: Move[]): string {
        return history.map(m => `${m.r},${m.c}`).join('|');
    },

    /**
     * 矩阵变换核心：计算 8 种对称坐标
     * @param r 行, @param c 列, @param size 棋盘大小
     */
    getSymmetryCoords(r: number, c: number, size: number) {
        const s = size - 1;
        return [
            { r, c },                   // 0: 原始
            { r: c, c: s - r },         // 1: 顺时针 90°
            { r: s - r, c: s - c },     // 2: 180°
            { r: s - c, c: r },         // 3: 270°
            { r, c: s - c },            // 4: 水平镜像
            { r: s - r, c },            // 5: 垂直镜像
            { r: c, c: r },             // 6: 对角线镜像 \
            { r: s - c, c: s - r }      // 7: 对角线镜像 /
        ];
    },

    /**
     * 逆向矩阵变换：将匹配到的对称坐标还原回当前玩家视角
     */
    invertTransform(r: number, c: number, type: number, size: number): { r: number, c: number } {
        const s = size - 1;
        switch (type) {
            case 1: return { r: s - c, c: r };     // 逆时针 90° 还原
            case 2: return { r: s - r, c: s - c }; // 180° 还原
            case 3: return { r: c, c: s - r };     // 顺时针 90° 还原
            case 4: return { r, c: s - c };        // 水平还原
            case 5: return { r: s - r, c };        // 垂直还原
            case 6: return { r: c, c: r };         // 对角线 \ 还原
            case 7: return { r: s - c, c: s - r }; // 对角线 / 还原
            default: return { r, c };              // 原始还原
        }
    },

    /**
     * 辅助功能：解析简单的 SGF 属性值
     */
    extractProperty(sgfText: string, prop: string): string | null {
        const regex = new RegExp(`${prop}\\[(.*?)\\]`);
        const match = sgfText.match(regex);
        return match ? match[1] : null;
    }
};
