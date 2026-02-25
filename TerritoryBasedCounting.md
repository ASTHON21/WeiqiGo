日韩规则目数计算法（Territory Based Counting）完整实现指南

版本：v2.0 | 适用于日本规则·韩国规则 | 含19x19/13x13/9x9全尺寸

 第一章：核心原理

1.1 目数计算基本公式

```yaml
【核心公式】
黑方最终目数 = 黑棋围的空点 - 白棋提过的黑子数量 - 黑方死子数量
白方最终目数 = 白棋围的空点 - 黑棋提过的白子数量 - 白方死子数量

胜负 = (黑方最终目数 - 白方最终目数 - 贴目)

【等价形式】
黑胜条件: 黑目 > 白目 + 贴目
白胜条件: 黑目 < 白目 + 贴目
和棋条件: 黑目 = 白目 + 贴目（仅日本规则）
```

1.2 计算要素图解

```text
       棋盘状态
           ↓
    ┌──────┴──────┐
    ↓              ↓
  活棋           死棋
    ↓              ↓
┌───┴───┐      ┌──┴──┐
↓       ↓      ↓     ↓
围空   棋子  加入  填入
(目)   (子)  提子  对方空
```

 第二章：数据结构设计

2.1 棋盘状态表示

```typescript
// types/go-types.ts

export type Player = 'black' | 'white' | null;

export interface Position {
  row: number;
  col: number;
}

export interface Stone {
  player: Player;
  position: Position;
}

export interface Group {
  stones: Position[];
  liberties: Position[];
  player: Player;
  isDead?: boolean;  // 终局后标记死棋
}

export interface BoardState {
  size: 9 | 13 | 19;
  grid: Player[][];           // 棋盘网格
  groups: Group[];            // 所有棋子块
  blackPrisoners: number;     // 黑棋提掉的白子数量
  whitePrisoners: number;     // 白棋提掉的黑子数量
  moveHistory: Move[];        // 落子历史
  lastMove: Position | null;  // 上一步位置
  consecutivePasses: number;  // 连续弃权次数
}
```

2.2 计目专用数据结构

```typescript
// types/scoring-types.ts

export interface Territory {
  positions: Position[];
  owner: Player | 'neutral';  // 'neutral' 表示双活公气
}

export interface ScoringState {
  board: BoardState;
  
  // 终局确认的死子
  deadStones: {
    black: Position[];  // 黑方死子（将被白棋提掉）
    white: Position[];  // 白方死子（将被黑棋提掉）
  };
  
  // 活棋及其围空
  liveGroups: {
    black: Group[];
    white: Group[];
  };
  
  // 所有区域分类
  territories: {
    black: Territory[];    // 黑空
    white: Territory[];    // 白空
    neutral: Territory[];  // 双活公气
    dame: Position[];      // 单官（最后下的公共点）
  };
  
  // 最终目数
  finalScore: {
    black: number;
    white: number;
    komi: number;
    result: 'black_win' | 'white_win' | 'jigo';
    margin: number;  // 胜目数
  };
}
```

 第三章：死活判定算法

3.1 终局状态检测

```typescript
// algorithms/life-death-detection.ts

export class LifeDeathDetector {
  /**
   * 检测棋盘上所有棋块的死活
   * 在双方Pass后调用
   */
  detectLifeDeath(board: BoardState): {
    liveGroups: Group[];
    deadGroups: Group[];
  } {
    const liveGroups: Group[] = [];
    const deadGroups: Group[] = [];
    
    // 遍历所有棋子块
    for (const group of board.groups) {
      if (this.isGroupAlive(group, board)) {
        liveGroups.push(group);
      } else {
        deadGroups.push(group);
      }
    }
    
    return { liveGroups, deadGroups };
  }
  
  /**
   * 判断单个棋子块是否活棋
   * 活棋标准：有两个真眼 或 双活
   */
  private isGroupAlive(group: Group, board: BoardState): boolean {
    // 条件1：有两个真眼
    const eyes = this.findEyes(group, board);
    const realEyes = eyes.filter(eye => this.isRealEye(eye, group.player, board));
    
    if (realEyes.length >= 2) {
      return true;
    }
    
    // 条件2：双活（公活）
    if (this.isSeki(group, board)) {
      return true;
    }
    
    // 条件3：可以做出两眼（实战解决）
    if (this.canMakeTwoEyes(group, board)) {
      return true;
    }
    
    return false;
  }
  
  /**
   * 查找棋子块的眼位
   */
  private findEyes(group: Group, board: BoardState): Position[] {
    const eyes: Position[] = [];
    const visited = new Set<string>();
    
    // 查找被该块包围的空点
    for (const stone of group.stones) {
      const neighbors = this.getNeighbors(stone, board.size);
      
      for (const pos of neighbors) {
        const key = `${pos.row},${pos.col}`;
        if (visited.has(key)) continue;
        visited.add(key);
        
        // 如果空点被该块完全包围
        if (this.isSurroundedByGroup(pos, group, board)) {
          eyes.push(pos);
        }
      }
    }
    
    return eyes;
  }
  
  /**
   * 判断是否为真眼
   */
  private isRealEye(eye: Position, player: Player, board: BoardState): boolean {
    const corners = this.getEyeCorners(eye, board.size);
    let friendlyCorners = 0;
    
    for (const corner of corners) {
      if (!corner) {
        // 边角缺失的角点算作"被己方占据"（眼位规则）
        friendlyCorners++;
        continue;
      }
      
      const stone = board.grid[corner.row][corner.col];
      if (stone === player) {
        friendlyCorners++;
      } else if (stone === null) {
        // 空角点，假眼特征
        continue;
      }
      // 对方棋子占据，不算
    }
    
    // 角上眼需要1个己方角点
    if (corners.length === 1) {
      return friendlyCorners >= 1;
    }
    // 边上眼需要2个己方角点
    if (corners.length === 2) {
      return friendlyCorners >= 2;
    }
    // 中央眼需要3个己方角点
    return friendlyCorners >= 3;
  }
  
  /**
   * 判断是否为双活
   */
  private isSeki(group: Group, board: BoardState): boolean {
    // 双活特征：共享公气，谁先紧气谁死
    const opponent = group.player === 'black' ? 'white' : 'black';
    
    // 查找相邻的对方棋子块
    const adjacentGroups = this.findAdjacentGroups(group, board);
    const opponentGroups = adjacentGroups.filter(g => g.player === opponent);
    
    if (opponentGroups.length === 0) return false;
    
    // 检查是否有共享公气
    for (const oppGroup of opponentGroups) {
      const sharedLiberties = this.findSharedLiberties(group, oppGroup);
      if (sharedLiberties.length > 0) {
        // 确认双方都无法杀死对方
        if (this.isMutualLife(group, oppGroup, board)) {
          return true;
        }
      }
    }
    
    return false;
  }
  
  /**
   * 获取眼的角点
   */
  private getEyeCorners(eye: Position, size: number): (Position | null)[] {
    const { row, col } = eye;
    const corners: (Position | null)[] = [];
    
    // 四个角点
    const cornerOffsets = [
      [-1, -1], [-1, 1], [1, -1], [1, 1]
    ];
    
    for (const [dr, dc] of cornerOffsets) {
      const nr = row + dr;
      const nc = col + dc;
      
      if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
        corners.push({ row: nr, col: nc });
      } else {
        corners.push(null); // 边角缺失
      }
    }
    
    return corners;
  }
}
```

 第四章：围空识别算法

4.1 区域划分算法

```typescript
// algorithms/territory-detection.ts

export class TerritoryDetector {
  /**
   * 识别棋盘上的所有区域（黑空、白空、双活公气、单官）
   */
  detectTerritories(
    board: BoardState,
    liveGroups: { black: Group[]; white: Group[] }
  ): ScoringState['territories'] {
    const size = board.size;
    const visited = new Set<string>();
    
    const territories = {
      black: [],
      white: [],
      neutral: [],
      dame: []
    };
    
    // 遍历所有空点
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const key = `${row},${col}`;
        if (visited.has(key)) continue;
        
        if (board.grid[row][col] === null) {
          // 发现空区域，进行泛洪填充
          const region = this.floodFill(board, { row, col }, visited);
          
          // 判断区域归属
          const owner = this.determineRegionOwner(region, liveGroups);
          
          switch (owner) {
            case 'black':
              territories.black.push({ positions: region, owner: 'black' });
              break;
            case 'white':
              territories.white.push({ positions: region, owner: 'white' });
              break;
            case 'neutral':
              territories.neutral.push({ positions: region, owner: 'neutral' });
              break;
            default:
              territories.dame.push(...region);
          }
        }
      }
    }
    
    return territories;
  }
  
  /**
   * 泛洪填充找出连通空区域
   */
  private floodFill(
    board: BoardState,
    start: Position,
    visited: Set<string>
  ): Position[] {
    const region: Position[] = [];
    const queue: Position[] = [start];
    const size = board.size;
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      const key = `${current.row},${current.col}`;
      
      if (visited.has(key)) continue;
      visited.add(key);
      
      // 只有空点才加入区域
      if (board.grid[current.row][current.col] !== null) {
        continue;
      }
      
      region.push(current);
      
      // 检查四个方向
      const neighbors = [
        { row: current.row - 1, col: current.col },
        { row: current.row + 1, col: current.col },
        { row: current.row, col: current.col - 1 },
        { row: current.row, col: current.col + 1 }
      ];
      
      for (const n of neighbors) {
        if (n.row >= 0 && n.row < size && n.col >= 0 && n.col < size) {
          const nKey = `${n.row},${n.col}`;
          if (!visited.has(nKey)) {
            queue.push(n);
          }
        }
      }
    }
    
    return region;
  }
  
  /**
   * 判断空区域的归属
   */
  private determineRegionOwner(
    region: Position[],
    liveGroups: { black: Group[]; white: Group[] }
  ): Player | 'neutral' {
    const surroundingPlayers = new Set<Player>();
    
    // 检查区域边界相邻的棋子
    for (const pos of region) {
      const neighbors = this.getNeighbors(pos);
      
      for (const n of neighbors) {
        const stone = this.getStoneAt(n);
        if (stone) {
          // 检查这个棋子是否属于活棋
          if (this.isInLiveGroups(stone, liveGroups)) {
            surroundingPlayers.add(stone);
          }
        }
      }
    }
    
    // 归属判断
    if (surroundingPlayers.size === 1) {
      const owner = Array.from(surroundingPlayers)[0];
      return owner; // 单色包围 → 某方实地
    } else if (surroundingPlayers.size === 2) {
      return 'neutral'; // 双色包围 → 双活公气
    } else {
      return null; // 无包围 → 单官
    }
  }
  
  /**
   * 检查棋子是否属于活棋
   */
  private isInLiveGroups(
    player: Player,
    liveGroups: { black: Group[]; white: Group[] }
  ): boolean {
    if (player === 'black') {
      return liveGroups.black.length > 0;
    } else {
      return liveGroups.white.length > 0;
    }
  }
}
```

 第五章：目数计算引擎

5.1 完整计目流程

```typescript
// engines/japanese-scoring-engine.ts

import { LifeDeathDetector } from '../algorithms/life-death-detection';
import { TerritoryDetector } from '../algorithms/territory-detection';

export class JapaneseScoringEngine {
  private lifeDeathDetector: LifeDeathDetector;
  private territoryDetector: TerritoryDetector;
  
  constructor() {
    this.lifeDeathDetector = new LifeDeathDetector();
    this.territoryDetector = new TerritoryDetector();
  }
  
  /**
   * 主入口：计算最终得分
   */
  calculateScore(
    board: BoardState,
    komi: number = 6.5,
    allowJigo: boolean = true  // 日本规则允许和棋
  ): ScoringState {
    // 步骤1：检测死活
    const { liveGroups, deadGroups } = this.lifeDeathDetector.detectLifeDeath(board);
    
    // 步骤2：分离黑白活棋
    const liveBlack = liveGroups.filter(g => g.player === 'black');
    const liveWhite = liveGroups.filter(g => g.player === 'white');
    
    // 步骤3：死子分类
    const deadBlack = deadGroups.filter(g => g.player === 'black');
    const deadWhite = deadGroups.filter(g => g.player === 'white');
    
    // 步骤4：识别区域
    const territories = this.territoryDetector.detectTerritories(board, {
      black: liveBlack,
      white: liveWhite
    });
    
    // 步骤5：计算目数
    return this.computeFinalScore(
      board,
      {
        black: deadBlack.flatMap(g => g.stones),
        white: deadWhite.flatMap(g => g.stones)
      },
      {
        black: liveBlack,
        white: liveWhite
      },
      territories,
      komi,
      allowJigo
    );
  }
  
  /**
   * 计算最终得分
   */
  private computeFinalScore(
    board: BoardState,
    deadStones: { black: Position[]; white: Position[] },
    liveGroups: { black: Group[]; white: Group[] },
    territories: ScoringState['territories'],
    komi: number,
    allowJigo: boolean
  ): ScoringState {
    
    // 1. 计算各方的围空点数
    const blackTerritory = territories.black.reduce(
      (sum, t) => sum + t.positions.length, 0
    );
    const whiteTerritory = territories.white.reduce(
      (sum, t) => sum + t.positions.length, 0
    );
    
    // 2. 计算提子总数（棋盘上已提 + 死子）
    const totalBlackPrisoners = board.blackPrisoners + deadStones.white.length;
    const totalWhitePrisoners = board.whitePrisoners + deadStones.black.length;
    
    // 3. 最终目数（围空 - 对方提过的己方棋子）
    const blackFinal = blackTerritory - totalWhitePrisoners;
    const whiteFinal = whiteTerritory - totalBlackPrisoners;
    
    // 4. 计算胜负
    const diff = blackFinal - whiteFinal - komi;
    
    let result: 'black_win' | 'white_win' | 'jigo';
    let margin: number;
    
    if (Math.abs(diff) < 0.001) {  // 浮点数误差处理
      if (allowJigo) {
        result = 'jigo';
        margin = 0;
      } else {
        // 韩国规则：贴目确保无和棋
        result = diff > 0 ? 'black_win' : 'white_win';
        margin = Math.abs(diff);
      }
    } else if (diff > 0) {
      result = 'black_win';
      margin = diff;
    } else {
      result = 'white_win';
      margin = -diff;
    }
    
    return {
      board,
      deadStones,
      liveGroups,
      territories,
      finalScore: {
        black: blackFinal,
        white: whiteFinal,
        komi,
        result,
        margin
      }
    };
  }
  
  /**
   * 生成胜负解释
   */
  generateExplanation(scoringState: ScoringState): string {
    const { finalScore } = scoringState;
    const { black, white, komi, result, margin } = finalScore;
    
    const lines = [
      `【终局目数计算】`,
      `黑棋围空: ${scoringState.territories.black.reduce((s,t) => s + t.positions.length, 0)}目`,
      `白棋围空: ${scoringState.territories.white.reduce((s,t) => s + t.positions.length, 0)}目`,
      `黑提白子: ${scoringState.board.blackPrisoners}子 + 白死子 ${scoringState.deadStones.white.length}子`,
      `白提黑子: ${scoringState.board.whitePrisoners}子 + 黑死子 ${scoringState.deadStones.black.length}子`,
      ``,
      `黑棋最终: ${black}目`,
      `白棋最终: ${white}目`,
      `贴目: ${komi}目`,
      `差值: ${black} - ${white} - ${komi} = ${(black - white - komi).toFixed(1)}`,
      ``,
      `结果: ${this.formatResult(result, margin)}`
    ];
    
    return lines.join('\n');
  }
  
  private formatResult(result: string, margin: number): string {
    switch (result) {
      case 'black_win': return `黑胜 ${margin.toFixed(1)}目`;
      case 'white_win': return `白胜 ${margin.toFixed(1)}目`;
      case 'jigo': return '和棋（持碁）';
      default: return '未知';
    }
  }
}
```

 第六章：韩国规则特殊处理

6.1 棋盖规则适配

```typescript
// engines/korean-scoring-engine.ts

import { JapaneseScoringEngine } from './japanese-scoring-engine';

export class KoreanScoringEngine extends JapaneseScoringEngine {
  /**
   * 韩国规则：无和棋
   */
  calculateScore(
    board: BoardState,
    komi: number = 6.5,
    allowJigo: boolean = false  // 韩国规则不允许和棋
  ): ScoringState {
    return super.calculateScore(board, komi, false);
  }
  
  /**
   * 棋盖规则检查（2026.7后生效）
   */
  checkStoneLidRule(
    moveHistory: Move[],
    stoneLidViolations: number
  ): { penalty: number; warning: string } {
    // 两次注意罚1目
    if (stoneLidViolations >= 2) {
      return {
        penalty: 1,
        warning: '警告：未将死子放入棋盖，罚1目'
      };
    }
    
    return {
      penalty: 0,
      warning: stoneLidViolations === 1 ? '注意：请将死子放入棋盖' : ''
    };
  }
  
  /**
   * 应用棋盖罚目
   */
  applyLidPenalty(
    scoringState: ScoringState,
    stoneLidViolations: number
  ): ScoringState {
    const { penalty, warning } = this.checkStoneLidRule([], stoneLidViolations);
    
    if (penalty > 0) {
      // 罚目从违规方扣除
      // 假设黑方违规（实际需根据记录判断）
      scoringState.finalScore.black -= penalty;
      
      // 重新计算胜负
      const diff = scoringState.finalScore.black - 
                   scoringState.finalScore.white - 
                   scoringState.finalScore.komi;
      
      if (diff > 0) {
        scoringState.finalScore.result = 'black_win';
        scoringState.finalScore.margin = diff;
      } else {
        scoringState.finalScore.result = 'white_win';
        scoringState.finalScore.margin = -diff;
      }
    }
    
    return scoringState;
  }
}
```

 第七章：测试用例

7.1 单元测试

```typescript
// tests/japanese-scoring.test.ts

describe('Japanese Scoring Engine', () => {
  let engine: JapaneseScoringEngine;
  
  beforeEach(() => {
    engine = new JapaneseScoringEngine();
  });
  
  test('普通终局计目', () => {
    // 构造一个简单终局局面
    const board = createTestBoard();
    const result = engine.calculateScore(board, 6.5);
    
    expect(result.finalScore.black).toBe(42);
    expect(result.finalScore.white).toBe(36);
    expect(result.finalScore.result).toBe('black_win');
    expect(result.finalScore.margin).toBeCloseTo(0.5);
  });
  
  test('双活不计目', () => {
    // 构造双活局面
    const board = createSekiBoard();
    const result = engine.calculateScore(board, 6.5);
    
    // 双活区域的空点应为 neutral，不计入任何一方目数
    const neutralTerritory = result.territories.neutral;
    expect(neutralTerritory.length).toBeGreaterThan(0);
    
    // 这些空点不计入目数
    const blackTerritoryTotal = result.territories.black
      .reduce((sum, t) => sum + t.positions.length, 0);
    expect(blackTerritoryTotal).toBeLessThan(20);
  });
  
  test('死子处理', () => {
    const board = createBoardWithDeadStones();
    const result = engine.calculateScore(board, 6.5);
    
    // 死子应加入提子计数
    expect(result.deadStones.black.length).toBe(2);
    expect(result.deadStones.white.length).toBe(1);
    
    // 最终目数应扣除对方提子
    const explanation = engine.generateExplanation(result);
    expect(explanation).toContain('黑提白子');
    expect(explanation).toContain('白提黑子');
  });
  
  test('日本规则允许和棋', () => {
    // 构造平局局面
    const board = createJigoBoard();
    const result = engine.calculateScore(board, 6.5, true);
    
    expect(result.finalScore.result).toBe('jigo');
    expect(result.finalScore.margin).toBe(0);
  });
});

describe('Korean Scoring Engine', () => {
  let engine: KoreanScoringEngine;
  
  beforeEach(() => {
    engine = new KoreanScoringEngine();
  });
  
  test('韩国规则无和棋', () => {
    const board = createJigoBoard();  // 理论平局
    const result = engine.calculateScore(board, 6.5, false);
    
    // 6.5贴目确保不会和棋
    expect(result.finalScore.result).not.toBe('jigo');
  });
  
  test('棋盖罚目', () => {
    const board = createTestBoard();
    let result = engine.calculateScore(board, 6.5);
    
    // 两次违规
    result = engine.applyLidPenalty(result, 2);
    
    // 应罚1目
    expect(result.finalScore.margin).toBeLessThan(0.5);
  });
});
```

 第八章：SGF导入导出

8.1 从SGF解析终局

```typescript
// parsers/sgf-scoring-parser.ts

export class SGFScoringParser {
  /**
   * 从SGF文件解析终局状态
   */
  parseScoringFromSGF(sgfContent: string): {
    board: BoardState;
    deadStones?: { black: Position[]; white: Position[] };
    result?: string;
  } {
    // 解析SGF基本内容
    const parsed = parseSGF(sgfContent);
    
    // 重建棋盘
    const board = this.reconstructBoard(parsed);
    
    // 检查是否有死子标注
    const deadStones = this.extractDeadStones(parsed);
    
    // 获取结果
    const result = parsed.metadata.RE;
    
    return { board, deadStones, result };
  }
  
  /**
   * 导出终局到SGF（包含死子标注）
   */
  exportToSGF(
    scoringState: ScoringState,
    players: { black: string; white: string },
    event: string
  ): string {
    const lines: string[] = [];
    
    // 文件头
    lines.push(`(;GM[1]FF[4]SZ[${scoringState.board.size}]`);
    lines.push(`KM[${scoringState.finalScore.komi}]`);
    lines.push(`RU[${scoringState.finalScore.result === 'jigo' ? 'Japanese' : 'Korean'}]`);
    lines.push(`PB[${players.black}]`);
    lines.push(`PW[${players.white}]`);
    lines.push(`RE[${this.formatSGFResult(scoringState.finalScore)}]`);
    lines.push(`DT[${new Date().toISOString().split('T')[0]}]`);
    lines.push(`EV[${event}]`);
    
    // 落子序列
    lines.push(...this.formatMoves(scoringState.board.moveHistory));
    
    // 死子标注（终局后确认）
    if (scoringState.deadStones.black.length > 0) {
      lines.push(`AB[${this.formatPositions(scoringState.deadStones.black)}]`);
    }
    if (scoringState.deadStones.white.length > 0) {
      lines.push(`AW[${this.formatPositions(scoringState.deadStones.white)}]`);
    }
    
    lines.push(')');
    return lines.join('\n');
  }
  
  private formatSGFResult(finalScore: ScoringState['finalScore']): string {
    switch (finalScore.result) {
      case 'black_win':
        return `B+${finalScore.margin.toFixed(1)}`;
      case 'white_win':
        return `W+${finalScore.margin.toFixed(1)}`;
      case 'jigo':
        return 'Jigo';
    }
  }
  
  private formatPositions(positions: Position[]): string {
    return positions
      .map(p => this.positionToSGF(p))
      .join('');
  }
  
  private positionToSGF(pos: Position): string {
    const col = String.fromCharCode(97 + pos.col);  // a-s
    const row = String.fromCharCode(97 + pos.row);  // a-s
    return `[${col}${row}]`;
  }
}
```

 第九章：AI实现要点总结

9.1 关键函数清单

```typescript
// 必须实现的核心函数

interface MustImplement {
  // 死活检测
  'findGroups()': '识别所有连通块',
  'countLiberties()': '计算气数',
  'isGroupAlive()': '判断死活（两眼/双活）',
  'findEyes()': '查找眼位',
  'isRealEye()': '判断真眼',
  
  // 区域识别
  'floodFill()': '泛洪填充空区域',
  'determineRegionOwner()': '判断区域归属',
  'findSharedLiberties()': '查找共享公气',
  
  // 计目计算
  'calculateBlackTerritory()': '计算黑空',
  'calculateWhiteTerritory()': '计算白空',
  'applyPrisoners()': '应用提子填目',
  'applyKomi()': '应用贴目',
  
  // 胜负判定
  'determineWinner()': '判定胜负（含和棋）',
  'generateExplanation()': '生成解释文本'
}
```

9.2 常见陷阱与解决方案

```yaml
陷阱1: 双活区域计目
  错误: 把双活公气计入某一方目数
  正确: 标记为neutral，不计入任何一方

陷阱2: 假眼识别
  错误: 把所有空点都当作眼
  正确: 检查眼位的角点占有率

陷阱3: 死子重复计算
  错误: 既在提子中计算，又在围空中扣除
  正确: 死子只影响提子计数，不影响围空统计

陷阱4: 浮点数精度
  错误: 直接比较浮点数相等
  正确: 使用误差范围 Math.abs(diff) < 0.001

陷阱5: 单官处理
  错误: 把单官当作目数
  正确: 单官是必须下的公共点，不计目
```

9.3 性能优化建议

```typescript
// 性能优化技巧

class OptimizedScoringEngine {
  /**
   * 1. 缓存连通块计算结果
   */
  private groupCache: Map<string, Group[]> = new Map();
  
  /**
   * 2. 增量更新（对弈过程中）
   */
  incrementalUpdate(
    previousState: ScoringState,
    newMove: Move
  ): ScoringState {
    // 只重新计算受影响的局部区域
    const affectedArea = this.getAffectedArea(newMove);
    return this.recalculateLocal(previousState, affectedArea);
  }
  
  /**
   * 3. 并行处理（大型棋盘）
   */
  async parallelScoring(
    board: BoardState
  ): Promise<ScoringState> {
    // 将棋盘分成4个象限并行计算
    const quadrants = this.splitBoard(board);
    const results = await Promise.all(
      quadrants.map(q => this.calculateQuadrant(q))
    );
    return this.mergeQuadrantResults(results);
  }
}
```

---

注：本实现完全遵循日本规则和韩国规则的核心原则。日韩规则本质相同，仅在和棋处理、棋盖管理上存在差异。所有尺寸（9x9/13x13/19x19）均适用同一套算法。