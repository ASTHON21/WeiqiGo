"use server";

import { SgfProcessor } from '@/lib/ai/sgf-processor';
import { LevelData } from '@/lib/types';

// 模拟关卡存储
const MOCK_SGF = `(;FF[4]GM[1]SZ[19]AB[pd][dp][pp][dd]PB[AlphaGo]PW[Human]RE[B+R]
;W[qn];B[nq];W[rp];B[qq];W[rk];B[ql];W[rl];B[qm];W[rm];B[rn];W[ro];B[qo];W[sn];B[qp];W[rn];B[rq]
)`;

/**
 * 获取关卡数据 (Server Action)
 */
export async function getLevelData(levelId: string): Promise<LevelData> {
    // 实际应用中会从 fs 或数据库读取文件
    console.log(`[Level Action] 加载关卡: ${levelId}`);
    return SgfProcessor.parseLevel(levelId, MOCK_SGF);
}
