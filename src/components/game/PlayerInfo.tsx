'use client';

import type { Player } from '@/types';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User } from 'firebase/auth';
import { cn } from '@/lib/utils';

interface PlayerInfoProps {
  currentPlayer: Player;
  capturedStones: { B: number; W: number };
  user: User | null;
}

export function PlayerInfo({ currentPlayer, capturedStones, user }: PlayerInfoProps) {
  const getPlayerInitial = (name: string | null | undefined) => {
    return name ? name.charAt(0).toUpperCase() : 'U';
  };
  
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4 font-headline">Players</h3>
      <div className="space-y-3">
        {/* Player (Black) */}
        <div className={cn("flex items-center justify-between p-3 rounded-md transition-all", currentPlayer === 'B' ? 'bg-accent/20 border-accent border' : 'bg-secondary/50')}>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-white">
              <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                  <span className="text-white font-bold">{getPlayerInitial(user?.displayName)}</span>
              </div>
            </Avatar>
            <div>
              <p className="font-semibold">{user?.displayName || 'Player'}</p>
              <p className="text-sm text-muted-foreground">Black</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold">{capturedStones.B}</p>
            <p className="text-sm text-muted-foreground">Captured</p>
          </div>
        </div>

        {/* AI (White) */}
        <div className={cn("flex items-center justify-between p-3 rounded-md transition-all", currentPlayer === 'W' ? 'bg-accent/20 border-accent border' : 'bg-secondary/50')}>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border-2 border-black">
               <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                  <span className="text-black font-bold">A</span>
              </div>
            </Avatar>
            <div>
              <p className="font-semibold">Shadow AI</p>
              <p className="text-sm text-muted-foreground">White</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold">{capturedStones.W}</p>
            <p className="text-sm text-muted-foreground">Captured</p>
          </div>
        </div>
      </div>
    </div>
  );
}
