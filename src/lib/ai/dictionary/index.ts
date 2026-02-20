import { DictionaryManager } from './manager';
import { SgfProcessor } from '../sgf-processor';
import { Move } from '../../types';
import * as crypto from 'crypto';

/**
 * 核心查表匹配函数 (支持 8 种对称方位匹配)
 * 职责：在开局阶段通过 MD5 哈希瞬间识别已知棋谱。
 */
export function findSgfMatch(history: Move[], size: number): { r: number; c: number; explanation: string } | null {
    // 字典目前主要覆盖布局和定式阶段（前 20 手）
    if (!history || history.length === 0 || history.length > 20) return null;

    try {
        // 1. 获取数据库 (单例加载)
        const database = DictionaryManager.loadDatabase();

        // 2. 生成当前局面的 8 种对称形态路径
        const symmetries = SgfProcessor.getSymmetricPaths(history, size);
        
        for (const symPath of symmetries) {
            // 对每一种对称形态生成哈希键
            const pathStr = SgfProcessor.generatePathKey(symPath.moves);
            const currentHash = crypto.createHash('md5').update(pathStr).digest('hex');

            // 在原始方向（type 0）时打印哈希，方便维护 joseki.json
            if (symPath.type === 0) {
                console.log(`[Instinct] Current Hash: ${currentHash}`);
            }

            // 3. 查表匹配
            const match = database[currentHash];

            if (match) {
                // 4. 匹配成功：获取该对称空间下的下一步 SGF 坐标
                const symCoord = SgfProcessor.fromSgf(match.nextMove);
                
                // 5. 关键：将“对称空间坐标”逆向变换回“真实棋盘坐标”
                const originalCoord = SgfProcessor.invertTransform(symCoord, symPath.type, size);
                
                const symNames = ["Identity", "Rot90", "Rot180", "Rot270", "H-Flip", "V-Flip", "D-Flip1", "D-Flip2"];
                
                return {
                    r: originalCoord.r,
                    c: originalCoord.c,
                    explanation: `[${symNames[symPath.type]}] 匹配到棋谱《${match.source}》的后续走法。`
                };
            }
        }
    } catch (error) {
        console.warn('[SGF Dictionary] Matching error:', error);
    }

    // 未命中字典，返回 null 交给 Alpha-Beta 搜索
    return null;
}