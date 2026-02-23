
"use client";

import { useEffect, useState } from 'react';
import { getPresetGame } from '@/app/actions/sgf';
import { LevelData } from '@/lib/types';
import { GoBoard } from '@/components/game/GoBoard';
import { SgfHeader } from '@/components/game/SgfHeader';
import { NavControls } from '@/components/game/NavControls';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSgfViewer } from '@/hooks/useSgfViewer';
import { Loader2, BookOpen } from 'lucide-react';

export default function SgfViewerPage() {
  const [gameData, setGameData] = useState<LevelData | null>(null);

  useEffect(() => {
    async function load() {
      const data = await getPresetGame("lee-sedol-g1");
      setGameData(data);
    }
    load();
  }, []);

  const viewer = useSgfViewer(gameData || { id: '', metadata: {}, boardSize: 19, handicaps: [], moves: [], totalSteps: 0 });

  if (!gameData) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <SgfHeader metadata={viewer.metadata} />

      <div className="grid lg:grid-cols-[1fr_350px] gap-8 items-start">
        <div className="space-y-6 flex flex-col items-center">
          <GoBoard 
            board={viewer.currentBoard} 
            size={gameData.boardSize} 
            readOnly={true}
            lastMove={viewer.lastMove}
          />
          <Card className="w-full max-w-[80vh] border-2">
            <CardContent className="p-4">
              <NavControls 
                currentIndex={viewer.currentIndex} 
                totalSteps={viewer.totalSteps} 
                onNext={viewer.nextStep} 
                onPrev={viewer.prevStep}
                onReset={viewer.reset}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-2 h-[600px] flex flex-col">
            <CardHeader className="bg-muted/30 border-b">
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpen className="h-4 w-4" /> 落子注解
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              <ScrollArea className="h-full p-4">
                <div className="space-y-4">
                   <p className="text-sm leading-relaxed text-muted-foreground">
                     {viewer.metadata.comment || "本对局暂无注解。通过步进按钮观察 AlphaGo 与顶级人类棋手的攻防逻辑。"}
                   </p>
                   <div className="border-t pt-4">
                      <h4 className="text-xs font-bold uppercase text-accent mb-2">对局关键点</h4>
                      <p className="text-xs text-muted-foreground">
                        当前第 {viewer.currentIndex} 手。
                        {viewer.lastMove && ` 最后落子坐标: ${String.fromCharCode(viewer.lastMove.c + 97).toUpperCase()}${gameData.boardSize - viewer.lastMove.r}`}
                      </p>
                   </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
