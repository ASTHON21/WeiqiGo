import sgfDatabase from './data/sgf-database.json';
import { Move } from '../../types';
import { GoLogic } from '../../go-logic';
import * as crypto from 'crypto';

/**
 * 本能层 (SGF Dictionary)
 * 职责：基于 Hash 的瞬间模式匹配。
 */
export function findSgfMatch(history: Move[], size: number): { r: number; c: number; source: string } | null {
    if (history.length === 0) return null;

    // 仅匹配布局阶段（前40手）
    if (history.length > 40) return null;

    // 生成路径字符串并计算 MD5
    const pathStr = history.map(m => `${m.r},${m.c}`).join('|');
    const hash = crypto.createHash('md5').update(pathStr).digest('hex');

    const match = (sgfDatabase as Record<string, any>)[hash];

    if (match) {
        const next = GoLogic.sgfToCoord(match.nextMove);
        return {
            r: next.r,
            c: next.c,
            source: match.source
        };
    }

    return null;
}
