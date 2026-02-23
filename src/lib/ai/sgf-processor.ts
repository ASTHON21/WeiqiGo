
import { Move, Player, LevelData, SgfMetadata } from '../types';

/**
 * SGF 处理器：负责 SGF 字符串与 Move[] 数组、Metadata 的转换
 */
export const SgfProcessor = {
  /**
   * 解析 SGF 内容并返回完整数据
   */
  parse(id: string, sgfContent: string): LevelData {
    const handicaps: Move[] = [];
    const moves: Move[] = [];

    // 1. 提取元数据 (利用正则匹配 11 项核心字段)
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

    // 2. 解析棋盘大小
    const boardSizeMatch = sgfContent.match(/SZ\[(\d+)\]/);
    const boardSize = boardSizeMatch ? parseInt(boardSizeMatch[1]) : 19;

    // 3. 解析初始摆子 (AB/AW)
    const setupBlackRegex = /AB(?:\[([a-z]{2})\])+/g;
    const setupWhiteRegex = /AW(?:\[([a-z]{2})\])+/g;

    let match;
    while ((match = setupBlackRegex.exec(sgfContent)) !== null) {
      const coords = this.extractCoordsFromTag(match[0]);
      coords.forEach(c => handicaps.push({ ...c, player: 'black' }));
    }
    while ((match = setupWhiteRegex.exec(sgfContent)) !== null) {
      const coords = this.extractCoordsFromTag(match[0]);
      coords.forEach(c => handicaps.push({ ...c, player: 'white' }));
    }

    // 4. 解析落子序列 (;B/W)
    const moveRegex = /;([BW])\[([a-z]{2})\]/g;
    let index = 0;
    while ((match = moveRegex.exec(sgfContent)) !== null) {
      const player: Player = match[1] === 'B' ? 'black' : 'white';
      const coords = this.fromSgf(match[2]);
      if (coords.r !== -1) {
        moves.push({ ...coords, player, index: index++ });
      }
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
    const regex = new RegExp(`${tag}\\[(.*?)\\]`);
    const match = content.match(regex);
    return match ? match[1] : undefined;
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
    return {
      c: sgf.charCodeAt(0) - 97,
      r: sgf.charCodeAt(1) - 97
    };
  },

  toSgf(r: number, c: number): string {
    return String.fromCharCode(c + 97) + String.fromCharCode(r + 97);
  }
};
