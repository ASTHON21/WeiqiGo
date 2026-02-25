
"use server";

import { SgfProcessor } from '@/lib/ai/sgf-processor';
import { LevelData } from '@/lib/types';
import fs from 'fs';
import path from 'path';

/**
 * 模拟对局数据 (AlphaGo vs 李世石 第一局片段)
 */
const MOCK_SGF = `(;FE[4]GM[1]SZ[19]EV[AlphaGo vs Lee Sedol]RO[1]PB[Lee Sedol]PW[AlphaGo]TM[2h]KM[7.5]RE[W+R]DT[2016-03-09]PC[Seoul]RU[Chinese]GC[The historic first game.]
;B[pd];W[dp];B[pp];W[dd];B[pj];W[nc];B[lc];W[qc];B[pc];W[qd];B[pe];W[rf];B[qg];W[pb];B[ob];W[qb];B[nb];W[qj];B[qk];W[rk];B[ql];W[rl];B[qm];W[rm];B[rn];W[ro];B[qo];W[sn];B[qp];W[rn];B[rq])`;

/**
 * 解析 SGF 字符串 (Server Action)
 */
export async function parseSgfAction(sgfContent: string): Promise<LevelData> {
  return SgfProcessor.parse("uploaded", sgfContent);
}

/**
 * 获取内置名局
 */
export async function getPresetGame(id: string): Promise<LevelData> {
  // 实际开发中可根据 id 加载不同文件，此处暂用 MOCK
  return SgfProcessor.parse(id, MOCK_SGF);
}

/**
 * 获取特定规则文件内容
 */
export async function getRulesContent(type: 'chinese' | 'territory'): Promise<string> {
  try {
    const fileName = type === 'chinese' ? 'AreaScoring.md' : 'TerritoryBasedCounting.md';
    const filePath = path.join(process.cwd(), fileName);
    if (!fs.existsSync(filePath)) {
      return `找不到规则文件: ${fileName}`;
    }
    const content = fs.readFileSync(filePath, 'utf8');
    return content;
  } catch (error) {
    return "无法加载规则文件。";
  }
}
