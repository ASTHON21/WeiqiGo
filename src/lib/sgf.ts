import type { GameHistoryEntry, Move } from './types';

/**
 * Exports a game history entry to SGF (Smart Game Format) string.
 * This format is standard for Go game records and can be opened by most Go software.
 */
export function exportToSGF(game: GameHistoryEntry): string {
  const metadata = game.metadata || {};
  const date = game.date ? new Date(game.date).toISOString().split('T')[0].replace(/-/g, '.') : '';
  
  // Start SGF with basic game info (GM[1] = Go, FF[4] = SGF version 4)
  let sgf = `(;GM[1]FF[4]SZ[${game.boardSize}]`;
  
  // Add metadata tags based on available information
  if (metadata.event) sgf += `EV[${metadata.event}]`;
  if (metadata.blackName) sgf += `PB[${metadata.blackName}]`;
  if (metadata.whiteName) sgf += `PW[${metadata.whiteName}]`;
  if (metadata.komi) sgf += `KM[${metadata.komi}]`;
  if (metadata.rules) sgf += `RU[${metadata.rules}]`;
  if (metadata.result) sgf += `RE[${metadata.result}]`;
  if (date) sgf += `DT[${date}]`;
  if (metadata.place) sgf += `PC[${metadata.place}]`;
  if (metadata.comment) sgf += `GC[${metadata.comment}]`;

  // Add move history
  // SGF uses letters 'a'-'s' for coordinates 0-18. 
  const toSgfChar = (num: number) => String.fromCharCode(num + 97);

  game.moveHistory?.forEach((move: Move) => {
    const playerTag = move.player === 'black' ? 'B' : 'W';
    
    if (move.r === -1 || move.c === -1) {
      // Pass move (empty brackets)
      sgf += `;${playerTag}[]`;
    } else {
      // Coordinate format: col, then row
      const col = toSgfChar(move.c);
      const row = toSgfChar(move.r);
      sgf += `;${playerTag}[${col}${row}]`;
    }
  });

  sgf += ')';
  return sgf;
}
