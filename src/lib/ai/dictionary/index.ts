'use client';

import sgfDatabase from './data/sgf-database.json';
import { Move } from '../../types';
import { SgfProcessor } from '../sgf-processor';
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
        // 1. 使用翻译官生成哈希键
        const pathStr = SgfProcessor.generatePathKey(history);
        const currentHash = crypto.createHash('md5').update(pathStr).digest('hex');

        // 2. 在生成的数据库中进行 O(1) 检索
        const match = (sgfDatabase as Record<string, any>)[currentHash];

        if (match) {
            // 3. 使用翻译官将 SGF 坐标转换为应用坐标
            const coords = SgfProcessor.fromSgf(match.nextMove);
            return {
                r: coords.r,
                c: coords.c,
                explanation: `匹配到棋谱《${match.source}》中的经典走法`
            };
        }
    } catch (error) {
        // 防止加密模块在某些环境下不可用导致崩溃
        console.warn('[SGF Dictionary] 匹配过程出错:', error);
    }
    
    return null;
}
