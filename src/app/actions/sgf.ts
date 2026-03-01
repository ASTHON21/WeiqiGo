
"use server";

import { SgfProcessor } from '@/lib/ai/sgf-processor';
import { LevelData } from '@/lib/types';
import fs from 'fs';
import path from 'path';

/**
 * 解析 SGF 字符串 (Server Action)
 * 安全加固：强化了内容消毒和长度校验。
 */
export async function parseSgfAction(sgfContent: string): Promise<LevelData> {
  // 严格限制最大长度 64KB (防止内存耗尽攻击)
  if (!sgfContent || sgfContent.length > 65536) {
    throw new Error("Payload rejected: file size exceeded safety limit.");
  }
  
  // 基础消毒处理：移除脚本和潜在的 HTML 标签
  const sanitized = sgfContent
    .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, "")
    .replace(/<\/?[^>]+(>|$)/g, "");
  
  // 检查是否包含不可见字符（二进制特征检查）
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(sanitized)) {
    throw new Error("Payload rejected: binary data detected in text field.");
  }
  
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
