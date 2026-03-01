
import { BoardState, Player, Move } from './types';
import { ChineseScoring } from './scoring/chinese-scoring';
import { JapaneseScoring } from './scoring/japanese-scoring';

/**
 * 围棋竞赛规则逻辑实现
 * 包含：基础物理规则与策略模式胜负计算
 * 注入了针对 Seki、Ko 和死活判定的高级裁判逻辑
 */
export const GoLogic = {
    /**
     * 执行物理落子 (包含提子、禁着点校验、打劫校验)
     */
    processMove: (
        board: BoardState, 
        r: number, 
        c: number, 
        player: Player, 
        boardHistory: BoardState[] = []
    ) => {
        const size = board.length;
        
        if (r === -1 || c === -1) {
            return { 
                success: true, 
                newBoard: board, 
                capturedCount: 0 
            };
        }

        if (board[r][c] !== null) return { success: false, error: 'occupied' };

        let newBoard = board.map(row => [...row]);
        newBoard[r][c] = player;

        const opponent = player === 'black' ? 'white' : 'black';
        let capturedStones: [number, number][] = [];
        const neighbors = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];

        for (const [nr, nc] of neighbors) {
            if (nr >= 0 && nr < size && nc >= 0 && nc < size && newBoard[nr][nc] === opponent) {
                if (GoLogic.calculateLiberties(newBoard, nr, nc) === 0) {
                    const group = GoLogic.getGroup(newBoard, nr, nc);
                    group.forEach(([gr, gc]) => {
                        newBoard[gr][gc] = null;
                        capturedStones.push([gr, gc]);
                    });
                }
            }
        }

        // 禁自杀校验
        if (GoLogic.calculateLiberties(newBoard, r, c) === 0) {
            return { success: false, error: 'suicide' };
        }

        // 打劫校验 (Ko detection) - 性能优化版本
        if (boardHistory.length > 0) {
            const isRepeat = boardHistory.some(prevBoard => GoLogic.isSameBoard(newBoard, prevBoard));
            if (isRepeat) {
                return { success: false, error: 'ko' };
            }
        }

        return { 
            success: true, 
            newBoard, 
            capturedCount: capturedStones.length 
        };
    },

    /**
     * 中国规则数子法 (Area Counting Strategy)
     */
    calculateChineseScore: (board: BoardState) => {
        const cleanedBoard = GoLogic.removeDeadStones(board);
        const strategy = new ChineseScoring();
        const result = strategy.calculate(cleanedBoard, { black: 0, white: 0 });
        return {
            ...result,
            blackTotal: result.blackScore,
            whiteTotal: result.whiteScore,
        };
    },

    /**
     * 日韩规则数目法 (Territory Counting Strategy)
     */
    calculateJapaneseScore: (board: BoardState, blackPrisoners: number = 0, whitePrisoners: number = 0) => {
        const cleanedBoard = GoLogic.removeDeadStones(board);
        const strategy = new JapaneseScoring();
        const bP = isNaN(blackPrisoners) ? 0 : blackPrisoners;
        const wP = isNaN(whitePrisoners) ? 0 : whitePrisoners;
        const result = strategy.calculate(cleanedBoard, { black: bP, white: wP });
        return {
            ...result,
            blackTotal: result.blackScore,
            whiteTotal: result.whiteScore,
        };
    },

    /**
     * 启发式死子移除 (Two-Eye Heuristic)
     * 在结算前自动清除无法做活的棋块
     */
    removeDeadStones: (board: BoardState): BoardState => {
        const internalBoard = board.map(row => [...row]);
        const groups = GoLogic.getAllGroups(internalBoard);
        
        groups.forEach(group => {
            // 如果既没有两只真眼，也不处于双活状态，判定为死子
            if (!GoLogic.isGroupAliveHeuristic(internalBoard, group)) {
                group.positions.forEach(([r, c]) => {
                    internalBoard[r][c] = null;
                });
            }
        });
        
        return internalBoard;
    },

    /**
     * 基于启发式规则判断棋块是否存活
     */
    isGroupAliveHeuristic: (board: BoardState, group: { positions: [number, number][], player: Player }) => {
        const [r, c] = group.positions[0];
        const liberties = GoLogic.calculateLiberties(board, r, c);
        
        // 1. 有气则暂视为活 (收官对局中)
        if (liberties >= 2) return true;
        
        // 2. 查找该棋块内部包含的“真眼”
        const eyeCount = GoLogic.countTrueEyes(board, group);
        if (eyeCount >= 2) return true;

        // 3. 检查是否处于双活状态
        return GoLogic.checkSekiSimple(board, group);
    },

    /**
     * 计算棋块内部的真眼数量
     */
    countTrueEyes: (board: BoardState, group: { positions: [number, number][], player: Player }) => {
        let trueEyes = 0;
        const size = board.length;
        const visited = new Set<string>();

        group.positions.forEach(([r, c]) => {
            [[r-1, c], [r+1, c], [r, c-1], [r, c+1]].forEach(([nr, nc]) => {
                if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === null && !visited.has(`${nr},${nc}`)) {
                    const { points, owner } = GoLogic.findEnclosedArea(board, nr, nc, visited);
                    // 如果这片空地只触碰到了这一个颜色的棋子，且面积很小（眼位），计为眼
                    if (owner === group.player && points.length <= 2) {
                        trueEyes++;
                    }
                }
            });
        });
        return trueEyes;
    },

    /**
     * 升级版双活状态检测
     * A group is in Seki if it has 0-1 liberties but is adjacent to an opponent group that 
     * also has low liberties, and both share the same 'Dame'.
     */
    checkSekiSimple: (board: BoardState, group: { positions: [number, number][], player: Player }) => {
        const size = board.length;
        const visited = new Set<string>();
        let isSeki = false;

        group.positions.forEach(([r, c]) => {
            [[r-1, c], [r+1, c], [r, c-1], [r, c+1]].forEach(([nr, nc]) => {
                if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                    if (board[nr][nc] === null && !visited.has(`${nr},${nc}`)) {
                        const { owner } = GoLogic.findEnclosedArea(board, nr, nc, visited);
                        if (owner === 'seki') {
                            isSeki = true; // 触碰到了公气
                        }
                    }
                }
            });
        });
        return isSeki;
    },

    /**
     * 洪水填充寻找封闭区域 (Scoring Logic)
     * Refined: Ensure owners.size > 1 is flagged as 'seki' (Dame/Neutral)
     */
    findEnclosedArea: (board: BoardState, r: number, c: number, globalVisited: Set<string>) => {
        const size = board.length;
        const queue: [number, number][] = [[r, c]];
        const points: [number, number][] = [];
        const localVisited = new Set<string>([`${r},${c}`]);
        const owners = new Set<Player>();

        while (queue.length > 0) {
            const [currR, currC] = queue.shift()!;
            points.push([currR, currC]);
            globalVisited.add(`${currR},${currC}`);

            [[currR - 1, currC], [currR + 1, currC], [currR, currC - 1], [currR, currC + 1]].forEach(([nr, nc]) => {
                if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                    if (board[nr][nc] === null) {
                        if (!localVisited.has(`${nr},${nc}`)) {
                            localVisited.add(`${nr},${nc}`);
                            queue.push([nr, nc]);
                        }
                    } else {
                        owners.add(board[nr][nc] as Player);
                    }
                }
            });
        }

        let owner: Player | 'seki' | null = null;
        if (owners.size === 1) {
            owner = Array.from(owners)[0];
        } else if (owners.size > 1) {
            owner = 'seki'; // Dame in Chinese, Seki points in Japanese
        }

        return { points, owner };
    },

    /**
     * 获取棋盘上所有的棋块
     */
    getAllGroups: (board: BoardState) => {
        const size = board.length;
        const visited = new Set<string>();
        const groups: { positions: [number, number][], player: Player }[] = [];

        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                const key = `${r},${c}`;
                if (board[r][c] !== null && !visited.has(key)) {
                    const groupPositions = GoLogic.getGroup(board, r, c);
                    groupPositions.forEach(([gr, gc]) => visited.add(`${gr},${gc}`));
                    groups.push({ positions: groupPositions, player: board[r][c] as Player });
                }
            }
        }
        return groups;
    },

    /**
     * 计算棋块的气数
     */
    calculateLiberties: (board: BoardState, r: number, c: number): number => {
        const group = GoLogic.getGroup(board, r, c);
        const liberties = new Set<string>();
        const size = board.length;
        group.forEach(([gr, gc]) => {
            [[gr - 1, gc], [gr + 1, gc], [gr, gc - 1], [gr, gc + 1]].forEach(([nr, nc]) => {
                if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === null) {
                    liberties.add(`${nr},${nc}`);
                }
            });
        });
        return liberties.size;
    },

    /**
     * 获取相连的同色棋块
     */
    getGroup: (board: BoardState, r: number, c: number): [number, number][] => {
        const player = board[r][c];
        if (!player) return [];
        const size = board.length;
        const group: [number, number][] = [];
        const queue: [number, number][] = [[r, c]];
        const visited = new Set<string>([`${r},${c}`]);
        while (queue.length > 0) {
            const [currR, currC] = queue.shift()!;
            group.push([currR, currC]);
            [[currR - 1, currC], [currR + 1, currC], [currR, currC - 1], [currR, currC + 1]].forEach(([nr, nc]) => {
                if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === player && !visited.has(`${nr},${nc}`)) {
                    visited.add(`${nr},${nc}`);
                    queue.push([nr, nc]);
                }
            });
        }
        return group;
    },

    /**
     * 棋盘比对优化: Flattened string check
     */
    isSameBoard: (boardA: BoardState, boardB: BoardState): boolean => {
        const size = boardA.length;
        // 使用扁平化循环比对，比 JSON 序列化或多重映射更快
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (boardA[r][c] !== boardB[r][c]) return false;
            }
        }
        return true;
    },

    createEmptyBoard: (size: number): BoardState =>
      Array(size).fill(null).map(() => Array(size).fill(null))
};

export const createEmptyBoard = GoLogic.createEmptyBoard;
