
/**
 * 基础类型定义
 */

// 玩家：黑色、白色
export type Player = 'black' | 'white';

// 棋子状态：黑色、白色或空
export type Stone = Player | null;

// 棋盘状态：二维数组
export type BoardState = Stone[][];

/**
 * 落子设定模式
 */
export type MoveSetting = 'direct' | 'confirm' | 'double-click';

/**
 * 动作与历史
 */
export interface Move {
  r: number;          // 行坐标 (0-18)
  c: number;          // 列坐标 (0-18)
  player: Player;     // 落子方
  index?: number;     // 在棋谱中的序号
}

/**
 * SGF 元数据 (11项核心字段)
 */
export interface SgfMetadata {
  event?: string;     // EV
  round?: string;     // RO
  blackName?: string; // PB
  whiteName?: string; // PW
  timeLimit?: string; // TM
  komi?: string;      // KM
  result?: string;    // RE
  date?: string;      // DT
  place?: string;     // PC
  rules?: string;     // RU
  comment?: string;   // GC
}

/**
 * 关卡/棋谱完整数据
 */
export interface LevelData {
  id: string;
  metadata: SgfMetadata;
  boardSize: number;
  handicaps: Move[];
  moves: Move[];
  totalSteps: number;
}

/**
 * 游戏生命周期
 */
export type GameStatus = 'setup' | 'playing' | 'finished';
export type GameMode = 'viewer' | 'practice' | 'online';

export interface GameResult {
  winner: Player | 'draw' | null;
  reason: string;
  blackScore?: number;
  whiteScore?: number;
  // 详细得分数据
  details?: {
    blackTerritory: number;
    whiteTerritory: number;
    blackPrisoners: number;
    whitePrisoners: number;
    blackDeadOnBoard: number;
    whiteDeadOnBoard: number;
    komi: number;
  };
}

export interface GameHistoryEntry {
  id: string;
  date: string;
  mode: GameMode;
  metadata?: SgfMetadata;
  result: GameResult | null;
  moveHistory: Move[];
  boardSize: number;
}
