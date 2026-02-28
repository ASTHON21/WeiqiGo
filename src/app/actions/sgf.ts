
"use server";

import { SgfProcessor } from '@/lib/ai/sgf-processor';
import { LevelData } from '@/lib/types';
import fs from 'fs';
import path from 'path';

/**
 * 解析 SGF 字符串 (Server Action)
 * 防御点：在服务端进行二次内容长度和非法字符检查，防止负载攻击。
 */
export async function parseSgfAction(sgfContent: string): Promise<LevelData> {
  // 限制最大长度 100KB
  if (sgfContent.length > 102400) {
    throw new Error("Payload too large");
  }
  
  // 基础消毒处理
  const sanitized = sgfContent.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, "");
  
  return SgfProcessor.parse("uploaded", sanitized);
}

/**
 * 获取内置名局
 */
export async function getPresetGame(id: string): Promise<LevelData> {
  // 简单的 Mock 数据
  const MOCK_SGF = `(;FE[4]GM[1]SZ[19]EV[AlphaGo vs Lee Sedol]RO[1]PB[Lee Sedol]PW[AlphaGo]TM[2h]KM[7.5]RE[W+R]DT[2016-03-09]PC[Seoul]RU[Chinese]GC[The historic first game.]
;B[pd];W[dp];B[pp];W[dd];B[pj];W[nc];B[lc];W[qc];B[pc];W[qd];B[pe];W[rf];B[qg];W[pb];B[ob];W[qb];B[nb];W[qj];B[qk];W[rl];B[qm];W[rm];B[rn];W[ro];B[qo];W[sn];B[qp];W[rn];B[rq])`;
  return SgfProcessor.parse(id, MOCK_SGF);
}

/**
 * 获取特定规则文件内容 (已加固路径遍历防护)
 */
export async function getRulesContent(type: 'chinese' | 'territory' = 'chinese', lang: string = 'zh'): Promise<string> {
  try {
    const prefix = lang === 'en' ? 'EN' : 'ZH';
    const fileName = type === 'chinese' ? `${prefix}-AS.md` : `${prefix}-TBC.md`;
    
    // 严格防御：仅允许读取项目根目录下的特定白名单文件
    const allowedFiles = ['EN-AS.md', 'ZH-AS.md', 'EN-TBC.md', 'ZH-TBC.md'];
    const safeFileName = path.basename(fileName);
    
    if (!allowedFiles.includes(safeFileName)) {
      throw new Error("Unauthorized file access");
    }

    const safePath = path.join(process.cwd(), safeFileName);

    if (!fs.existsSync(safePath)) {
      return `Rules file not found: ${safeFileName}`;
    }
    
    const content = fs.readFileSync(safePath, 'utf8');
    return content;
  } catch (error) {
    console.error("Rules Loading Error:", error);
    return "Unable to load rule guide.";
  }
}
