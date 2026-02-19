import 'server-only';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Compatibility for ESM path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface SgfDatabaseEntry {
    hash: string;
    nextMove: string;
    source: string;
}

/**
 * DictionaryManager - Handles low-level JSON reading and memory caching.
 * Marked as 'server-only' because it uses Node.js 'fs' and 'path' modules.
 */
export class DictionaryManager {
    private static database: Record<string, SgfDatabaseEntry> | null = null;
    
    /**
     * Use process.cwd() for reliable path resolution in Next.js environments
     */
    private static readonly DB_PATH = path.join(process.cwd(), 'src/lib/ai/dictionary/data/sgf-database.json');

    /**
     * Initializes and loads the database using the Singleton pattern.
     */
    public static loadDatabase(): Record<string, SgfDatabaseEntry> {
        if (this.database) return this.database;

        try {
            if (fs.existsSync(this.DB_PATH)) {
                const rawData = fs.readFileSync(this.DB_PATH, 'utf-8');
                this.database = JSON.parse(rawData);
                console.log(`[Dictionary] Successfully loaded database with ${Object.keys(this.database!).length} entries.`);
            } else {
                console.warn(`[Dictionary] Warning: Database file not found at ${this.DB_PATH}. Please run the sync script.`);
                this.database = {};
            }
        } catch (error) {
            console.error("[Dictionary] Failed to load database:", error);
            this.database = {};
        }

        return this.database!;
    }

    /**
     * Get database statistics.
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
     * Dynamically add temporary entries (in-memory only).
     */
    public static addTemporaryEntry(hash: string, nextMove: string, source: string) {
        const db = this.loadDatabase();
        db[hash] = { hash, nextMove, source };
    }
}
