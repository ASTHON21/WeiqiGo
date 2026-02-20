import 'server-only';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

export interface SgfDatabaseEntry {
    hash: string;
    nextMove: string;
    source: string;
}

/**
 * DictionaryManager - Handles low-level JSON reading and memory caching for AI patterns.
 * Implements a hybrid loading strategy: SGF Database + Expert Joseki.
 */
export class DictionaryManager {
    private static database: Record<string, SgfDatabaseEntry> | null = null;
    
    // Absolute paths using process.cwd() for reliable resolution in Next.js
    private static readonly SGF_DB_PATH = path.join(process.cwd(), 'src/lib/ai/dictionary/data/sgf-database.json');
    private static readonly JOSEKI_DB_PATH = path.join(process.cwd(), 'src/lib/ai/dictionary/data/joseki.json');

    /**
     * Initializes and loads the hybrid database using the Singleton pattern.
     * Combines mass game records with expert joseki patterns.
     */
    public static loadDatabase(): Record<string, SgfDatabaseEntry> {
        if (this.database) return this.database;

        const fullDatabase: Record<string, SgfDatabaseEntry> = {};

        try {
            // 1. Load the automatically generated SGF pattern database
            if (fs.existsSync(this.SGF_DB_PATH)) {
                const sgfRaw = fs.readFileSync(this.SGF_DB_PATH, 'utf-8');
                const sgfData = JSON.parse(sgfRaw);
                Object.assign(fullDatabase, sgfData);
                console.log(`[Dictionary] Loaded SGF database with ${Object.keys(sgfData).length} paths.`);
            }

            // 2. Load the expert Joseki database (Higher priority)
            // Using Object.assign ensures joseki.json overwrites overlaps from sgf-database.json
            if (fs.existsSync(this.JOSEKI_DB_PATH)) {
                const josekiRaw = fs.readFileSync(this.JOSEKI_DB_PATH, 'utf-8');
                const josekiData = JSON.parse(josekiRaw);
                Object.assign(fullDatabase, josekiData);
                console.log(`[Dictionary] Integrated Joseki database with ${Object.keys(josekiData).length} expert paths.`);
            }

            this.database = fullDatabase;
            console.log(`[Dictionary] Hybrid database ready. Total paths: ${Object.keys(this.database).length}`);
        } catch (error) {
            console.error("[Dictionary] Failed to load databases:", error);
            this.database = fullDatabase; // Fallback to partial or empty
        }

        return this.database;
    }

    /**
     * Get database statistics for debugging.
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
