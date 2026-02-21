import { Move, Player, LevelData } from '../types';

/**
 * SGF 处理器：专门用于解析关卡对局
 * 负责将复杂的 SGF 字符串转换为前端可直接执行的 Move 数组
 */
export const SgfProcessor = {
  /**
   * 核心方法：解析完整的 SGF 内容并返回关卡数据
   * @param id 关卡唯一标识符
   * @param sgfContent 原始 SGF 字符串内容
   * @returns 返回符合 LevelData 接口的完整关卡数据
   */
  parseLevel(id: string, sgfContent: string): LevelData {
    const handicaps: Move[] = [];
    const moves: Move[] = [];

    // 1. 解析棋盘大小 (SZ 标签)
    const boardSizeMatch = sgfContent.match(/SZ\[(\d+)\]/);
    const boardSize = boardSizeMatch ? parseInt(boardSizeMatch[1]) : 19;

    // 2. 解析初始摆子 (Setup Moves)
    // SGF 中 AB[pd][dp] 表示添加黑子，AW[...] 表示添加白子
    const setupBlackRegex = /AB(?:\[([a-z]{2})\])+/g;
    const setupWhiteRegex = /AW(?:\[([a-z]{2})\])+/g;

    let match;
    // 匹配所有 AB 标签下的坐标
    while ((match = setupBlackRegex.exec(sgfContent)) !== null) {
      const coords = this.extractCoordsFromTag(match[0]);
      coords.forEach(c => handicaps.push({ ...c, player: 'black' }));
    }
    // 匹配所有 AW 标签下的坐标
    while ((match = setupWhiteRegex.exec(sgfContent)) !== null) {
      const coords = this.extractCoordsFromTag(match[0]);
      coords.forEach(c => handicaps.push({ ...c, player: 'white' }));
    }

    // 3. 解析正谱序列 (Main Sequence)
    // 匹配类似 ;B[pd] 或 ;W[dp] 的结构
    const moveRegex = /;([BW])\[([a-z]{2})\]/g;
    let index = 0;
    while ((match = moveRegex.exec(sgfContent)) !== null) {
      const player: Player = match[1] === 'B' ? 'black' : 'white';
      const coords = this.fromSgf(match[2]);
      moves.push({ ...coords, player, index: index++ });
    }

    // 4. 尝试解析标题和描述 (简易实现)
    const pbMatch = sgfContent.match(/PB\[(.*?)\]/);
    const pwMatch = sgfContent.match(/PW\[(.*?)\]/);
    const title = pbMatch && pwMatch ? `${pbMatch[1]} vs ${pwMatch[1]}` : `名局复刻: ${id}`;

    return {
      id,
      title,
      description: "遵循 AlphaGo 的落子轨迹，学习顶尖人工智能的围棋逻辑。",
      difficulty: 'Hard',
      boardSize,
      handicaps,
      moves,
      totalSteps: moves.length
    };
  },

  /**
   * 辅助方法：从类似 AB[pd][dp] 的字符串中提取所有坐标对
   */
  private extractCoordsFromTag(tagContent: string): { r: number, c: number }[] {
    const coords: { r: number, c: number }[] = [];
    const coordRegex = /\[([a-z]{2})\]/g;
    let match;
    while ((match = coordRegex.exec(tagContent)) !== null) {
      coords.push(this.fromSgf(match[1]));
    }
    return coords;
  },

  /**
   * 将 SGF 字母坐标转换为 0-18 的数字坐标
   * 例如: "pd" -> {r: 3, c: 15} (注意 SGF 格式通常是 col, row)
   */
  fromSgf(sgf: string): { r: number; c: number } {
    if (!sgf || sgf.length < 2) return { r: -1, c: -1 };
    return {
      c: sgf.charCodeAt(0) - 97, // 第一位是列 (column)
      r: sgf.charCodeAt(1) - 97  // 第二位是行 (row)
    };
  },

  /**
   * 将数字坐标转回 SGF 坐标（用于提示或日志）
   */
  toSgf(r: number, c: number): string {
    return String.fromCharCode(c + 97) + String.fromCharCode(r + 97);
  }
};
