'use client';

import type { Move } from '@/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MoveHistoryProps {
  moveHistory: Move[];
}

const formatCoordinate = (num: number, boardSize: number) => {
    const letters = 'ABCDEFGHJKLMNOPQRSTUVWXYZ'.substring(0, boardSize);
    return letters[num];
}

export function MoveHistory({ moveHistory }: MoveHistoryProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 font-headline flex items-center gap-2">
        <History className="text-accent"/>
        Move History
      </h3>
      <ScrollArea className="h-48 w-full rounded-md border bg-secondary/30 p-2">
        {moveHistory.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center p-4">No moves yet.</p>
        ) : (
          <ol className="space-y-1">
            {moveHistory.map((move, index) => (
              <li
                key={index}
                className={cn(
                    "flex items-center gap-2 text-sm p-1.5 rounded-md",
                    move.player === 'B' ? "text-foreground" : "text-muted-foreground"
                )}
              >
                <span className="font-mono text-xs w-6 text-center text-muted-foreground">{index + 1}.</span>
                <div className={cn(
                    "w-5 h-5 rounded-full border", 
                    move.player === 'B' ? 'bg-gray-900 border-gray-100' : 'bg-gray-100 border-gray-900'
                )} />
                <span>
                    {move.player === 'B' ? 'Black' : 'White'} to {formatCoordinate(move.col, 9)}{9 - move.row}
                </span>
              </li>
            ))}
          </ol>
        )}
      </ScrollArea>
    </div>
  );
}
