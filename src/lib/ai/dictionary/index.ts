'use client';

import { DictionaryManager } from './manager';
import { SgfProcessor } from '../sgf-processor';
import { Move } from '../../types';
import crypto from 'crypto';

/**
 * 核心查表函数（本能层）
 * 职责：基于哈希值的瞬间模式匹配。
 */
export function findSgfMatch(history: Move[], size: number): { r: number; c: number; explanation: string } | null {
    // 字典目前主要涵盖开局阶段（前 20 手）
    if (!history || history.length === 0 || history.length > 20) return null;

    try {
        // 1. 获取数据库 (通过单例管理器)
        const database = DictionaryManager.loadDatabase();

        // 2. 使用 SgfProcessor 生成标准化的路径字符串
        const pathStr = SgfProcessor.generatePathKey(history);

        // 3. 计算 MD5 哈希值
        const currentHash = crypto.createHash('md5').update(pathStr).digest('hex');

        // 4. 在数据库中进行 O(1) 检索
        const match = database[currentHash];

        if (match) {
            // 5. 匹配成功：将 SGF 字母坐标转回数字坐标
            const nextMoveCoord = SgfProcessor.fromSgf(match.nextMove);
            
            return {
                r: nextMoveCoord.r,
                c: nextMoveCoord.c,
                explanation: `匹配到棋谱《${match.source}》中的后续走法。`
            };
        }
    } catch (error) {
        console.warn('[SGF Dictionary] 匹配过程出错:', error);
    }

    // 未命中字典
    return null;
}
