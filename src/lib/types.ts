/**
 * 基础类型定义
 */

// 玩家：黑色、白色或无（null）
export type Player = 'black' | 'white';

// 棋子状态：黑色、白色或空
export type Stone = Player | null;

// 棋盘状态：二维数组
export type BoardState = Stone[][];

/**
 * 动作与历史
 */
export interface Move {
  r: number;          // 行坐标 (-1 表示停着/Pass，0-18 表示落子)
  c: number;          // 列坐标 (-1 表示停着/Pass，0-18 表示落子)
  player: Player;     // 落子方
  t?: number;         // 时间戳 (可选)
}

/**
 * 游戏生命周期与模式
 */
export type GameStatus = 'setup' | 'playing' | 'finished';
export type GameMode = 'pvp' | 'pve';
export type GamePhase = 'Fuseki' | 'Chuban' | 'Yose' | 'Unknown';

/**
 * 评分与结算详细信息
 */
export interface ScoreDetails {
  blackStones: number;    // 黑棋子数
  whiteStones: number;    // 白棋子数
  blackTerritory: number; // 黑地（目数）
  whiteTerritory: number; // 白地（目数）
  komi: number;           // 贴目 (通常为 7.5)
}

/**
 * 游戏结果封装
 */
export interface GameResult {
  winner: Player | 'draw' | null;
  reason: string;
  blackScore?: number;
  whiteScore?: number;
  scoreDetails?: ScoreDetails;
}

/**
 * 对局历史记录
 */
export interface GameHistoryEntry {
  id: string;
  date: string;
  mode: 'local' | 'ai';
  result: GameResult | null;
  moveHistory: Move[];
  boardSize: number;
}

/**
 * AI 引擎相关接口 (与 ShadowEngine 对齐)
 */
export interface AiResponse {
  bestMove: Move | null;
  explanation: string;   // 决策依据
  gamePhase: GamePhase | string;
  debugLog?: any;        // 调试信息
  confidence?: number;   // 置信度 (可选)
}

/**
 * 字典条目接口 (与 DictionaryManager 对齐)
 */
export interface SgfDatabaseEntry {
  hash: string;          // 路径哈希
  nextMove: string;      // SGF 格式坐标 (如 "pd")
  source: string;        // 来源 SGF 文件名
}
