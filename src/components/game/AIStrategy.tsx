'use client';

import { BrainCircuit, Loader2 } from 'lucide-react';
import type { GamePhase } from '@/types';

interface AIStrategyProps {
  phase: GamePhase;
  explanation: string;
  isThinking: boolean;
}

export function AIStrategy({ phase, explanation, isThinking }: AIStrategyProps) {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 font-headline flex items-center gap-2">
        <BrainCircuit className="text-accent" />
        AI Strategy
      </h3>
      <div className="space-y-4 p-4 rounded-md bg-secondary/50">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">Game Phase</p>
          <p className="font-medium text-lg">{phase}</p>
        </div>
        <div>
          <p className="text-sm font-semibold text-muted-foreground">Analysis</p>
          <div className="flex items-start gap-2 mt-1">
            {isThinking && <Loader2 className="h-4 w-4 mt-1 animate-spin shrink-0" />}
            <p className="text-sm text-foreground/90 italic">"{explanation}"</p>
          </div>
        </div>
      </div>
    </div>
  );
}
