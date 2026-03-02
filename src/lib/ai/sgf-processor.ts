import { Move, Player, LevelData, SgfMetadata } from '../types';

/**
 * SGF 处理器：负责 SGF 字符串与 Move[] 数组、Metadata 的转换
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
      date: this.extractTag(sgfContent, 'DT'),
      place: this.extractTag(sgfContent, 'PC'),
      blackName: this.extractTag(sgfContent, 'PB'),
      whiteName: this.extractTag(sgfContent, 'PW'),
      result: this.extractTag(sgfContent, 'RE'),
      komi: this.extractTag(sgfContent, 'KM'),
      comment: this.extractTag(sgfContent, 'GC'),
    };

    // 3. 解析棋盘大小
    const boardSizeMatch = sgfContent.match(/SZ\[(\d+)\]/);
    let boardSize = boardSizeMatch ? parseInt(boardSizeMatch[1]) : 19;
    if (boardSize > 52) boardSize = 19;

    // 4. 解析预置子 (AB/AW)
    const setupBlackRegex = /AB(?:\[([a-z]{2})\])+/g;
    const setupWhiteRegex = /AW(?:\[([a-z]{2})\])+/g;
    
    let match: RegExpExecArray | null;
    while ((match = setupBlackRegex.exec(sgfContent)) !== null) {
      const coords = this.extractCoordsFromTag(match[0]);
      coords.forEach(coord => handicaps.push({ ...coord, player: 'black' }));
    }
    while ((match = setupWhiteRegex.exec(sgfContent)) !== null) {
      const coords = this.extractCoordsFromTag(match[0]);
      coords.forEach(coord => handicaps.push({ ...coord, player: 'white' }));
    }

    // 5. 解析落子序列 (;B/W)
    const moveRegex = /;([BW])\[([a-z]{2})\]/g;
    let index = 0;
    while ((match = moveRegex.exec(sgfContent)) !== null) {
      const player: Player = match[1] === 'B' ? 'black' : 'white';
      const str = match[2];
      moves.push({
        c: str.charCodeAt(0) - 97,
        r: str.charCodeAt(1) - 97,
        player,
        index: index++
      });
    }

    return {
      id,
      boardSize,
      handicaps,
      moves,
      metadata,
      totalSteps: moves.length
    };
  }

  private static extractTag(sgf: string, tag: string): string {
    const regex = new RegExp(`${tag}\\[([^\\]]*)\\]`);
    const match = sgf.match(regex);
    return match ? match[1] : '';
  }

  private static extractCoordsFromTag(tag: string): { r: number, c: number }[] {
    const coords: { r: number, c: number }[] = [];
    const res = tag.match(/\[([a-z]{2})\]/g);
    if (res) {
      res.forEach(m => {
        const str = m.substring(1, 3);
        coords.push({
          c: str.charCodeAt(0) - 97,
          r: str.charCodeAt(1) - 97
        });
      });
    }
    return coords;
  }
}
