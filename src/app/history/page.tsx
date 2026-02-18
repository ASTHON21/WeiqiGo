'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GameHistoryEntry } from '@/lib/types';
import { format } from 'date-fns';
import { Download, Trash2, ShieldQuestion, Cloud } from 'lucide-react';
import { exportToSGF } from '@/lib/sgf';
import { useToast } from '@/hooks/use-toast';
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
import { cn } from '@/lib/utils';
import { Icons } from '@/components/icons';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';


export default function HistoryPage() {
  const [localHistory, setLocalHistory] = useState<GameHistoryEntry[]>([]);
  const { toast } = useToast();
  const db = useFirestore();

  // Load from LocalStorage (Dormant fallback)
  useEffect(() => {
    try {
        const storedHistory = localStorage.getItem('goMasterHistory');
        if (storedHistory) {
          setLocalHistory(JSON.parse(storedHistory));
        }
    } catch (error) {
        console.error("Failed to parse localStorage history:", error);
    }
  }, []);

  // REAL USE: Load from Firestore (Live Cloud Sync!)
  const gamesQuery = useMemoFirebase(() => query(collection(db, "games"), orderBy("date", "desc")), [db]);
  const { data: cloudHistory, isLoading: isCloudLoading } = useCollection<GameHistoryEntry>(gamesQuery);

  const displayHistory = cloudHistory || localHistory;

  const handleExport = (game: GameHistoryEntry) => {
    try {
      const sgfData = exportToSGF(game);
      const blob = new Blob([sgfData], { type: 'application/x-go-sgf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GoMaster_Game_${game.id.replace(/:/g, '-')}.sgf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: 'Export Successful', description: `Game exported to SGF.` });
    } catch (error) {
      toast({ title: 'Export Failed', description: 'Error creating SGF.', variant: 'destructive' });
    }
  };
  
  const handleClearHistory = () => {
    localStorage.removeItem('goMasterHistory');
    setLocalHistory([]);
    toast({ title: 'Local History Cleared', description: 'Your browser history was cleared. Note: Cloud records remain intact.' });
  }

  const renderWinnerBadge = (game: GameHistoryEntry) => {
    const winner = game.result?.winner;
    if (winner && winner !== 'draw') {
        const isBlack = winner === 'black';
        return (
            <Badge variant={isBlack ? 'default' : 'outline'} className={cn(isBlack ? 'bg-black text-white' : 'bg-white text-black border-black/50')}>
                <Icons.Stone className={cn("w-3 h-3 mr-1.5", isBlack ? 'fill-white' : 'fill-black stroke-white stroke-[2px]')} />
                {winner.charAt(0).toUpperCase() + winner.slice(1)} Won
            </Badge>
        );
    }
     return <Badge variant="secondary"><ShieldQuestion className="mr-1.5 h-3 w-3" /> Draw</Badge>;
  }

  return (
    <div className="container mx-auto max-w-4xl p-4 md:p-6 space-y-6">
       <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline flex items-center gap-2">
            Game History
            {cloudHistory && <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20"><Cloud className="w-3 h-3 mr-1"/> Cloud Synced</Badge>}
          </h1>
          <p className="text-muted-foreground">
            A record of your past games.
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={displayHistory.length === 0}>
              <Trash2 className="mr-2 h-4 w-4" /> Clear Local History
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>This clears your local browser cache only.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearHistory}>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {isCloudLoading ? (
        <div className="flex justify-center p-12">
          <Icons.Logo className="animate-spin h-8 w-8 text-accent" />
        </div>
      ) : displayHistory.length > 0 ? (
        <div className="grid gap-4">
            {displayHistory.map((game) => (
                <Card key={game.id}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div className="flex items-center gap-4">
                            <div className="flex flex-col">
                                <span className="font-mono text-sm font-medium">{format(new Date(game.date), 'yyyy/MM/dd HH:mm')}</span>
                                <span className="text-xs text-muted-foreground">{game.boardSize}x{game.boardSize} Board ({game.mode === 'ai' ? 'vs. AI' : 'vs. Player'})</span>
                            </div>
                        </div>
                        {renderWinnerBadge(game)}
                    </CardHeader>
                    <CardContent className="pt-2 pb-4">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                            <div className="col-span-2">
                                <p className="text-muted-foreground">Reason: <span className="font-medium text-foreground">{game.result?.reason}</span></p>
                            </div>
                            <div className="text-right font-mono">
                                <p>B: {game.result?.blackScore?.toFixed(1) ?? 'N/A'}</p>
                                <p>W: {game.result?.whiteScore?.toFixed(1) ?? 'N/A'}</p>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-end bg-muted/50 py-3 px-6">
                        <Button variant="outline" size="sm" onClick={() => handleExport(game)}>
                            <Download className="mr-2 h-4 w-4" /> Export SGF
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
            <CardHeader>
                <CardTitle>No Games Played Yet</CardTitle>
                <CardDescription>Your game history will appear here once you complete a game.</CardDescription>
            </CardHeader>
        </Card>
      )}
    </div>
  );
}
