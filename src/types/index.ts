export type Player = 'B' | 'W';
export type Cell = Player | '_';
export type Board = Cell[][];

export type Move = {
  row: number;
  col: number;
  player: Player;
};

export type GamePhase = 'Fuseki' | 'Chuban' | 'Yose' | 'Unknown';
