export type Player = 'black' | 'white';
export type Stone = Player | null;
export type BoardState = Stone[][];

export type Move = {
  row: number;
  col: number;
  player: Player;
};

export type GameStatus = 'setup' | 'playing' | 'finished';

export type ScoreDetails = {
  blackStones: number;
  whiteStones: number;
  blackTerritory: number;
  whiteTerritory: number;
  komi: number;
};

export type GameResult = {
  winner: Player | 'draw' | null;
  reason: string;
  blackScore?: number;
  whiteScore?: number;
  scoreDetails?: ScoreDetails;
} | null;

export interface GameHistoryEntry {
  id: string;
  date: string;
  mode: 'local' | 'ai';
  result: GameResult;
  moveHistory: Move[];
  boardSize: number;
}

export type GameMode = 'pvp' | 'pve';
export type GamePhase = 'Fuseki' | 'Chuban' | 'Yose' | 'Unknown';
