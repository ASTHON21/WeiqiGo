import { Move, Player, LevelData } from '../types';

/**
 * GIB 处理器：负责 GIB 字符串（弈城 Tygem 格式）与 Move[] 数组、Metadata 的转换
 */
export const GibProcessor = {
  /**
   * 解析 GIB 内容并返回完整数据
   */
  parse(id: string, content: string): LevelData {
    const moves: Move[] = [];
    let boardSize = 19;
    let blackName = "Black";
    let whiteName = "White";
    let result = "Unknown";
    let date = "";
    let event = "Tygem Game";
    let komi = "6.5";

    const lines = content.split(/\r?\n/);
    let moveIndex = 0;

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      // 1. 解析初始化信息 (INI)
      if (line.startsWith('INI')) {
        const parts = line.split(/\s+/);
        if (parts.length >= 3) {
          boardSize = parseInt(parts[2]) || 19;
        }
      }

      // 2. 解析元数据 (GAMETAG)
      if (line.includes('WHITENAME]')) whiteName = line.split('WHITENAME]')[1] || whiteName;
      if (line.includes('BLACKNAME]')) blackName = line.split('BLACKNAME]')[1] || blackName;
      if (line.includes('GAME_DATE]')) date = line.split('GAME_DATE]')[1] || date;
      if (line.includes('GAME_TITLE]')) event = line.split('GAME_TITLE]')[1] || event;
      if (line.includes('RESULT]')) result = line.split('RESULT]')[1] || result;
      if (line.includes('KOMI]')) komi = line.split('KOMI]')[1] || komi;

      // 3. 解析落子指令 (STO 类型)
      // 格式通常为: STO 0 <序号> <颜色ID:1为黑,2为白> <X> <Y>
      if (line.startsWith('STO 0')) {
        const parts = line.split(/\s+/);
        if (parts.length >= 6) {
          const colorCode = parseInt(parts[3]);
          const x = parseInt(parts[4]);
          const y = parseInt(parts[5]);
          const player: Player = colorCode === 1 ? 'black' : 'white';
          
          if (x >= 0 && x < boardSize && y >= 0 && y < boardSize) {
            moves.push({
              r: y, // GIB 中 Y 通常对应行
              c: x, // X 对应列
              player,
              index: moveIndex++
            });
          }
        }
      }

      // 4. 解析落子序列 ([MOVE] 后续的逗号分隔格式)
      // 部分 GIB 格式在 [MOVE] 标签下直接列出: 序号,颜色,X,Y
      if (/^\d+,\d+,\d+,\d+$/.test(line)) {
        const [idx, color, x, y] = line.split(',').map(Number);
        const player: Player = color === 1 ? 'black' : 'white';
        if (x >= 0 && x < boardSize && y >= 0 && y < boardSize) {
          moves.push({
            r: y,
            c: x,
            player,
            index: moveIndex++
          });
        }
      }
    }

    return {
      id,
      metadata: {
        event,
        blackName,
        whiteName,
        result,
        date,
        komi,
        rules: "Japanese"
      },
      boardSize,
      handicaps: [],
      moves,
      totalSteps: moves.length
    };
  }
};
