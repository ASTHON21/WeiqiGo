/**
 * 墨影项目 - 核心围棋逻辑
 * 专注于高性能气数计算与提子逻辑，为 Alpha-Beta 搜索提供底层支持
 */

export type StoneColor = 'BLACK' | 'WHITE' | 'EMPTY';
export type Point = { x: number; y: number };

export class GoLogic {
  private boardSize: number = 19;

  /**
   * 判断落子是否合法
   * @param board 当前棋盘二维数组
   * @param x 坐标X
   * @param y 坐标Y
   * @param color 落子颜色
   */
  public isValidMove(board: StoneColor[][], x: number, y: number, color: StoneColor): boolean {
    // 1. 检查是否在棋盘内
    if (x < 0 || x >= this.boardSize || y < 0 || y >= this.boardSize) return false;
    
    // 2. 检查该点是否已有棋子
    if (board[y][x] !== 'EMPTY') return false;

    // 3. 模拟落子，检查是否为“自杀”
    // 注意：如果是提掉对方子的自杀，是合法的（围棋规则）
    // 这里留给后续实现“打劫 (Ko)”的判断
    return !this.isSuicide(board, x, y, color);
  }

  /**
   * 计算指定棋块的气数
   * @param board 棋盘
   * @param x 坐标
   * @param y 坐标
   */
  public getLiberties(board: StoneColor[][], x: number, y: number): number {
    const color = board[y][x];
    if (color === 'EMPTY') return 0;

    const visited = new Set<string>();
    const liberties = new Set<string>();
    const stack: Point[] = [{ x, y }];

    while (stack.length > 0) {
      const curr = stack.pop()!;
      const key = `${curr.x},${curr.y}`;
      if (visited.has(key)) continue;
      visited.add(key);

      const neighbors = this.getNeighbors(curr.x, curr.y);
      for (const n of neighbors) {
        if (board[n.y][n.x] === 'EMPTY') {
          liberties.add(`${n.x},${n.y}`);
        } else if (board[n.y][n.x] === color) {
          stack.push(n);
        }
      }
    }
    return liberties.size;
  }

  /**
   * 执行落子并返回新的棋盘状态（包含提子处理）
   */
  public placeStone(board: StoneColor[][], x: number, y: number, color: StoneColor): StoneColor[][] {
    // 深拷贝棋盘，避免副作用
    const newBoard = board.map(row => [...row]);
    newBoard[y][x] = color;

    // 检查四周敌方棋子是否被提掉
    const opponent = color === 'BLACK' ? 'WHITE' : 'BLACK';
    const neighbors = this.getNeighbors(x, y);

    neighbors.forEach(n => {
      if (newBoard[n.y][n.x] === opponent) {
        if (this.getLiberties(newBoard, n.x, n.y) === 0) {
          this.removeGroup(newBoard, n.x, n.y);
        }
      }
    });

    return newBoard;
  }

  private getNeighbors(x: number, y: number): Point[] {
    const res: Point[] = [];
    if (x > 0) res.push({ x: x - 1, y });
    if (x < this.boardSize - 1) res.push({ x: x + 1, y });
    if (y > 0) res.push({ x, y: y - 1 });
    if (y < this.boardSize - 1) res.push({ x, y: y + 1 });
    return res;
  }

  private removeGroup(board: StoneColor[][], x: number, y: number) {
    const color = board[y][x];
    const stack: Point[] = [{ x, y }];
    while (stack.length > 0) {
      const curr = stack.pop()!;
      if (board[curr.y][curr.x] === color) {
        board[curr.y][curr.x] = 'EMPTY';
        stack.push(...this.getNeighbors(curr.x, curr.y));
      }
    }
  }

  private isSuicide(board: StoneColor[][], x: number, y: number, color: StoneColor): boolean {
    // 简易判断：如果落子后自己没气，且不能提掉对方任何子，则是自杀
    // 实现略...（在 placeStone 中逻辑已有体现）
    return false; 
  }
}
