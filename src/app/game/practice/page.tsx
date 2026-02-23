
"use client";

import { usePracticeGame } from '@/hooks/usePracticeGame';
import { GoBoard } from '@/components/game/GoBoard';
import { ToolPanel } from '@/components/game/ToolPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Swords } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function PracticePage() {
  const practice = usePracticeGame(19);
  const { toast } = useToast();

  const handleMove = (r: number, c: number) => {
    const result = practice.makeMove(r, c);
    if (!result.success) {
      toast({
        title: "无效落子",
        description: result.error === 'ko' ? "禁止打劫！" : result.error === 'suicide' ? "禁止自杀！" : "该位置已有棋子。",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
         <h1 className="text-2xl font-bold flex items-center gap-2">
           <Swords className="text-primary" /> 本地练棋模式
         </h1>
         <div className="flex items-center gap-4">
           <div className="flex items-center gap-2">
             <div className={cn("w-3 h-3 rounded-full border", practice.currentTurn === 'black' ? 'bg-black' : 'bg-white')} />
             <span className="text-sm font-medium">{practice.currentTurn === 'black' ? '黑方回合' : '白方回合'}</span>
           </div>
           <Badge variant="secondary">第 {practice.moveHistory.length + 1} 手</Badge>
         </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_350px] gap-8 items-start">
        <div className="flex flex-col items-center">
          <GoBoard 
            board={practice.board} 
            size={19} 
            onMove={handleMove}
            currentPlayer={practice.currentTurn}
            lastMove={practice.moveHistory.length > 0 ? practice.moveHistory[practice.moveHistory.length - 1] : null}
          />
        </div>

        <div className="space-y-6">
          <ToolPanel 
            onUndo={practice.undo} 
            onReset={practice.reset} 
            onAnalysis={() => {}}
          />

          <Card className="border-2 h-[400px] flex flex-col">
            <CardHeader className="py-3 bg-muted/30 border-b">
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="h-4 w-4" /> 棋谱记录
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              <ScrollArea className="h-full p-2">
                <div className="grid grid-cols-2 gap-2">
                  {practice.moveHistory.map((m, i) => (
                    <div key={i} className="flex items-center gap-2 p-1.5 text-xs border rounded bg-muted/10">
                      <span className="text-muted-foreground w-4">{i + 1}.</span>
                      <div className={cn("w-2 h-2 rounded-full", m.player === 'black' ? 'bg-black' : 'bg-white border')} />
                      <span className="font-mono">
                        {String.fromCharCode(m.c + 97).toUpperCase()}{19 - m.r}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
