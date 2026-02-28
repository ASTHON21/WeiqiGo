
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
 * 防御点：在服务端进行二次内容长度和非法字符检查，防止 AI 注入超大负载或 XSS 载荷
 */
export async function parseSgfAction(sgfContent: string): Promise<LevelData> {
  // 限制最大长度 100KB，防止内存溢出攻击
  if (sgfContent.length > 102400) {
    throw new Error("Payload too large");
  }
  
  // 过滤可能的恶意脚本标签
  const sanitized = sgfContent.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, "");
  
  return SgfProcessor.parse("uploaded", sanitized);
}

/**
 * 获取内置名局
 */
export async function getPresetGame(id: string): Promise<LevelData> {
  return SgfProcessor.parse(id, MOCK_SGF);
}

/**
 * 获取特定规则文件内容
 */
export async function getRulesContent(type: 'chinese' | 'territory' = 'chinese', lang: string = 'zh'): Promise<string> {
  try {
    const prefix = lang === 'en' ? 'EN' : 'ZH';
    const fileName = type === 'chinese' ? `${prefix}-AS.md` : `${prefix}-TBC.md`;
    const filePath = path.join(process.cwd(), fileName);
    
    // 路径遍历防御：确保文件名不包含 .. 或 /
    const safeFileName = path.basename(fileName);
    const safePath = path.join(process.cwd(), safeFileName);

    if (!fs.existsSync(safePath)) {
      return `找不到规则文件: ${safeFileName}`;
    }
    
    const content = fs.readFileSync(safePath, 'utf8');
    return content;
  } catch (error) {
    return "无法加载规则文件。";
  }
}
