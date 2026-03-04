
'use client';

/**
 * KataGo WASM Engine Wrapper
 * 
 * Provides an interface to manage the KataGo life-cycle in the browser.
 * Note: Requires the KataGo WASM binary and glue code to be available in public/models/
 */

export interface KataGoMove {
  r: number;
  c: number;
}

export class KataGoController {
  private engine: any = null;
  private isInitialized = false;
  private boardSize: number = 19;

  constructor(size: number = 19) {
    this.boardSize = size;
  }

  /**
   * Translates (r, c) to GTP string (e.g. 0,0 -> "A19")
   */
  private toGtp(r: number, c: number): string {
    if (r === -1) return "pass";
    const colChar = String.fromCharCode(c >= 8 ? 66 + c : 65 + c); // Skip 'I'
    const rowNum = this.boardSize - r;
    return `${colChar}${rowNum}`;
  }

  /**
   * Translates GTP string to (r, c)
   */
  private fromGtp(gtp: string): KataGoMove {
    if (gtp.toLowerCase() === "pass") return { r: -1, c: -1 };
    const colChar = gtp[0].toUpperCase();
    let c = colChar.charCodeAt(0) - 65;
    if (c > 8) c--; // Adjust for skipped 'I'
    const rowNum = parseInt(gtp.substring(1));
    const r = this.boardSize - rowNum;
    return { r, c };
  }

  async init() {
    if (this.isInitialized) return;

    try {
      // We assume the KataGo glue code is loaded globally via a script tag 
      // or available in the window object. If using a specific local JS file:
      // const KataGo = (window as any).KataGo;
      
      // Since the npm package 'katago-wasm' was not found, 
      // you should provide the WASM glue code in public/models/katago.js 
      // and import it or access it globally.
      
      console.warn("KataGo-WASM: Attempting to initialize engine. Ensure public/models/katago.wasm is present.");
      
      // Placeholder for actual WASM initialization logic
      // this.engine = new KataGo({ ... });
      
      // For now, we set a flag but real implementation depends on your specific WASM build
      this.isInitialized = true; 
    } catch (error) {
      console.error("KataGo WASM Init Error:", error);
      throw error;
    }
  }

  async setHistory(moves: {r: number, c: number, color: 'black' | 'white'}[]) {
    if (!this.isInitialized) await this.init();
    if (!this.engine) return;
    
    await this.engine.sendCommand('clear_board');
    for (const move of moves) {
      const gtpColor = move.color === 'black' ? 'B' : 'W';
      const gtpPos = this.toGtp(move.r, move.c);
      await this.engine.sendCommand(`play ${gtpColor} ${gtpPos}`);
    }
  }

  async generateMove(color: 'black' | 'white'): Promise<KataGoMove> {
    if (!this.isInitialized) await this.init();
    
    // If engine is not ready, return a pass or handle error
    if (!this.engine) {
      console.error("KataGo Engine not loaded. Returning pass.");
      return { r: -1, c: -1 };
    }
    
    const gtpColor = color === 'black' ? 'B' : 'W';
    const response = await this.engine.sendCommand(`genmove ${gtpColor}`);
    
    const match = response.match(/=\s+(.+)/);
    if (!match) throw new Error("Invalid KataGo response: " + response);
    
    return this.fromGtp(match[1].trim());
  }

  async terminate() {
    if (this.engine) {
      await this.engine.terminate();
      this.isInitialized = false;
    }
  }
}

export const aiEngine = new KataGoController(19);
