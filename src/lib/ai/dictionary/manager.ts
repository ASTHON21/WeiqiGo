'use client';
// 注意：由于此模块使用了 fs 等 Node.js 原生模块，它应在服务端或支持 Node.js 的环境中运行。
// 在 Next.js 中，这通常意味着它会被 Server Actions 或 API Routes 调用。

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// 兼容 ESM 的路径获取方式
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface SgfDatabaseEntry {
    hash: string;
    nextMove: string;
    source: string;
}

/**
 * DictionaryManager - 数据库/文件读取管理
 * 职责：处理底层的 JSON 读取、内存缓存管理。
 */
export class DictionaryManager {
    private static database: Record<string, SgfDatabaseEntry> | null = null;
    private static readonly DB_PATH = path.join(__dirname, 'data', 'sgf-database.json');

    /**
     * 初始化加载数据库
     * 采用单例模式，确保数据只会被加载到内存中一次
     */
    public static loadDatabase(): Record<string, SgfDatabaseEntry> {
        if (this.database) return this.database;

        try {
            if (fs.existsSync(this.DB_PATH)) {
                const rawData = fs.readFileSync(this.DB_PATH, 'utf-8');
                this.database = JSON.parse(rawData);
                console.log(`[Dictionary] 成功加载数据库，包含 ${Object.keys(this.database!).length} 条路径。`);
            } else {
                console.warn(`[Dictionary] 警告：数据库文件未找到 ${this.DB_PATH}，请运行同步脚本。`);
                this.database = {};
            }
        } catch (error) {
            console.error("[Dictionary] 加载数据库失败:", error);
            this.database = {};
        }

        return this.database!;
    }

    /**
     * 获取数据库状态信息
     */
    public static getStats() {
        const db = this.loadDatabase();
        const sources = new Set(Object.values(db).map(entry => entry.source));
        return {
            totalPaths: Object.keys(db).length,
            totalFiles: sources.size
        };
    }

    /**
     * 动态添加临时定式（内存级别）
     */
    public static addTemporaryEntry(hash: string, nextMove: string, source: string) {
        const db = this.loadDatabase();
        db[hash] = { hash, nextMove, source };
    }
}
