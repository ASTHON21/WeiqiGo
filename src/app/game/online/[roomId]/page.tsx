
"use client";

import { useParams, useSearchParams } from 'next/navigation';
import { GoBoard } from '@/components/game/GoBoard';
import { ToolPanel } from '@/components/game/ToolPanel';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Swords, Loader2, Book, PlayCircle, Radio } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect, useState } from 'react';
import { getRulesContent } from '@/app/actions/sgf';
import { useDoc, useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { createEmptyBoard, GoLogic } from '@/lib/go-logic';

export default function OnlineGamePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params.roomId as string;
  const isSpectating = searchParams.get('mode') === 'spectate';
  const { user } = useUser();
  const db = useFirestore();

  const [rules, setRules] = useState("");
  
  // 实时订阅游戏文档
  const gameRef = useMemoFirebase(() => collection(db, "games"), [db]);
  const { data: game, isLoading: loadingGame } = useDoc(roomId ? { path: `games/${roomId}` } as any : null);

  // 实时订阅步数
  const movesQuery = useMemoFirebase(() => 
    query(collection(db, `games/${roomId}/moves`), orderBy("moveNumber", "asc")), 
    [db, roomId]
  );
  const { data: moves } = useCollection(movesQuery);

  useEffect(() => {
    getRulesContent().then(setRules);
  }, []);

  // 根据当前步数计算棋盘
  const board = (() => {
    if (!game) return createEmptyBoard(19);
    let tempBoard = createEmptyBoard(game.boardSize || 19);
    if (!moves) return tempBoard;
    
    moves.forEach(m => {
      const result = GoLogic.processMove(tempBoard, m.coordinatesX, m.coordinatesY, m.playerColor, []);
      if (result.success) tempBoard = result.newBoard;
    });
    return tempBoard;
  })();

  const isPlayer = user && (user.uid === game?.playerWhiteId || user.uid === game?.playerBlackId);
  const canMove = !isSpectating && isPlayer && game?.status === 'in-progress';

  if (loadingGame) {
    return (
      <div className="h-screen flex items-center justify-center bg-background/50 backdrop-blur-sm">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto" />
          <p className="text-muted-foreground font-medium">正在连接对局服务...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
         <h1 className="text-2xl font-bold flex items-center gap-2 text-blue-500">
           {isSpectating ? <Radio className="h-6 w-6 animate-pulse" /> : <Swords className="h-6 w-6" />}
           {isSpectating ? "正在观战" : "在线对局"}
         </h1>
         <div className="flex items-center gap-3">
           <Badge variant="outline">{game?.boardSize}x{game?.boardSize}</Badge>
           <Badge variant={game?.status === 'in-progress' ? 'default' : 'secondary'} className="flex items-center gap-1">
             {game?.status === 'in-progress' ? '对局中' : '等待中'}
           </Badge>
         </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_350px] gap-8 items-start">
        <div className="flex flex-col items-center">
          <div className="relative w-full max-w-[80vh]">
            <GoBoard 
              board={board} 
              size={game?.boardSize || 19} 
              readOnly={!canMove}
              lastMove={moves?.length ? { r: moves[moves.length-1].coordinatesX, c: moves[moves.length-1].coordinatesY, player: moves[moves.length-1].playerColor } : null}
            />
            {game?.status === 'pending' && !isSpectating && (
               <div className="absolute inset-0 z-50 bg-background/60 backdrop-blur-[2px] flex items-center justify-center rounded-lg border-4 border-dashed border-muted">
                  <div className="text-center space-y-4">
                     <Loader2 className="h-10 w-10 animate-spin text-blue-500 mx-auto" />
                     <p className="text-muted-foreground font-bold">等待对手进入房间...</p>
                  </div>
               </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <Card className="border-2">
            <CardHeader className="py-3 bg-blue-500/10 border-b">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" /> 对局选手
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                   <div className="w-8 h-8 rounded-full bg-black border-2 border-white shadow-sm" />
                   <span className="text-sm font-bold">Black</span>
                 </div>
                 {game?.playerBlackId === user?.uid && <Badge variant="secondary">You</Badge>}
              </div>
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                   <div className="w-8 h-8 rounded-full bg-white border-2 border-black shadow-sm" />
                   <span className="text-sm font-bold">White</span>
                 </div>
                 {game?.playerWhiteId === user?.uid && <Badge variant="secondary">You</Badge>}
              </div>
            </CardContent>
          </Card>

          {isSpectating && (
             <Card className="border-2 bg-accent/5 border-accent/20">
               <CardContent className="p-4 flex items-center gap-3">
                 <PlayCircle className="h-5 w-5 text-accent animate-pulse" />
                 <span className="text-sm font-medium">当前有 12 人正在共同观战</span>
               </CardContent>
             </Card>
          )}

          <Sheet>
            <SheetTrigger asChild>
              <Card className="border-2 cursor-pointer hover:bg-muted/50 transition-colors">
                <CardContent className="p-4 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <Book className="h-4 w-4 text-accent" />
                      <span className="text-sm font-bold">查阅竞赛规则</span>
                   </div>
                </CardContent>
              </Card>
            </SheetTrigger>
            <SheetContent side="right" className="w-[400px] sm:w-[540px]">
              <SheetHeader>
                <SheetTitle>中国围棋竞赛规则</SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-100px)] mt-4 pr-4">
                <div className="prose prose-sm dark:prose-invert">
                   <pre className="whitespace-pre-wrap font-sans text-sm">{rules}</pre>
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>

          <ToolPanel showChat={true} />
        </div>
      </div>
    </div>
  );
}
