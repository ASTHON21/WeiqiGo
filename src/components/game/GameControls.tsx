'use client';

import { Button } from '@/components/ui/button';
import { Play, RefreshCw } from 'lucide-react';
import type { Player } from '@/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface GameControlsProps {
  onNewGame: () => void;
  onPass: () => void;
  isGameOver: boolean;
  currentPlayer: Player;
  isAiThinking: boolean;
}

export function GameControls({ onNewGame, onPass, isGameOver, currentPlayer, isAiThinking }: GameControlsProps) {
  const isDisabled = isGameOver || isAiThinking || currentPlayer === 'W';

  return (
    <div className="w-full max-w-xl bg-card/50 backdrop-blur-sm p-4 rounded-lg shadow-lg border border-black/10">
      <div className="flex justify-around items-center">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline"><RefreshCw className="mr-2 h-4 w-4" /> New Game</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will start a new game and your current progress will be lost.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={onNewGame}>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Button onClick={onPass} disabled={isDisabled}>
            <Play className="mr-2 h-4 w-4 -rotate-90"/> Pass
        </Button>
      </div>
    </div>
  );
}
