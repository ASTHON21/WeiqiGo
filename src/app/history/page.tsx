'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { GameHistoryEntry } from '@/lib/types';
import { format } from 'date-fns';
import { Download, Trash2 } from 'lucide-react';
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

export default function HistoryPage() {
  const [history, setHistory] = useState<GameHistoryEntry[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const storedHistory = localStorage.getItem('goMasterHistory');
    if (storedHistory) {
      setHistory(JSON.parse(storedHistory));
    }
  }, []);

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
      toast({
        title: 'Export Successful',
        description: `Game from ${format(new Date(game.date), 'yyyy/MM/dd HH:mm')} has been exported.`,
      });
    } catch (error) {
      console.error("Failed to export SGF:", error);
      toast({
        title: 'Export Failed',
        description: 'There was an error creating the SGF file.',
        variant: 'destructive',
      });
    }
  };
  
  const handleClearHistory = () => {
    localStorage.removeItem('goMasterHistory');
    setHistory([]);
    toast({
      title: 'History Cleared',
      description: 'Your game history has been successfully cleared.',
    });
  }

  return (
    <div className="space-y-6">
       <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold font-headline">Game History</h1>
          <p className="text-muted-foreground">
            A record of your past self-play games. You can export games for review.
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={history.length === 0}>
              <Trash2 className="mr-2 h-4 w-4" /> Clear History
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete all your game history.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearHistory}>Continue</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Board Size</TableHead>
                <TableHead>Winner</TableHead>
                <TableHead>Score (B vs W)</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead className="text-right">Export</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length > 0 ? (
                history.map((game) => (
                  <TableRow key={game.id}>
                    <TableCell className="font-mono text-sm">{format(new Date(game.date), 'yyyy/MM/dd HH:mm:ss')}</TableCell>
                    <TableCell>{game.boardSize}x{game.boardSize}</TableCell>
                    <TableCell>
                      {game.result?.winner && game.result.winner !== 'draw' ? (
                        <Badge variant={game.result.winner === 'black' ? 'default' : 'outline'} className={game.result.winner === 'white' ? 'bg-white text-black border-black/50' : 'bg-black text-white'}>
                          {game.result.winner}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Draw</Badge>
                      )}
                    </TableCell>
                    <TableCell className="font-mono">
                      {game.result?.blackScore?.toFixed(1) ?? 'N/A'} - {game.result?.whiteScore?.toFixed(1) ?? 'N/A'}
                    </TableCell>
                    <TableCell>{game.result?.reason}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handleExport(game)}>
                        <Download className="mr-2 h-4 w-4" />
                        Export SGF
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No game history found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
