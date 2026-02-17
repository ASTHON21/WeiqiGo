
import type { BoardState, Player, Move, GamePhase } from './types';
import { processMove } from './go-logic';

/**
 * 真眼识别逻辑：
 * 1. 该坐标必须为空。
 * 2. 上下左右四个邻点必须全是己方棋子（或是棋盘边界）。
 * 3. 对角线四个点中，至少有 3 个是己方棋子（边缘和角部要求更严）。
 */
function isTrueEye(board: BoardState, r: number, c: number, player: Player): boolean {
    const size = board.length;
    if (board[r][c] !== null) return false;

    // A. 检查上下左右（十字邻点）
    const neighbors = [
        { r: r - 1, c }, { r: r + 1, c }, { r, c: c - 1 }, { r, c: c + 1 }
    ];
    for (const n of neighbors) {
        if (n.r >= 0 && n.r < size && n.c >= 0 && n.c < size) {
            if (board[n.r][n.c] !== player) return false;
        }
        // 注意：边界在围棋中被视为“天然的保护”，所以超出边界不计入失败
    }

    // B. 检查对角线点
    const diagonals = [
        { r: r - 1, c: c - 1 }, { r: r - 1, c: c + 1 },
        { r: r + 1, c: c - 1 }, { r: r + 1, c: c + 1 }
    ];
    
    let ownDiagonals = 0;
    let edgeCount = 0;

    for (const d of diagonals) {
        if (d.r >= 0 && d.r < size && d.c >= 0 && d.c < size) {
            if (board[d.r][d.c] === player) ownDiagonals++;
        } else {
            edgeCount++;
        }
    }

    // 判断真眼的经典标准：
    // 在中腹：至少需要 3 个对角线是自己的棋子
    // 在边缘或角部：所有的对角线（存在的那些）都必须是自己的
    if (edgeCount === 0) {
        return ownDiagonals >= 3;
    } else {
        return ownDiagonals + edgeCount === 4;
    }
}


function evaluateBoard(board: BoardState, player: Player, boardSize: number): number {
    let score = 0;
    const opponent = player === 'black' ? 'white' : 'black';

    for (let r = 0; r < boardSize; r++) {
        for (let c = 0; c < boardSize; c++) {
            const stone = board[r][c];
            if (stone === player) {
                score++;
            } else if (stone === opponent) {
                score--;
            } else { // Empty point
                let isPlayerTerritory = true;
                let isOpponentTerritory = true;
                
                // Simplified territory check
                const neighbors = [{r:r-1,c:c}, {r:r+1,c:c}, {r:r,c:c-1}, {r:r,c:c+1}];
                for(const n of neighbors) {
                    if(n.r >= 0 && n.r < boardSize && n.c >= 0 && n.c < boardSize) {
                        if(board[n.r][n.c] === player) isOpponentTerritory = false;
                        if(board[n.r][n.c] === opponent) isPlayerTerritory = false;
                    }
                }
                if(isPlayerTerritory && !isOpponentTerritory) score += 0.5;
                if(isOpponentTerritory && !isPlayerTerritory) score -= 0.5;
            }
        }
    }

    // Komi for white
    if (player === 'white') {
        score += 6.5;
    } else {
        score -= 6.5; // From white's perspective
    }
    
    return score;
}

/**
 * 增强型局部评估：针对 SGF 棋谱中 AI 乱落子的问题进行专项修复
 */
function getShapeBonus(board: BoardState, r: number, c: number, player: Player): number {
    if (r === -1 || c === -1) return 0; // No shape bonus for pass
    let bonus = 0;
    const size = board.length;
    const opponent = player === 'black' ? 'white' : 'black';

    // A. 边缘惩罚：防止 SGF 中出现的 AI 在 (0,0), (0,1) 等一路上盲目落子
    // 除非是为了提子或救子，否则一路上落子权重极低
    if (r === 0 || r === size - 1 || c === 0 || c === size - 1) {
        bonus -= 200;
    }

    // B. 简单眼位意识：尝试在自己棋子周围落子（增加连接性）
    const neighbors = [
        {r: r-1, c}, {r: r+1, c}, {r, c: c-1}, {r, c: c+1}
    ].filter(p => p.r >= 0 && p.r < size && p.c >= 0 && p.c < size);

    neighbors.forEach(n => {
        if (board[n.r][n.c] === player) bonus += 50; // 鼓励连接
        if (board[n.r][n.c] === opponent) bonus += 30; // 鼓励紧气
    });

    return bonus;
}

/**
 * 通用棋盘位置权重表
 * 支持 9x9, 13x13, 19x19 自动适配
 */
function getPositionWeight(r: number, c: number, size: number): number {
    let weight = 0;
    
    // 计算棋盘中心点和各条线的位置
    const center = Math.floor(size / 2);
    const thirdLine = 2;  // 三线距离边界的距离
    const fourthLine = 3; // 四线距离边界的距离
    
    // 动态计算星位（根据棋盘大小自动调整）
    const starPoints = calculateStarPoints(size);
    
    // 1. 星位奖励（根据不同棋盘动态计算）
    if (isStarPoint(r, c, size, starPoints)) {
        weight += 150;
    }
    
    // 2. 金边银角：三线四线奖励
    const distanceToEdge = Math.min(r, c, size - 1 - r, size - 1 - c);
    
    if (distanceToEdge === thirdLine) {
        weight += 100;  // 三线
    } else if (distanceToEdge === fourthLine) {
        weight += 80;   // 四线
    } else if (distanceToEdge === 1) {
        weight += 30;   // 二线（有一定价值）
    }
    
    // 3. 一路死亡线惩罚（除非特殊情况）
    if (distanceToEdge === 0) {
        weight -= 200;
    }
    
    // 4. 中央区域轻微惩罚（围棋重视边角）
    if (distanceToEdge >= 5) {
        weight -= 20;
    }
    
    // 5. 天元奖励（棋盘正中心）
    if (size % 2 === 1 && r === center && c === center) {
        weight += 50;
    }
    
    return weight;
}

/**
 * 动态计算星位坐标
 */
function calculateStarPoints(size: number): number[] {
    if (size === 9) {
        return [2, 4, 6];  // 9x9 星位
    } else if (size === 13) {
        return [3, 6, 9];  // 13x13 星位
    } else {  // 19x19
        return [3, 9, 15]; // 19x19 星位
    }
}

/**
 * 判断是否是星位
 */
function isStarPoint(r: number, c: number, size: number, starPoints: number[]): boolean {
    // 星位必须同时在行和列上都是星位坐标
    if (!starPoints.includes(r) || !starPoints.includes(c)) {
        return false;
    }
    
    // 检查是否是标准的角部星位（不是边星）
    const isCornerStar = starPoints.includes(r) && starPoints.includes(c);
    
    // 对于 19x19，还要区分角星和边星，这里统一都给奖励
    return isCornerStar;
}

/**
 * 增强版：带棋理的权重计算
 */
function getAdvancedPositionWeight(
    r: number, 
    c: number, 
    size: number,
    moveCount: number,      // 当前手数
    board: BoardState          // 棋盘状态
): number {
    let weight = getPositionWeight(r, c, size);
    
    const distanceToEdge = Math.min(r, c, size - 1 - r, size - 1 - c);
    
    // 根据棋局阶段动态调整
    if (moveCount < 20) {  // 布局阶段
        // 强化角部，弱化中央
        if (distanceToEdge <= 3) {
            weight *= 1.2;  // 边角价值提升
        } else {
            weight *= 0.8;  // 中央价值降低
        }
    } else if (moveCount > size * size * 0.7) {  // 官子阶段
        // 一路和二线价值提升
        if (distanceToEdge <= 1) {
            weight *= 1.5;  // 官子时边路价值大增
        }
    }
    
    // 检查是否为空角（周围没有棋子）
    if (isEmptyCorner(r, c, board, size)) {
        weight *= 1.3;  // 空角价值更高
    }
    
    return Math.round(weight);
}

/**
 * 检查是否是空角
 */
function isEmptyCorner(r: number, c: number, board: BoardState, size: number): boolean {
    // 只检查四个角部区域
    const isCorner = (r < 5 && c < 5) ||          // 左上
                     (r < 5 && c > size - 6) ||    // 右上
                     (r > size - 6 && c < 5) ||    // 左下
                     (r > size - 6 && c > size - 6); // 右下
    
    if (!isCorner) return false;
    
    // 检查周围5x5范围是否有棋子
    for (let dr = -2; dr <= 2; dr++) {
        for (let dc = -2; dc <= 2; dc++) {
            const nr = r + dr;
            const nc = c + dc;
            if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                if (board[nr][nc] !== null) {
                    return false;  // 有棋子，不是空角
                }
            }
        }
    }
    
    return true;  // 确实是空角
}


function getPossibleMoves(board: BoardState, size: number): Move[] {
    const moves: Move[] = [];
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (board[r][c] === null) {
                // The 'player' property is a placeholder, it will be set by the caller.
                moves.push({ r, c, player: 'black' });
            }
        }
    }
    return moves;
}

const SEARCH_DEPTH = 2; // Keep depth low for performance

function alphaBeta(
    board: BoardState,
    boardHistory: BoardState[],
    depth: number,
    alpha: number,
    beta: number,
    maximizingPlayer: boolean,
    player: Player
): number {
    if (depth === 0) {
        const originalPlayer = (maximizingPlayer) ? player : (player === 'black' ? 'white' : 'black');
        return evaluateBoard(board, originalPlayer, board.length);
    }

    const opponent: Player = player === 'black' ? 'white' : 'black';
    const possibleMoves = getPossibleMoves(board, board.length);
    // Note: This simplified getPossibleMoves doesn't include passing.
    // The alpha-beta search tree will just bottom out if no moves are possible.

    if (maximizingPlayer) {
        let maxEval = -Infinity;
        for (const move of possibleMoves) {
            const { success, newBoard } = processMove(board, move.r, move.c, player, boardHistory);
            if (!success) continue;
            const value = alphaBeta(newBoard, [...boardHistory, newBoard], depth - 1, alpha, beta, false, opponent);
            maxEval = Math.max(maxEval, value);
            alpha = Math.max(alpha, value);
            if (beta <= alpha) {
                break;
            }
        }
        return maxEval;
    } else { // Minimizing player
        let minEval = Infinity;
        for (const move of possibleMoves) {
            const { success, newBoard } = processMove(board, move.r, move.c, player, boardHistory);
            if (!success) continue;
            const value = alphaBeta(newBoard, [...boardHistory, newBoard], depth - 1, alpha, beta, true, opponent);
            minEval = Math.min(minEval, value);
            beta = Math.min(beta, value);
            if (beta <= alpha) {
                break;
            }
        }
        return minEval;
    }
}


export function findBestMove(
  board: BoardState,
  player: Player,
  moveHistory: Move[],
  boardSize: number,
  boardHistory: BoardState[]
) {
  const startTime = Date.now();

  const moveCount = moveHistory.length;
  let gamePhase: GamePhase = 'Fuseki';
  if (moveCount > (boardSize * boardSize) * 0.7) {
    gamePhase = 'Yose';
  } else if (moveCount > (boardSize * boardSize) * 0.25) {
    gamePhase = 'Chuban';
  }

  const possibleMoves = getPossibleMoves(board, boardSize);
  possibleMoves.push({ r: -1, c: -1, player }); // Add Pass move

  if (possibleMoves.length === 0) {
    return {
      bestMove: { r: -1, c: -1, player },
      explanation: 'No valid moves found, passing.',
      gamePhase,
    };
  }

  let bestValue = -Infinity;
  let bestMove: Move = { r: -1, c: -1, player }; // Default to passing
  const opponent: Player = player === 'black' ? 'white' : 'black';

  for (const move of possibleMoves) {
    let boardValue: number;

    if (move.r === -1) {
      // Evaluate pass move
      boardValue = alphaBeta(board, boardHistory, SEARCH_DEPTH - 1, -Infinity, Infinity, false, opponent);
    } else {
      // Evaluate stone placement
      const { success, newBoard, capturedStones } = processMove(board, move.r, move.c, player, boardHistory);
      if (!success) continue;

      boardValue = alphaBeta(newBoard, [...boardHistory, newBoard], SEARCH_DEPTH - 1, -Infinity, Infinity, false, opponent);
      
      boardValue += getShapeBonus(board, move.r, move.c, player);
      
      boardValue += getAdvancedPositionWeight(move.r, move.c, boardSize, moveHistory.length, board);
      
      if (capturedStones > 0) {
          boardValue += (capturedStones * 800);
      }
    }

    if (boardValue > bestValue) {
      bestValue = boardValue;
      bestMove = { ...move, player };
    }
  }

  const endTime = Date.now();
  console.log(`AI move found in ${endTime - startTime}ms. Best move: (${bestMove.r}, ${bestMove.c}) with score ${bestValue}`);

  let explanation = `Considering the ${gamePhase} phase, this seems like a promising move.`;
  if (bestMove.r === -1) {
    explanation = 'No move seems better than passing right now.';
  }

  return {
    bestMove,
    explanation,
    gamePhase,
  };
}
