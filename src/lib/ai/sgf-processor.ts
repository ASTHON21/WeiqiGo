
import { Move, Player, LevelData, SgfMetadata } from '../types';

/**
 * SGF 处理器：负责 SGF 字符串与 Move[] 数组、Metadata 的转换
 * 安全加固版：修复了静态类成员语法错误，增强了正则匹配的鲁棒性。
 */
export class SgfProcessor {
  /**
   * 解析 SGF 内容并返回完整数据
   */
  static parse(id: string, rawSgf: string): LevelData {
    // 1. 内容初步消毒：移除潜在的内联 HTML 和脚本
    const sgfContent = rawSgf
      .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, "")
      .replace(/<\/?[^>]+(>|$)/g, "");

    const handicaps: Move[] = [];
    const moves: Move[] = [];

    // 2. 提取元数据
    const metadata: SgfMetadata = {
      event: this.extractTag(sgfContent, 'EV'),
      round: this.extractTag(sgfContent, 'RO'),
      blackName: this.extractTag(sgfContent, 'PB'),
      whiteName: this.extractTag(sgfContent, 'PW'),
      timeLimit: this.extractTag(sgfContent, 'TM'),
      komi: this.extractTag(sgfContent, 'KM'),
      result: this.extractTag(sgfContent, 'RE'),
      date: this.extractTag(sgfContent, 'DT'),
      place: this.extractTag(sgfContent, 'PC'),
      rules: this.extractTag(sgfContent, 'RU'),
      comment: this.extractTag(sgfContent, 'GC'),
    };

    // 3. 解析棋盘大小
    const boardSizeMatch = sgfContent.match(/SZ\[(\d+)\]/);
    let boardSize = boardSizeMatch ? parseInt(boardSizeMatch[1]) : 19;
    if (boardSize > 52) boardSize = 19;

    // 4. 解析初始摆子 (AB/AW)
    const setupBlackRegex = /AB(?:\[([a-z]{2})\])+/g;
    const setupWhiteRegex = /AW(?:\[([a-z]{2})\])+/g;

    let match: RegExpExecArray | null;
    while ((match = setupBlackRegex.exec(sgfContent)) !== null) {
      const coords = this.extractCoordsFromTag(match[0]);
      coords.forEach(c => handicaps.push({ ...c, player: 'black' }));
      if (handicaps.length > 500) break;
    }
    while ((match = setupWhiteRegex.exec(sgfContent)) !== null) {
      const coords = this.extractCoordsFromTag(match[0]);
      coords.forEach(c => handicaps.push({ ...c, player: 'white' }));
      if (handicaps.length > 500) break;
    }

    // 5. 解析落子序列 (;B/W)
    const moveRegex = /;([BW])\[([a-z]{2})\]/g;
    let index = 0;
    while ((match = moveRegex.exec(sgfContent)) !== null) {
      const player: Player = match[1] === 'B' ? 'black' : 'white';
      const coords = this.fromSgf(match[2]);
      if (coords.r !== -1) {
        moves.push({ ...coords, player, index: index++ });
      }
      if (moves.length > 1000) break;
    }

    return {
      id,
      metadata,
      boardSize,
      handicaps,
      moves,
      totalSteps: moves.length
    };
  }

  private static extractTag(content: string, tag: string): string | undefined {
    if (!/^[A-Z]{1,2}$/.test(tag)) return undefined;
    
    const regex = new RegExp(`${tag}\\[(.*?)\\]`);
    const match = content.match(regex);
    if (!match) return undefined;

    return match[1].replace(/[<>]/g, "").substring(0, 1024);
  }

  private static extractCoordsFromTag(tagContent: string): { r: number, c: number }[] {
    const coords: { r: number, c: number }[] = [];
    const coordRegex = /\[([a-z]{2})\]/g;
    let match: RegExpExecArray | null;
    while ((match = coordRegex.exec(tagContent)) !== null) {
      coords.push(this.fromSgf(match[1]));
    }
    return coords;
  }

  static fromSgf(sgf: string): { r: number; c: number } {
    if (!sgf || sgf.length < 2) return { r: -1, c: -1 };
    const c = sgf.charCodeAt(0) - 97;
    const r = sgf.charCodeAt(1) - 97;
    
    if (c < 0 || c > 51 || r < 0 || r > 51) return { r: -1, c: -1 };
    
    return { c, r };
  }

  static toSgf(r: number, c: number): string {
    return String.fromCharCode(c + 97) + String.fromCharCode(r + 97);
  }
}
