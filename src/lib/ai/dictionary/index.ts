import { DictionaryManager } from './manager';
import { SgfProcessor } from '../sgf-processor';
import { Move } from '../../types';
import * as crypto from 'crypto';

/**
 * 带有矩阵变换的高级匹配函数
 * 此文件通过调用矩阵变换，让 AI 在每一手都能尝试从 8 个角度去“套用”那几千条棋谱
 */
export function findSgfMatch(history: Move[], size: number): { r: number; c: number; explanation: string } | null {
    if (!history || history.length === 0) return null;

    // 获取单例数据库
    const database = DictionaryManager.loadDatabase();

    // 遍历 8 种矩阵对称形态
    for (let type = 0; type < 8; type++) {
        // 1. 将当前对局历史整体进行对应的矩阵变换
        const transformedHistory = history.map(m => {
            const sym = SgfProcessor.getSymmetryCoords(m.r, m.c, size)[type];
            return { ...m, r: sym.r, c: sym.c };
        });

        // 2. 生成变换后的哈希键
        const pathStr = SgfProcessor.generatePathKey(transformedHistory);
        const currentHash = crypto.createHash('md5').update(pathStr).digest('hex');

        // 3. 在数据库中检索
        const match = database[currentHash];

        if (match) {
            // 4. 如果匹配成功，获取库中的下一步坐标 (SGF 格式)
            const symNextMove = SgfProcessor.fromSgf(match.nextMove);
            
            // 5. 【关键】将匹配到的库坐标，通过逆向矩阵变换转回当前棋盘视角
            const realCoord = SgfProcessor.invertTransform(symNextMove.r, symNextMove.c, type, size);
            
            const symNames = ["原始", "旋转90°", "旋转180°", "旋转270°", "水平镜像", "垂直镜像", "对角线\\镜像", "对角线/镜像"];
            
            return {
                r: realCoord.r,
                c: realCoord.c,
                explanation: `[矩阵匹配] 命中 ${symNames[type]} 形态（来源：${match.source}）`
            };
        }
    }

    // 若 8 种形态均未匹配，则返回 null
    return null;
}
