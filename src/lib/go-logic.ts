
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

        if (GoLogic.calculateLiberties(newBoard, r, c) === 0) {
            return { success: false, error: 'suicide' };
        }

        if (boardHistory.length > 0) {
            // 劫争校验 (超级劫争规则)
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
     * 黑胜 ⇔ B ≥ T/2 + K
     */
    calculateChineseScore: (board: BoardState) => {
        const size = board.length;
        const totalPoints = size * size;
        const KOMI = 3.75; // 中国规则通常以“子”为单位，3.75子等于7.5目
        
        let blackStones = 0;
        let visited = new Set<string>();
        
        // 1. 数活子
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (board[r][c] === 'black') blackStones++;
            }
        }

        // 2. 数围空
        let blackTerritory = 0;
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                const key = `${r},${c}`;
                if (board[r][c] === null && !visited.has(key)) {
                    const { points, owner } = GoLogic.getAreaInfo(board, r, c, visited);
                    if (owner === 'black') blackTerritory += points.length;
                    else if (owner === 'seki') blackTerritory += points.length / 2; // 中国规则公气各计一半
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
            komi: KOMI,
            winner,
            diff: Math.abs(diff)
        };
    },

    /**
     * 日韩规则数目法 (Territory Based Counting)
     * 胜负 = (黑方围空 - 白方提子 - 黑方死子) - (白方围空 - 黑方提子 - 白方死子) - 贴目
     */
    calculateJapaneseScore: (board: BoardState, blackStonesCapturedByBlack: number, whiteStonesCapturedByWhite: number) => {
        const size = board.length;
        const KOMI = 6.5; 

        // 1. 自动死活分析
        const allGroups = GoLogic.getAllGroups(board);
        const deadStones = { black: 0, white: 0 };
        const liveBoard = board.map(row => [...row]);

        allGroups.forEach(group => {
            if (!GoLogic.isGroupAlive(board, group)) {
                group.positions.forEach(([r, c]) => {
                    deadStones[group.player as 'black' | 'white']++;
                    liveBoard[r][c] = null; // 围空计算时移除死子
                });
            }
        });

        // 2. 识别领地
        let blackTerritory = 0;
        let whiteTerritory = 0;
        let visited = new Set<string>();

        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                const key = `${r},${c}`;
                if (liveBoard[r][c] === null && !visited.has(key)) {
                    const { points, owner } = GoLogic.getAreaInfo(liveBoard, r, c, visited);
                    if (owner === 'black') blackTerritory += points.length;
                    if (owner === 'white') whiteTerritory += points.length;
                    // owner === 'seki' 时公气计为0，符合日韩规则
                }
            }
        }

        // 3. 计算目数
        // blackStonesCapturedByBlack 是黑方提掉的白子数
        // whiteStonesCapturedByWhite 是白方提掉的黑子数
        const blackFinal = blackTerritory - whiteStonesCapturedByWhite - deadStones.black;
        const whiteFinal = whiteTerritory - blackStonesCapturedByBlack - deadStones.white;

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
                blackPrisoners: whiteStonesCapturedByWhite,
                whitePrisoners: blackStonesCapturedByBlack,
                blackDeadOnBoard: deadStones.black,
                whiteDeadOnBoard: deadStones.white,
                komi: KOMI
            }
        };
    },

    /**
     * 判断棋块是否活棋 (基本判定：终局时有气即活)
     */
    isGroupAlive: (board: BoardState, group: { positions: [number, number][], player: Player }) => {
        // 在自动化结算中，只要棋块在棋盘上且拥有至少 1 口气，即视为活棋。
        // 这解决了“单子在开阔地带被误判为死棋”的问题。
        // 只有当对局进行到 Dame（单官）全部填满，且该棋块确实没有眼位且无气时，才会被判定为死棋。
        const [r, c] = group.positions[0];
        const liberties = GoLogic.calculateLiberties(board, r, c);
        
        if (liberties > 0) return true;

        // 如果没有气，检查是否是双活 (Seki)
        if (GoLogic.isSeki(board, group)) return true;
        
        return false;
    },

    findEyes: (board: BoardState, group: { positions: [number, number][], player: Player }) => {
        const size = board.length;
        const eyes: [number, number][] = [];
        const checkedEmpty = new Set<string>();

        group.positions.forEach(([r, c]) => {
            [[r-1, c], [r+1, c], [r, c-1], [r, c+1]].forEach(([nr, nc]) => {
                if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === null) {
                    const key = `${nr},${nc}`;
                    if (!checkedEmpty.has(key)) {
                        checkedEmpty.add(key);
                        const neighbors = [[nr-1, nc], [nr+1, nc], [nr, nc-1], [nr, nc+1]];
                        const isSurrounded = neighbors.every(([nnr, nnc]) => {
                            if (nnr < 0 || nnr >= size || nnc < 0 || nnc >= size) return true;
                            return board[nnr][nnc] === group.player;
                        });
                        if (isSurrounded) eyes.push([nr, nc]);
                    }
                }
            });
        });
        return eyes;
    },

    isRealEye: (board: BoardState, eye: [number, number], player: Player) => {
        const size = board.length;
        const [r, c] = eye;
        const corners = [[r-1, c-1], [r-1, c+1], [r+1, c-1], [r+1, c+1]];
        let friendlyCorners = 0;
        let diagonalInBoard = 0;

        corners.forEach(([cr, cc]) => {
            if (cr >= 0 && cr < size && cc >= 0 && cc < size) {
                diagonalInBoard++;
                if (board[cr][cc] === player) friendlyCorners++;
            }
        });

        if (diagonalInBoard === 4) return friendlyCorners >= 3;
        if (diagonalInBoard === 2) return friendlyCorners >= 2;
        if (diagonalInBoard === 1) return friendlyCorners >= 1;
        return false;
    },

    isSeki: (board: BoardState, group: { positions: [number, number][], player: Player }) => {
        const libs = GoLogic.calculateLiberties(board, group.positions[0][0], group.positions[0][1]);
        if (libs >= 1) {
            const size = board.length;
            let adjacentOpponentFound = false;
            group.positions.forEach(([r, c]) => {
                [[r-1, c], [r+1, c], [r, c-1], [r, c+1]].forEach(([nr, nc]) => {
                    if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] !== null && board[nr][nc] !== group.player) {
                        adjacentOpponentFound = true;
                    }
                });
            });
            return adjacentOpponentFound && libs <= 2;
        }
        return false;
    },

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

    getAreaInfo: (board: BoardState, r: number, c: number, globalVisited: Set<string>) => {
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
