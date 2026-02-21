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
  r: number;          // 行坐标 (0-18)
  c: number;          // 列坐标 (0-18)
  player: Player;     // 落子方
  index?: number;     // 在棋谱中的序号
}

/**
 * 镜像关卡系统专用类型
 */
export interface LevelData {
  id: string;
  title: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  boardSize: number;
  handicaps: Move[];  // 初始预摆棋子 (AB/AW)
  moves: Move[];      // 完整对局序列
  totalSteps: number;
}

export interface MirrorGameState {
  currentStepIndex: number; // 当前在 moves 数组中的索引
  isCompleted: boolean;
  isCorrect: boolean | null;
  hintPosition: { r: number; c: number } | null;
}

/**
 * 游戏生命周期
 */
export type GameStatus = 'setup' | 'playing' | 'finished';
export type GameMode = 'mirror' | 'pvp';

/**
 * 评分详细信息 (保留用于对局结束)
 */
export interface ScoreDetails {
  blackStones: number;
  whiteStones: number;
  blackTerritory: number;
  whiteTerritory: number;
  komi: number;
}

export interface GameResult {
  winner: Player | 'draw' | null;
  reason: string;
  blackScore?: number;
  whiteScore?: number;
  scoreDetails?: ScoreDetails;
}

export interface GameHistoryEntry {
  id: string;
  date: string;
  mode: 'mirror' | 'local';
  levelId?: string;
  result: GameResult | null;
  moveHistory: Move[];
  boardSize: number;
}
