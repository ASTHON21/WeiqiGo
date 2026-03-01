
"use server";

import { SgfProcessor } from '@/lib/ai/sgf-processor';
import { LevelData } from '@/lib/types';
import fs from 'fs';
import path from 'path';

/**
 * Parses SGF string via Server Action.
 * Enhanced security: enforces payload limits and strict sanitization.
 */
export async function parseSgfAction(sgfContent: string): Promise<LevelData> {
  // Hard limit: 64KB
  if (!sgfContent || sgfContent.length > 65536) {
    throw new Error("Payload rejected: file size exceeded safety limit.");
  }
  
  // Basic content cleaning
  const sanitized = sgfContent
    .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, "")
    .replace(/<\/?[^>]+(>|$)/g, "");
  
  // Detection of non-textual characters
  if (/[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(sanitized)) {
    throw new Error("Payload rejected: binary data detected in text field.");
  }
  
  return SgfProcessor.parse("uploaded", sanitized);
}

/**
 * Fetches built-in game records.
 */
export async function getPresetGame(id: string): Promise<LevelData> {
  const MOCK_SGF = `(;FE[4]GM[1]SZ[19]EV[AlphaGo vs Lee Sedol]RO[1]PB[Lee Sedol]PW[AlphaGo]TM[2h]KM[7.5]RE[W+R]DT[2016-03-09]PC[Seoul]RU[Chinese]GC[The historic first game.]
;B[pd];W[dp];B[pp];W[dd];B[pj];W[nc];B[lc];W[qc];B[pc];W[qd];B[pe];W[rf];B[qg];W[pb];B[ob];W[qb];B[nb];W[qj];B[qk];W[rl];B[qm];W[rm];B[rn];W[ro];B[qo];W[sn];B[qp];W[rn];B[rq])`;
  return SgfProcessor.parse(id, MOCK_SGF);
}

/**
 * Loads rules documentation with path traversal protection.
 */
export async function getRulesContent(type: 'chinese' | 'territory' = 'chinese', lang: string = 'zh'): Promise<string> {
  try {
    const prefix = lang === 'en' ? 'EN' : 'ZH';
    const fileName = type === 'chinese' ? `${prefix}-AS.md` : `${prefix}-TBC.md`;
    
    // Strict whitelist of allowed files
    const allowedFiles = ['EN-AS.md', 'ZH-AS.md', 'EN-TBC.md', 'ZH-TBC.md'];
    const safeFileName = path.basename(fileName);
    
    if (!allowedFiles.includes(safeFileName)) {
      throw new Error("Unauthorized file access attempt detected.");
    }

    const safePath = path.join(process.cwd(), safeFileName);

    if (!fs.existsSync(safePath)) {
      return `Rules documentation not found: ${safeFileName}`;
    }
    
    const content = fs.readFileSync(safePath, 'utf8');
    return content;
  } catch (error) {
    console.error("Rules Loading Error:", error);
    return "Refining access protocol... Unable to load rule guide.";
  }
}
