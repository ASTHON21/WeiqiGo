
import { BoardState, Player, Move } from './types';

/**
 * 围棋竞赛规则逻辑实现
 * 包含：中国规则 (v2.0 数子法) 与 日韩规则 (数目法)
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

        // 打劫校验 (劫争规则：禁止立即回提导致棋盘局面重复)
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
     * 中国规则数子法 (Area Counting)
     * 黑胜 ⇔ B ≥ T/2 + K (T=总点数, K=贴子3.75)
     */
    calculateChineseScore: (board: BoardState) => {
        const size = board.length;
        const totalPoints = size * size;
        const KOMI = 3.75; 
        
        let blackStones = 0;
        let visited = new Set<string>();
        
        // 1. 数活子
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (board[r][c] === 'black') blackStones++;
            }
        }

        // 2. 数围空 (洪水填充)
        let blackTerritory = 0;
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                const key = `${r},${c}`;
                if (board[r][c] === null && !visited.has(key)) {
                    const { points, owner } = GoLogic.findEnclosedArea(board, r, c, visited);
                    if (owner === 'black') blackTerritory += points.length;
                    else if (owner === 'seki') blackTerritory += points.length / 2; // 中国规则公气折半
                }
            }
        }

        const blackTotal = blackStones + blackTerritory;
        const whiteTotal = totalPoints - blackTotal;
        const diff = blackTotal - (totalPoints / 2 + KOMI);
        const winner = diff > 0 ? 'black' : 'white';

        return {
            blackTotal,
            whiteTotal,
            komi: `${KOMI}子 (7.5目)`,
            winner,
            diff: Math.abs(diff)
        };
    },

    /**
     * 日韩规则数目法 (Territory Based Counting)
     * 重塑逻辑：严格遵循 ZH-TBC.md 
     * 胜负 = (黑方围空 - 白提黑子 - 黑死子) - (白方围空 - 黑提白子 - 白死子) - 贴目
     */
    calculateJapaneseScore: (board: BoardState, blackPrisoners: number, whitePrisoners: number) => {
        const size = board.length;
        const KOMI = 6.5; 

        // 1. 识别棋盘死子 (死子定义：终局时没有呼吸点且无法做出两眼的棋块)
        const allGroups = GoLogic.getAllGroups(board);
        const deadStones = { black: 0, white: 0 };
        const liveBoard = board.map(row => [...row]);

        allGroups.forEach(group => {
            if (!GoLogic.isGroupAlive(board, group)) {
                group.positions.forEach(([r, c]) => {
                    deadStones[group.player as 'black' | 'white']++;
                    liveBoard[r][c] = null; // 围空计算时将其视为虚空
                });
            }
        });

        // 2. 计算领地 (洪水填充)
        let blackTerritory = 0;
        let whiteTerritory = 0;
        let visited = new Set<string>();

        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                const key = `${r},${c}`;
                if (liveBoard[r][c] === null && !visited.has(key)) {
                    const { points, owner } = GoLogic.findEnclosedArea(liveBoard, r, c, visited);
                    if (owner === 'black') blackTerritory += points.length;
                    if (owner === 'white') whiteTerritory += points.length;
                    // owner === 'seki' 时公气计为0，符合日韩规则
                }
            }
        }

        // 3. 应用日韩规则公式
        // blackPrisoners: 白方提掉的黑子数 (白方的战果)
        // whitePrisoners: 黑方提掉的白子数 (黑方的战果)
        const blackFinal = blackTerritory - blackPrisoners - deadStones.black;
        const whiteFinal = whiteTerritory - whitePrisoners - deadStones.white;

        const diff = blackFinal - (whiteFinal + KOMI);
        const winner = diff > 0 ? 'black' : 'white';

        return {
            blackTotal: blackFinal,
            whiteTotal: whiteFinal + KOMI,
            komi: KOMI,
            winner,
            diff: Math.abs(diff),
            details: {
                blackTerritory,
                whiteTerritory,
                blackPrisoners: blackPrisoners, // 对方俘子
                whitePrisoners: whitePrisoners,
                blackDeadOnBoard: deadStones.black,
                whiteDeadOnBoard: deadStones.white,
                komi: KOMI
            }
        };
    },

    /**
     * 判断棋块是否活棋
     * 物理活棋定义：终局时拥有至少 1 口气即视为存活 (假设单官已填满)
     */
    isGroupAlive: (board: BoardState, group: { positions: [number, number][], player: Player }) => {
        const [r, c] = group.positions[0];
        const liberties = GoLogic.calculateLiberties(board, r, c);
        
        // 只要有呼吸点，在自动结算中即为活棋
        if (liberties > 0) return true;

        // 无呼吸点时检查是否为特殊双活状态
        return GoLogic.checkSekiSimple(board, group);
    },

    /**
     * 简单的双活状态检测
     */
    checkSekiSimple: (board: BoardState, group: { positions: [number, number][], player: Player }) => {
        const size = board.length;
        let isSeki = false;
        group.positions.forEach(([r, c]) => {
            [[r-1, c], [r+1, c], [r, c-1], [r, c+1]].forEach(([nr, nc]) => {
                if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
                    // 如果邻居是空位（公气），则有双活可能
                    if (board[nr][nc] === null) isSeki = true;
                }
            });
        });
        return isSeki;
    },

    /**
     * 洪水填充寻找封闭区域
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
            owner = 'seki'; 
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

    isSameBoard: (boardA: BoardState, boardB: BoardState): boolean => {
        const size = boardA.length;
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
