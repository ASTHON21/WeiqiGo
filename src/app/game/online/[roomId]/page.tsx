
"use client";

import { useParams, useSearchParams } from 'next/navigation';
import { GoBoard } from '@/components/game/GoBoard';
import { ToolPanel } from '@/components/game/ToolPanel';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Swords, Loader2, Book, Radio } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from '@/components/ui/scroll-area';
import { useEffect, useState } from 'react';
import { getRulesContent } from '@/app/actions/sgf';
import { useDoc, useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { createEmptyBoard, GoLogic } from '@/lib/go-logic';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { MoveSetting } from '@/lib/types';

export default function OnlineGamePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const roomId = params.roomId as string;
  const isSpectating = searchParams.get('mode') === 'spectate';
  const { user, loading: loadingUser } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [rules, setRules] = useState("");
  const [moveSetting, setMoveSetting] = useState<MoveSetting>('direct');
  
  const { data: game, isLoading: loadingGame } = useDoc(roomId ? doc(db, "games", roomId) : null);

  const movesQuery = useMemoFirebase(() => 
    query(collection(db, `games/${roomId}/moves`), orderBy("moveNumber", "asc")), 
    [db, roomId]
  );
  const { data: moves } = useCollection(movesQuery);

  useEffect(() => {
    getRulesContent().then(setRules);
  }, []);

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
  const isMyTurn = game && user && (
    (game.currentTurn === 'black' && user.uid === game.playerBlackId) ||
    (game.currentTurn === 'white' && user.uid === game.playerWhiteId)
  );
  const canMove = !isSpectating && isPlayer && game?.status !== 'finished' && isMyTurn;

  const handleMove = async (r: number, c: number) => {
    if (!canMove || !user || !game) return;

    const playerColor = user.uid === game.playerBlackId ? 'black' : 'white';
    const logicResult = GoLogic.processMove(board, r, c, playerColor, []);
    
    if (!logicResult.success) {
      toast({
        variant: "destructive",
        title: "无效落子",
        description: logicResult.error === 'occupied' ? "该位置已有棋子" : "违反围棋规则",
      });
      return;
    }

    try {
      await addDoc(collection(db, `games/${roomId}/moves`), {
        gameId: roomId,
        playerColor,
        coordinatesX: r,
        coordinatesY: c,
        moveNumber: (moves?.length || 0) + 1,
        timestamp: serverTimestamp(),
        evaluation: 0.5,
        playerBlackId: game.playerBlackId,
        playerWhiteId: game.playerWhiteId,
      });

      const nextTurn = playerColor === 'black' ? 'white' : 'black';
      await setDoc(doc(db, "games", roomId), {
        currentTurn: nextTurn,
        status: 'in-progress'
      }, { merge: true });

    } catch (err) {
      console.error("落子失败", err);
    }
  };

  const handlePass = async () => {
    if (!canMove || !user || !game) return;
    const playerColor = user.uid === game.playerBlackId ? 'black' : 'white';

    try {
      await addDoc(collection(db, `games/${roomId}/moves`), {
        gameId: roomId,
        playerColor,
        coordinatesX: -1,
        coordinatesY: -1,
        moveNumber: (moves?.length || 0) + 1,
        timestamp: serverTimestamp(),
        evaluation: 0.5,
        playerBlackId: game.playerBlackId,
        playerWhiteId: game.playerWhiteId,
      });

      const nextTurn = playerColor === 'black' ? 'white' : 'black';
      await setDoc(doc(db, "games", roomId), {
        currentTurn: nextTurn,
      }, { merge: true });

      toast({
        title: "已弃权",
        description: `${playerColor === 'black' ? '黑方' : '白方'}选择了弃权`,
      });
    } catch (err) {
      console.error("弃权失败", err);
    }
  };

  if (loadingGame || loadingUser) {
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
              onMove={handleMove}
              currentPlayer={game?.currentTurn}
              lastMove={moves?.length ? { r: moves[moves.length-1].coordinatesX, c: moves[moves.length-1].coordinatesY, player: moves[moves.length-1].playerColor } : null}
              moveSetting={moveSetting}
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
                   <span className="text-sm font-bold truncate max-w-[120px]">{game?.playerBlackName || '匿名黑方'}</span>
                 </div>
                 {game?.playerBlackId === user?.uid && <Badge variant="secondary">您</Badge>}
              </div>
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                   <div className="w-8 h-8 rounded-full bg-white border-2 border-black shadow-sm" />
                   <span className="text-sm font-bold truncate max-w-[120px]">{game?.playerWhiteName || '匿名白方'}</span>
                 </div>
                 {game?.playerWhiteId === user?.uid && <Badge variant="secondary">您</Badge>}
              </div>
            </CardContent>
          </Card>

          <div className="p-4 bg-muted/50 rounded-lg border-2 text-center">
            <p className="text-xs text-muted-foreground uppercase font-bold mb-1">当前回合</p>
            <div className="text-lg font-black flex items-center justify-center gap-2">
              <div className={cn("w-3 h-3 rounded-full border", game?.currentTurn === 'black' ? 'bg-black' : 'bg-white')} />
              {game?.currentTurn === 'black' ? '黑方落子' : '白方落子'}
            </div>
          </div>

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

          <ToolPanel 
            onPass={handlePass} 
            showChat={true} 
            moveSetting={moveSetting}
            onMoveSettingChange={setMoveSetting}
          />
        </div>
      </div>
    </div>
  );
}
