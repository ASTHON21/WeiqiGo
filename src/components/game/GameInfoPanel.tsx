'use client';

import type { Move, Player, GamePhase } from '@/types';
import { PlayerInfo } from './PlayerInfo';
import { AIStrategy } from './AIStrategy';
import { MoveHistory } from './MoveHistory';
import { User } from 'firebase/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface GameInfoPanelProps {
  currentPlayer: Player;
  capturedStones: { B: number; W: number };
  moveHistory: Move[];
  aiGamePhase: GamePhase;
  aiExplanation: string;
  isAiThinking: boolean;
  user: User | null;
  isGameOver: boolean;
  winner: Player | 'Draw' | null;
}

export function GameInfoPanel({
  currentPlayer,
  capturedStones,
  moveHistory,
  aiGamePhase,
  aiExplanation,
  isAiThinking,
  user,
  isGameOver,
  winner,
}: GameInfoPanelProps) {
  return (
    <Card className="w-full bg-card/50 backdrop-blur-sm shadow-lg border border-black/10">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Game Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isGameOver && winner && (
          <div className="p-4 rounded-md bg-accent text-accent-foreground text-center">
            <h3 className="font-bold text-lg">Game Over</h3>
            <p>{winner === 'Draw' ? 'The game is a draw.' : `${winner === 'B' ? 'You' : 'The AI'} won!`}</p>
          </div>
        )}

        <PlayerInfo
          currentPlayer={currentPlayer}
          capturedStones={capturedStones}
          user={user}
        />
        <Separator />
        <AIStrategy
          phase={aiGamePhase}
          explanation={aiExplanation}
          isThinking={isAiThinking}
        />
        <Separator />
        <MoveHistory moveHistory={moveHistory} />
      </CardContent>
    </Card>
  );
}
