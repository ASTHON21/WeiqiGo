
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
            const lastBoard = boardHistory[boardHistory.length - 1];
            if (GoLogic.isSameBoard(newBoard, lastBoard)) {
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
     * 中国规则数子法 (Rule 5.2)
     */
    calculateChineseScore: (board: BoardState) => {
        const size = board.length;
        const KOMI = 3.75; 
        
        let blackStones = 0;
        let whiteStones = 0;
        let visited = new Set<string>();
        
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                if (board[r][c] === 'black') blackStones++;
                if (board[r][c] === 'white') whiteStones++;
            }
        }

        let blackTerritory = 0;
        let whiteTerritory = 0;

        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                const key = `${r},${c}`;
                if (board[r][c] === null && !visited.has(key)) {
                    const { points, owner } = GoLogic.getAreaInfo(board, r, c, visited);
                    if (owner === 'black') blackTerritory += points.length;
                    if (owner === 'white') whiteTerritory += points.length;
                }
            }
        }

        const blackTotal = blackStones + blackTerritory;
        const whiteTotal = whiteStones + whiteTerritory;
        const diff = blackTotal - whiteTotal - (KOMI * 2); 
        const winner = diff > 0 ? 'black' : 'white';

        return {
            blackTotal,
            whiteTotal,
            komi: KOMI,
            winner,
            diff: Math.abs(diff) / 2
        };
    },

    /**
     * 日韩规则数目法 (Territory Based Counting)
     */
    calculateJapaneseScore: (board: BoardState, blackPrisoners: number, whitePrisoners: number) => {
        const size = board.length;
        const KOMI = 6.5; 

        // 1. 识别死活 (简单自动化判定：少于2个真眼且非双活则视为死子)
        const groups = GoLogic.getAllGroups(board);
        const deadStones = { black: 0, white: 0 };
        const liveBoard = board.map(row => [...row]);

        groups.forEach(group => {
            if (!GoLogic.isGroupAlive(board, group)) {
                group.positions.forEach(([r, c]) => {
                    deadStones[group.player as 'black' | 'white']++;
                    liveBoard[r][c] = null; // 在计算领地时移除死子
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
                }
            }
        }

        // 3. 计算目数 (目数 = 围空 - 对方提子 - 己方死子)
        // 注意：whitePrisoners 是白方提掉的黑子
        const blackFinal = blackTerritory - whitePrisoners - deadStones.black;
        const whiteFinal = whiteTerritory - blackPrisoners - deadStones.white;

        const diff = blackFinal - whiteFinal - KOMI;
        const winner = diff > 0 ? 'black' : 'white';

        return {
            blackTotal: blackFinal,
            whiteTotal: whiteFinal,
            komi: KOMI,
            winner,
            diff: Math.abs(diff),
            details: {
                blackTerritory,
                whiteTerritory,
                blackPrisoners: whitePrisoners,
                whitePrisoners: blackPrisoners,
                blackDeadOnBoard: deadStones.black,
                whiteDeadOnBoard: deadStones.white
            }
        };
    },

    /**
     * 判断棋块是否活棋
     */
    isGroupAlive: (board: BoardState, group: { positions: [number, number][], player: Player }) => {
        const eyes = GoLogic.findEyes(board, group);
        const realEyes = eyes.filter(eye => GoLogic.isRealEye(board, eye, group.player));
        
        // 条件：有2个及以上真眼，或者处于双活状态
        if (realEyes.length >= 2) return true;
        if (GoLogic.isSeki(board, group)) return true;
        
        return false;
    },

    findEyes: (board: BoardState, group: { positions: [number, number][], player: Player }) => {
        const size = board.length;
        const eyes: [number, number][] = [];
        const visited = new Set<string>();

        group.positions.forEach(([r, c]) => {
            [[r-1, c], [r+1, c], [r, c-1], [r, c+1]].forEach(([nr, nc]) => {
                if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === null) {
                    const key = `${nr},${nc}`;
                    if (!visited.has(key)) {
                        visited.add(key);
                        // 检查该空点是否被该块包围
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
        let availableCorners = 0;

        corners.forEach(([cr, cc]) => {
            if (cr >= 0 && cr < size && cc >= 0 && cc < size) {
                availableCorners++;
                if (board[cr][cc] === player) friendlyCorners++;
            }
        });

        // 边角眼规则
        if (availableCorners === 1) return friendlyCorners >= 1; // 棋盘角
        if (availableCorners === 2) return friendlyCorners >= 2; // 棋盘边
        return friendlyCorners >= 3; // 棋盘中央
    },

    isSeki: (board: BoardState, group: { positions: [number, number][], player: Player }) => {
        // 简化版双活判定：如果有公气且双方都只有1气
        const liberties = GoLogic.calculateLiberties(board, group.positions[0][0], group.positions[0][1]);
        if (liberties === 1) {
            const opponent = group.player === 'black' ? 'white' : 'black';
            // 查找相邻的敌方块
            const size = board.length;
            let foundSeki = false;
            group.positions.forEach(([r, c]) => {
                [[r-1, c], [r+1, c], [r, c-1], [r, c+1]].forEach(([nr, nc]) => {
                    if (nr >= 0 && nr < size && nc >= 0 && nc < size && board[nr][nc] === opponent) {
                        const oppLibs = GoLogic.calculateLiberties(board, nr, nc);
                        if (oppLibs === 1) foundSeki = true;
                    }
                });
            });
            return foundSeki;
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
        const size = board.length;
        const group = GoLogic.getGroup(board, r, c);
        const liberties = new Set<string>();
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
        const size = board.length;
        const player = board[r][c];
        if (!player) return [];
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
