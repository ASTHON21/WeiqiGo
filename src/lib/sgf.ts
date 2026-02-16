import { GameHistoryEntry, Move } from './types';

function toSGFCoord(n: number): string {
  if (n < 0 || n > 25) return '';
  return String.fromCharCode('a'.charCodeAt(0) + n);
}

function toSGFCoords(r: number, c: number, boardSize: number): string {
    if(r < 0 || c < 0) return '';
    // SGF coordinates have 'a' at the top-left, but our board has (0,0) at top-left
    // SGF y-axis is inverted from our array row index.
    return `${toSGFCoord(c)}${toSGFCoord(r)}`;
}


export function exportToSGF(game: GameHistoryEntry): string {
  const boardSize = game.boardSize;
  const komi = game.result?.scoreDetails?.komi ?? 6.5;
  const result = game.result;

  let resultString = '0';
  if (result?.winner) {
      if(result.winner === 'draw') {
        resultString = '0'
      } else {
        const scoreDiff = Math.abs((result.blackScore ?? 0) - (result.whiteScore ?? 0));
        if (result.winner === 'black') resultString = `B+${scoreDiff}`;
        else if (result.winner === 'white') resultString = `W+${scoreDiff}`;
      }
  }
   if (result?.reason && (result.reason.includes('resigned') || result.reason.includes('time'))) {
     if(result.winner === 'black') resultString = 'B+R';
      else resultString = 'W+R';
   }

  let sgf = `(;FF[4]GM[1]SZ[${boardSize}]KM[${komi}]RE[${resultString}]PB[Player]PW[Shadow AI]DT[${new Date(game.date).toISOString().split('T')[0]}]\n`;
  
  game.moveHistory.forEach((move: Move) => {
    const player = move.player === 'black' ? 'B' : 'W';
    // For pass moves, coords are empty
    const coords = (move.r === -1 && move.c === -1) ? '' : toSGFCoords(move.r, move.c, boardSize);
    sgf += `;${player}[${coords}]`;
  });

  sgf += '\n)';

  return sgf;
}
