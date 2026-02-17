'use client';

import type { Move } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MoveHistoryProps {
  moveHistory: Move[];
  boardSize: number;
}

const formatCoordinate = (num: number, boardSize: number) => {
    const letters = 'ABCDEFGHJKLMNOPQRSTUVWXYZ'.substring(0, boardSize);
    return letters[num];
}

export function MoveHistory({ moveHistory, boardSize }: MoveHistoryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline text-xl flex items-center gap-2">
            <History className="text-accent"/>
            Move History
        </CardTitle>
      </CardHeader>
      <CardContent>
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
                      move.player === 'black' ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  <span className="font-mono text-xs w-6 text-center text-muted-foreground">{index + 1}.</span>
                  <div className={cn(
                      "w-5 h-5 rounded-full border", 
                      move.player === 'black' ? 'bg-gray-900 border-gray-100' : 'bg-gray-100 border-gray-900'
                  )} />
                  <span>
                    {move.r === -1 
                      ? `${move.player.charAt(0).toUpperCase() + move.player.slice(1)} passed`
                      : `${move.player.charAt(0).toUpperCase() + move.player.slice(1)} to ${formatCoordinate(move.c, boardSize)}${boardSize - move.r}`
                    }
                  </span>
                </li>
              ))}
            </ol>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
