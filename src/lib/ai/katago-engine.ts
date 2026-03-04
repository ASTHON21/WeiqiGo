'use client';

/**
 * KataGo WASM 引擎封装器
 * 
 * 负责在浏览器中加载 WASM 模块并管理 KataGo 引擎生命周期。
 * 使用 GTP (Go Text Protocol) 进行通信。
 */

export interface KataGoMove {
  r: number;
  c: number;
}

export class KataGoController {
  private worker: Worker | null = null;
  private isInitialized = false;
  private boardSize: number = 19;
  private commandId = 0;
  private pendingCommands: Map<number, (res: string) => void> = new Map();

  constructor(size: number = 19) {
    this.boardSize = size;
  }

  /**
   * 将 (r, c) 转换为 GTP 坐标 (例如: 0,0 -> "A19")
   * 注意：GTP 坐标会跳过字母 'I'
   */
  private toGtp(r: number, c: number): string {
    if (r === -1 || c === -1) return "pass";
    const colChar = String.fromCharCode(c >= 8 ? 66 + c : 65 + c); 
    const rowNum = this.boardSize - r;
    return `${colChar}${rowNum}`;
  }

  /**
   * 将 GTP 坐标转换为 (r, c)
   */
  private fromGtp(gtp: string): KataGoMove {
    const cleanGtp = gtp.trim().toLowerCase();
    if (cleanGtp === "pass" || cleanGtp === "none") return { r: -1, c: -1 };
    
    const colChar = cleanGtp[0].toUpperCase();
    let c = colChar.charCodeAt(0) - 65;
    if (c > 8) c--; // 修正跳过的 'I'
    
    const rowNum = parseInt(cleanGtp.substring(1));
    const r = this.boardSize - rowNum;
    return { r, c };
  }

  /**
   * 初始化引擎
   */
  async init() {
    if (this.isInitialized) return;

    return new Promise<void>((resolve, reject) => {
      try {
        // 假设 katago.js 是 WASM 的胶水代码，位于 public/models/
        this.worker = new Worker('/models/katago-worker.js');
        
        this.worker.onmessage = (e) => {
          const { type, id, response, error } = e.data;
          if (type === 'init-complete') {
            this.isInitialized = true;
            resolve();
          } else if (type === 'gtp-response') {
            const cb = this.pendingCommands.get(id);
            if (cb) {
              cb(response);
              this.pendingCommands.delete(id);
            }
          } else if (error) {
            console.error("KataGo Worker Error:", error);
            reject(error);
          }
        };

        this.worker.postMessage({
          type: 'init',
          modelPath: '/models/katago-small.bin.gz',
          config: {
            maxVisits: 400, // 限制计算量以适配移动端
            threads: 4
          }
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * 发送 GTP 指令
   */
  private async sendCommand(cmd: string): Promise<string> {
    if (!this.isInitialized) await this.init();
    return new Promise((resolve) => {
      const id = this.commandId++;
      this.pendingCommands.set(id, resolve);
      this.worker?.postMessage({ type: 'gtp-cmd', id, cmd });
    });
  }

  /**
   * 同步对局历史到 AI 引擎
   */
  async setHistory(moves: {r: number, c: number, color: 'black' | 'white'}[]) {
    await this.sendCommand('clear_board');
    for (const move of moves) {
      const gtpColor = move.color === 'black' ? 'B' : 'W';
      const gtpPos = this.toGtp(move.r, move.c);
      await this.sendCommand(`play ${gtpColor} ${gtpPos}`);
    }
  }

  /**
   * 生成 AI 建议的落子
   */
  async generateMove(color: 'black' | 'white'): Promise<KataGoMove> {
    const gtpColor = color === 'black' ? 'B' : 'W';
    const response = await this.sendCommand(`genmove ${gtpColor}`);
    
    // GTP 响应格式通常为 "= A19"
    const match = response.match(/=\s+(.+)/);
    if (!match) return { r: -1, c: -1 };
    
    return this.fromGtp(match[1]);
  }

  /**
   * 销毁引擎实例
   */
  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.isInitialized = false;
    }
  }
}
