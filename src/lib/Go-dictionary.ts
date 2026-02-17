import josekiData from './GoDictionary.json';
import type { BoardState, Player, Move } from './types';

/**
 * Transforms relative corner coordinates to absolute board coordinates for any of the 4 corners.
 * This allows a single joseki pattern to be checked against all four corners of the board.
 * @param rel_r Relative row from the corner (e.g., 0, 1, 2...).
 * @param rel_c Relative column from the corner.
 * @param corner The corner to transform to (0: TL, 1: TR, 2: BR, 3: BL).
 * @param size The size of the board (e.g., 19).
 * @returns Absolute {r, c} coordinates on the board.
 */
function getBoardPoint(rel_r: number, rel_c: number, corner: number, size: number): { r: number; c: number } {
  const maxIdx = size - 1;
  switch (corner) {
    case 0: return { r: rel_r, c: rel_c }; // Top-Left
    case 1: return { r: rel_c, c: maxIdx - rel_r }; // Top-Right (rotated)
    case 2: return { r: maxIdx - rel_r, c: maxIdx - rel_c }; // Bottom-Right (rotated)
    case 3: return { r: maxIdx - rel_c, c: rel_r }; // Bottom-Left (rotated)
    default: return { r: rel_r, c: rel_c };
  }
}

/**
 * Searches the Joseki dictionary for a matching pattern on the current board.
 * @param board The current state of the board.
 * @param player The player whose turn it is.
 * @param size The size of the board.
 * @returns A suggested Move if a pattern is matched, otherwise null.
 */
export function findMoveFromDictionary(board: BoardState, player: Player, size: number): Move | null {
  const opponent = player === 'black' ? 'white' : 'black';

  // Iterate through all 4 corners
  for (let corner = 0; corner < 4; corner++) {
    for (const joseki of josekiData.joseki) {
      let isMatch = true;
      let recommendedMove: Move | null = null;

      // Check each step in the sequence
      for (const step of joseki.sequence) {
        if (step.next_move) {
          // This is the move the AI should make
          const movePos = getBoardPoint(step.next_move.rel_r, step.next_move.rel_c, corner, size);
          
          // If the spot is empty, it's a potential move
          if (board[movePos.r]?.[movePos.c] === null) {
            recommendedMove = { r: movePos.r, c: movePos.c, player };
          } else {
            // If the spot is taken, this joseki path is not applicable right now.
            isMatch = false;
            break;
          }
        } else if (step.owner) {
          // This is a verification step for an existing stone
          const pos = getBoardPoint(step.rel_r, step.rel_c, corner, size);
          const expectedOwner = step.owner === 'self' ? player : opponent;

          if (board[pos.r]?.[pos.c] !== expectedOwner) {
            isMatch = false;
            break;
          }
        }
      }

      // If all steps matched and we have a recommended move, return it
      if (isMatch && recommendedMove) {
        // Validate the move before returning
        const { r, c } = recommendedMove;
        if (r >= 0 && r < size && c >= 0 && c < size && board[r][c] === null) {
          return recommendedMove;
        }
      }
    }
  }

  return null; // No matching joseki found
}
