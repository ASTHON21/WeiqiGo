
import { Move, Player, LevelData, SgfMetadata } from '../types';

/**
 * SGF 处理器：负责 SGF 字符串与 Move[] 数组、Metadata 的转换
 * 安全加固版：包含内容消毒、深度限制和非法标签防御。
 */
export const SgfProcessor = {
  /**
   * 解析 SGF 内容并返回完整数据
   */
  parse(id: string, rawSgf: string): LevelData {
    // 1. 内容初步消毒：移除潜在的内联 HTML 和脚本，防止 XSS
    const sgfContent = rawSgf
      .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, "")
      .replace(/<\/?[^>]+(>|$)/g, "");

    const handicaps: Move[] = [];
    const moves: Move[] = [];

    // 2. 提取元数据 (11 项核心字段)
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

    // 3. 解析棋盘大小 (限制 2-52)
    const boardSizeMatch = sgfContent.match(/SZ\[(\d+)\]/);
    let boardSize = boardSizeMatch ? parseInt(boardSizeMatch[1]) : 19;
    if (boardSize > 52) boardSize = 19;

    // 4. 解析初始摆子 (AB/AW)
    const setupBlackRegex = /AB(?:\[([a-z]{2})\])+/g;
    const setupWhiteRegex = /AW(?:\[([a-z]{2})\])+/g;

    let match;
    while ((match = setupBlackRegex.exec(sgfContent)) !== null) {
      const coords = this.extractCoordsFromTag(match[0]);
      coords.forEach(c => handicaps.push({ ...c, player: 'black' }));
      if (handicaps.length > 500) break; // 防止死循环攻击
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
      if (moves.length > 1000) break; // 强制截断异常超长棋谱
    }

    return {
      id,
      metadata,
      boardSize,
      handicaps,
      moves,
      totalSteps: moves.length
    };
  },

  private extractTag(content: string, tag: string): string | undefined {
    // 限制标签名为全大写字母，防止异常注入
    if (!/^[A-Z]{1,2}$/.test(tag)) return undefined;
    
    const regex = new RegExp(`${tag}\\[(.*?)\\]`);
    const match = content.match(regex);
    if (!match) return undefined;

    // 对提取的文本内容进行二次过滤
    return match[1].replace(/[<>]/g, "").substring(0, 1024); // 限制单字段长度
  },

  private extractCoordsFromTag(tagContent: string): { r: number, c: number }[] {
    const coords: { r: number, c: number }[] = [];
    const coordRegex = /\[([a-z]{2})\]/g;
    let match;
    while ((match = coordRegex.exec(tagContent)) !== null) {
      coords.push(this.fromSgf(match[1]));
    }
    return coords;
  },

  fromSgf(sgf: string): { r: number; c: number } {
    if (!sgf || sgf.length < 2) return { r: -1, c: -1 };
    const c = sgf.charCodeAt(0) - 97;
    const r = sgf.charCodeAt(1) - 97;
    
    // 范围合法性校验
    if (c < 0 || c > 51 || r < 0 || r > 51) return { r: -1, c: -1 };
    
    return { c, r };
  },

  toSgf(r: number, c: number): string {
    return String.fromCharCode(c + 97) + String.fromCharCode(r + 97);
  }
};
