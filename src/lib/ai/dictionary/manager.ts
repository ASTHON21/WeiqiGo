import 'server-only';
import * as fs from 'fs';
import * as path from 'path';

export interface SgfDatabaseEntry {
    hash: string;
    nextMove: string;
    source: string;
}

/**
 * DictionaryManager - 处理底层的文件读取、缓存管理。
 * 使用 process.cwd() 确保在各种部署环境下路径始终指向项目根目录。
 */
export class DictionaryManager {
    private static database: Record<string, SgfDatabaseEntry> | null = null;
    
    // 采用 process.cwd() 锁定绝对路径，解决 Next.js 编译后的路径漂移问题
    private static readonly SGF_DB_PATH = path.join(process.cwd(), 'src/lib/ai/dictionary/data/sgf-database.json');
    private static readonly JOSEKI_DB_PATH = path.join(process.cwd(), 'src/lib/ai/dictionary/data/joseki.json');

    /**
     * 初始化加载数据库（单例模式）
     */
    public static loadDatabase(): Record<string, SgfDatabaseEntry> {
        if (this.database) return this.database;

        const fullDatabase: Record<string, SgfDatabaseEntry> = {};

        try {
            // 1. 加载自动生成的棋谱库
            if (fs.existsSync(this.SGF_DB_PATH)) {
                const sgfRaw = fs.readFileSync(this.SGF_DB_PATH, 'utf-8');
                const sgfData = JSON.parse(sgfRaw);
                Object.assign(fullDatabase, sgfData);
                console.log(`[Dictionary] Loaded SGF database: ${this.SGF_DB_PATH}`);
            } else {
                console.warn(`[Dictionary] Missing SGF DB at: ${this.SGF_DB_PATH}`);
            }

            // 2. 加载人工精选的定式库 (优先级更高)
            if (fs.existsSync(this.JOSEKI_DB_PATH)) {
                const josekiRaw = fs.readFileSync(this.JOSEKI_DB_PATH, 'utf-8');
                const josekiData = JSON.parse(josekiRaw);
                Object.assign(fullDatabase, josekiData);
                console.log(`[Dictionary] Integrated Joseki library: ${this.JOSEKI_DB_PATH}`);
            }

            this.database = fullDatabase;
            console.log(`[Dictionary] Total matched paths in memory: ${Object.keys(this.database).length}`);
        } catch (error: any) {
            console.error("[Dictionary Manager Error]:", error.message);
            this.database = {}; // 降级为回退状态
        }

        return this.database;
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
}
