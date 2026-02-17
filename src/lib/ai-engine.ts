
import type { BoardState, Player, Move } from './types';
// 注意：只导入 go-logic 确实导出的内容
import { processMove, createEmptyBoard } from './go-logic';


/**
 * 墨影项目 - 形状字典与局部评估增强
 */

// 1. 形状字典定义：用于快速匹配常见局部情况
const SHAPE_PATTERNS = {
  // 基础死活：如果己方只有 1 气，这叫“打吃”，必须逃生
  ATARI_ESCAPE: 10000,
  // 基础死活：如果能提掉对方子，优先级极高
  CAPTURE_OPPONENT: 9000,
  // 布局定式：占角（星位/小目周围）
  CORNER_CLAIM: 500,
  // 坏棋惩罚：重复落子或在已死的棋子周围落子
  BAD_SHAPE_PENALTY: -5000
};

/**
 * 增强型局部评估：针对 SGF 棋谱中 AI 乱落子的问题进行专项修复
 */
function getShapeBonus(board: BoardState, r: number, c: number, player: Player): number {
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
 * 紧急状态检查：检查是否有棋子即将被提掉
 */
function findUrgentMove(board: BoardState, player: Player): {r: number, c: number} | null {
    const size = board.length;
    // 遍历棋盘寻找气数仅剩 1 的己方棋块
    // (由于 go-logic 已经提供了 getLiberties，我们可以复用它)
    // 如果发现某处落子能直接救活或提子，直接返回该坐标
    return null; // 简易版先返回 null，让搜索去处理
}

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

/**
 * 官子评估函数：计算落子后的目数增益
 * 原理：扫描落子点周围的空位，判断它们是否被己方包围。
 */
function calculateTerritoryValue(board: BoardState, r: number, c: number, player: Player): number {
    const size = board.length;
    let potentialTerritory = 0;
    
    // 简单的 4 连通扫描：如果周围空位能因为这一手棋被“封闭”，则目数增加
    const neighbors = [
        {r: r-1, c}, {r: r+1, c}, {r, c: c-1}, {r, c: c+1}
    ].filter(p => p.r >= 0 && p.r < size && p.c >= 0 && p.c < size);

    neighbors.forEach(n => {
        if (board[n.r][n.c] === null) {
            // 检查这个邻近空位是否已经处于“半封闭”状态
            let enemyCount = 0;
            const subNeighbors = [
                {r: n.r-1, c: n.c}, {r: n.r+1, c: n.c}, {r: n.r, c: n.c-1}, {r: n.r, c: n.c+1}
            ].filter(p => p.r >= 0 && p.r < size && p.c >= 0 && p.c < size);
            
            subNeighbors.forEach(sn => {
                if (board[sn.r][sn.c] !== null && board[sn.r][sn.c] !== player) {
                    enemyCount++;
                }
            });
            
            // 如果这一手棋能帮助封闭边界，奖励分增加
            if (enemyCount === 0) potentialTerritory += 1.0;
        }
    });

    return potentialTerritory;
}

// --- 1. 简单的启发式评估函数 ---
function evaluateBoard(board: BoardState, player: Player): number {
    const size = board.length;
    let score = 0;
    const opponent: Player = player === 'black' ? 'white' : 'black';

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            const stone = board[r][c];
            
            // 基础分：棋子数量
            if (stone === player) {
                score += 10;
            } else if (stone === opponent) {
                score -= 10;
            } else {
                // 核心改动：眼位识别加分
                // 如果这个空位是我的真眼，大幅加分
                if (isTrueEye(board, r, c, player)) {
                    score += 500; // 一个真眼价值极高，因为它关系到整块棋的死活
                } 
                // 如果这个空位是对手的真眼，大幅减分（意味着对手已经活了）
                else if (isTrueEye(board, r, c, opponent)) {
                    score -= 500;
                }
            }
        }
    }

    // 贴目补偿
    if (player === 'white') score += 6.5;

    return score;
}

// 生成合法落子列表
function generateMoves(board: BoardState, player: Player, history: BoardState[]): Move[] {
    const moves: Move[] = [];
    const size = board.length;

    // 性能优化：优先搜索靠近已有棋子的空位（周围有棋子的地方更有可能是有意义的）
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (board[r][c] === null) {
                const result = processMove(board, r, c, player, history);
                if (result.success) {
                    moves.push({ r, c, player });
                }
            }
        }
    }
    
    // 增加虚着 (Pass)
    moves.push({ r: -1, c: -1, player });
    return moves;
}

// --- 2. Alpha-Beta 剪枝递归 ---
function alphaBeta(
    board: BoardState,
    history: BoardState[],
    depth: number,
    alpha: number,
    beta: number,
    maximizingPlayer: boolean,
    player: Player
): number {
    if (depth === 0) {
        return evaluateBoard(board, player);
    }

    const opponent: Player = player === 'black' ? 'white' : 'black';
    const currentPlayer = maximizingPlayer ? player : opponent;
    const moves = generateMoves(board, currentPlayer, history);

    if (maximizingPlayer) {
        let maxEval = -Infinity;
        for (const move of moves) {
            const { success, newBoard } = processMove(board, move.r, move.c, currentPlayer, history);
            if (!success) continue;
            const evalScore = alphaBeta(newBoard, [...history, board], depth - 1, alpha, beta, false, player);
            maxEval = Math.max(maxEval, evalScore);
            alpha = Math.max(alpha, evalScore);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const move of moves) {
            const { success, newBoard } = processMove(board, move.r, move.c, currentPlayer, history);
            if (!success) continue;
            const evalScore = alphaBeta(newBoard, [...history, board], depth - 1, alpha, beta, true, player);
            minEval = Math.min(minEval, evalScore);
            beta = Math.min(beta, evalScore);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

// --- 3. 供页面调用的主接口 ---
export function findBestMove(
    board: BoardState,
    player: Player,
    moveHistory: Move[],
    boardSize: number
) {
    // 学生项目建议深度设为 2，保证响应速度在 500ms 内，3层在 19x19 下会卡顿
    const SEARCH_DEPTH = 2; 
    
    // 构建棋盘历史用于打劫(Ko)判断
    const boardHistory: BoardState[] = [createEmptyBoard(boardSize)];
    let currentTempBoard = createEmptyBoard(boardSize);
    for (const m of moveHistory) {
        const res = processMove(currentTempBoard, m.r, m.c, m.player, boardHistory);
        if (res.success) {
            currentTempBoard = res.newBoard;
            boardHistory.push(res.newBoard);
        }
    }

    const possibleMoves = generateMoves(board, player, boardHistory);

    let bestMove: Move = { r: -1, c: -1, player };
    let bestValue = -Infinity;

    const moveCount = moveHistory.length;
    let gamePhase = "Fuseki";
    if (moveCount > boardSize * boardSize * 0.3) gamePhase = "Chuban";
    if (moveCount > boardSize * boardSize * 0.7) gamePhase = "Yose";

    // 在 findBestMove 的循环中
    for (const move of possibleMoves) {
        if (move.r === -1) continue;

        const { success, newBoard, capturedStones } = processMove(board, move.r, move.c, player, boardHistory);
        if (!success) continue;

        // 基础搜索分
        let boardValue = alphaBeta(newBoard, [...boardHistory, newBoard], SEARCH_DEPTH - 1, -Infinity, Infinity, false, player);

        // --- 官子强化逻辑 ---
        if (gamePhase === "Yose") {
            // 在官子阶段，大幅提升目数增益和提子的权重
            const territoryGain = calculateTerritoryValue(board, move.r, move.c, player);
            boardValue += (territoryGain * 150); // 目数价值系数
            boardValue += (capturedStones * 1000); // 官子阶段提子往往意味着边界的彻底封死
        } else {
            // 布局和中盘阶段，形状加分更重要
            boardValue += getShapeBonus(board, move.r, move.c, player);
            // 在非官子阶段也给提子一个高奖励
            if (capturedStones > 0) {
              boardValue += capturedStones * 800;
            }
        }

        // 始终保留真眼意识（第一层防护）
        if (isTrueEye(board, move.r, move.c, player)) {
            boardValue -= 5000; // 绝对不要填掉自己的真眼
        }

        if (boardValue > bestValue) {
            bestValue = boardValue;
            bestMove = move;
        }
    }
    
    // 如果没有找到任何有效落子（除了pass），就选择pass
    if (bestValue === -Infinity) {
      bestMove = { r: -1, c: -1, player };
    }

    return {
        bestMove,
        explanation: `本地 AI 分析：落子于 (${bestMove.r}, ${bestMove.c}) 预计能获得 ${bestValue.toFixed(1)} 分的优势。`,
        gamePhase,
        debugLog: { nodes: possibleMoves.length, depth: SEARCH_DEPTH }
    };
}

    