'use client';

import sgfDatabase from './data/sgf-database.json';
import { Move } from '../../types';
import crypto from 'crypto';

/**
 * 本能层 (SGF Dictionary)
 * 职责：基于 Hash 的瞬间模式匹配。
 * 通过比对当前对局路径与棋谱库，实现高手直觉般的瞬间响应。
 */
export function findSgfMatch(history: Move[], size: number) {
    // 字典目前主要涵盖开局阶段（前 20 手）
    if (history.length === 0 || history.length > 20) return null;

    try {
        // 1. 将当前路径转化为哈希键
        // 格式必须与 sync-sgf.js 保持一致： "r,c|r,c|..."
        const pathStr = history.map(m => `${m.r},${m.c}`).join('|');
        const currentHash = crypto.createHash('md5').update(pathStr).digest('hex');

        // 2. 查表
        const match = (sgfDatabase as Record<string, any>)[currentHash];

        if (match) {
            // SGF 坐标转换 (a=0, b=1...)
            // match.nextMove 格式为 "cr"，其中第一个字符是列(c)，第二个是行(r)
            // 例如 "pd" -> c='p'(15), r='d'(3)
            return {
                r: match.nextMove.charCodeAt(1) - 97,
                c: match.nextMove.charCodeAt(0) - 97,
                explanation: `匹配到棋谱《${match.source}》中的经典走法`
            };
        }
    } catch (error) {
        // 防止加密模块在某些环境下不可用导致崩溃
        console.warn('[SGF Dictionary] 匹配过程出错:', error);
    }
    
    return null;
}
