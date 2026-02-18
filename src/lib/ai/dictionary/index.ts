'use client';

import sgfDatabase from './data/sgf-database.json';
import { Move } from '../../types';
import { SgfProcessor } from '../sgf-processor';
import crypto from 'crypto';

/**
 * 数据库条目接口定义
 */
interface SgfDatabaseEntry {
    hash: string;
    nextMove: string; // SGF 格式坐标，如 'pd'
    source: string;
}

/**
 * 核心查表函数（本能层）
 * 职责：基于哈希值的瞬间模式匹配。
 */
export function findSgfMatch(history: Move[], size: number): { r: number; c: number; explanation: string } | null {
    // 字典目前主要涵盖开局阶段（前 20 手）
    if (!history || history.length === 0 || history.length > 20) return null;

    try {
        // 1. 使用 SgfProcessor 生成标准化的路径字符串
        // 格式严格对齐 sync-sgf.js: "r,c|r,c|..."
        const pathStr = SgfProcessor.generatePathKey(history);

        // 2. 计算 MD5 哈希值
        // 注意：在浏览器环境下可能需要通过 polyfill 或特定配置支持 crypto 模块
        const currentHash = crypto.createHash('md5').update(pathStr).digest('hex');

        // 3. 在数据库中进行 O(1) 检索
        const match = (sgfDatabase as Record<string, SgfDatabaseEntry>)[currentHash];

        if (match) {
            // 4. 匹配成功：将 SGF 字母坐标转回数字坐标
            const nextMoveCoord = SgfProcessor.fromSgf(match.nextMove);
            
            return {
                r: nextMoveCoord.r,
                c: nextMoveCoord.c,
                explanation: `遵循《${match.source}》中的对局路径。`
            };
        }
    } catch (error) {
        // 防止加密模块不可用导致崩溃
        console.warn('[SGF Dictionary] 匹配过程出错:', error);
    }

    // 未命中字典，返回 null 让 AI 引擎进入理性思考阶段
    return null;
}
