'use client';

import { BrainCircuit, Loader2 } from 'lucide-react';
import type { GamePhase } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface AIStrategyProps {
  phase: GamePhase;
  explanation: string;
  isThinking: boolean;
  className?: string;
}

export function AIStrategy({ phase, explanation, isThinking, className }: AIStrategyProps) {
  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="font-headline text-xl flex items-center gap-2">
            <BrainCircuit className="text-accent" />
            AI Strategy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
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
      </CardContent>
    </Card>
  );
}
