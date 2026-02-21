import { DictionaryManager } from './manager';
import { SgfProcessor } from '../sgf-processor';
import { Move } from '../../types';
import * as crypto from 'crypto';

/**
 * 重塑后的 findSgfMatch：引入动态长度匹配与矩阵变换
 * AI 现在不仅看全盘历史，还会尝试匹配最近的局部定式路径。
 */
export function findSgfMatch(history: Move[], size: number): { r: number; c: number; explanation: string } | null {
    if (!history || history.length === 0) return null;

    // 获取单例混合数据库（棋谱库 + 定式库）
    const database = DictionaryManager.loadDatabase();

    // 尝试不同的“回顾长度”，从最长到最短
    // 这样即便开局断了，AI 也能在最近的局部棋形中找回记忆
    const lengthsToTry = [history.length, 10, 8, 6, 4];

    for (const len of lengthsToTry) {
        if (len > history.length || len < 2) continue;
        
        // 截取最近的 len 手棋进行匹配
        const subHistory = history.slice(-len);

        // 遍历 8 种矩阵对称形态
        for (let type = 0; type < 8; type++) {
            // 1. 将当前局部历史进行对应的矩阵变换
            const transformed = subHistory.map(m => {
                const sym = SgfProcessor.getSymmetryCoords(m.r, m.c, size)[type];
                return { ...m, r: sym.r, c: sym.c };
            });

            // 2. 生成标准化哈希键
            const pathStr = SgfProcessor.generatePathKey(transformed);
            const currentHash = crypto.createHash('md5').update(pathStr).digest('hex');

            // 3. 在数据库中检索
            const match = database[currentHash];

            if (match) {
                // 4. 如果匹配成功，获取库中的下一步坐标
                const symNextMove = SgfProcessor.fromSgf(match.nextMove);
                
                // 5. 将匹配到的坐标通过逆向矩阵变换转回当前棋盘视角
                const realCoord = SgfProcessor.invertTransform(symNextMove.r, symNextMove.c, type, size);
                
                return {
                    r: realCoord.r,
                    c: realCoord.c,
                    explanation: `[19路矩阵匹配] 长度:${len} 形态:${type} 来源:${match.source}`
                };
            }
        }
    }

    // 若所有长度与形态均未匹配
    return null;
}
