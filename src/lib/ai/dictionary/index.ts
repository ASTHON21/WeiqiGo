import { DictionaryManager } from './manager';
import { SgfProcessor } from '../sgf-processor';
import { Move } from '../../types';
import * as crypto from 'crypto';

/**
 * Core lookup function (Instinct Layer)
 * Responsibility: Instant pattern matching based on MD5 hashes.
 */
export function findSgfMatch(history: Move[], size: number): { r: number; c: number; explanation: string } | null {
    // Dictionary currently covers the opening phase (first 20 moves)
    if (!history || history.length === 0 || history.length > 20) return null;

    try {
        // 1. Get database via singleton manager
        const database = DictionaryManager.loadDatabase();

        // 2. Generate standardized path key
        const pathStr = SgfProcessor.generatePathKey(history);

        // 3. Calculate MD5 hash
        const currentHash = crypto.createHash('md5').update(pathStr).digest('hex');

        // 4. O(1) retrieval
        const match = database[currentHash];

        if (match) {
            // 5. Success: convert SGF coordinates back to numeric
            const nextMoveCoord = SgfProcessor.fromSgf(match.nextMove);
            
            return {
                r: nextMoveCoord.r,
                c: nextMoveCoord.c,
                explanation: `Matched opening sequence from "${match.source}".`
            };
        }
    } catch (error) {
        console.warn('[SGF Dictionary] Error during matching:', error);
    }

    // No match found
    return null;
}
