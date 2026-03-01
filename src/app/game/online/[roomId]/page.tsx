"use client";

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { GoBoard } from '@/components/game/GoBoard';
import { ToolPanel } from '@/components/game/ToolPanel';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Swords, Loader2, Cloud, Lock, Wifi, WifiOff, Home, Hourglass, ShieldAlert, Trophy, Info, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState, useMemo } from 'react';
import { getRulesContent } from '@/app/actions/sgf';
import { useDoc, useFirestore, useUser, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { createEmptyBoard, GoLogic } from '@/lib/go-logic';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { MoveSetting, Player } from '@/lib/types';
import { useLanguage } from '@/context/language-context';

export default function OnlineGamePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  const isSpectating = searchParams.get('mode') === 'spectate';
  const { user, loading: loadingUser } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const { language } = useLanguage();

  const [rules, setRules] = useState("");
  const [moveSetting, setMoveSetting] = useState<MoveSetting>('direct');
  const [dismissGameOver, setDismissGameOver] = useState(false);
  
  const [timeUsed, setTimeUsed] = useState({ black: 0, white: 0 });

  // 核心修复：必须使用 useMemoFirebase 记忆化文档引用
  const gameRef = useMemoFirebase(() => {
    if (!db || !roomId || !user) return null;
    return doc(db, "games", roomId);
  }, [db, roomId, user]);

  const { data: game, isLoading: loadingGame } = useDoc(gameRef);

  const isFinished = game?.status === 'finished';
  const isPending = game?.status === 'pending';
  const isInProgress = game?.status === 'in-progress';
  const isDeclined = game?.status === 'finished' && game?.reason === 'declined';
  const isCancelled = game?.status === 'finished' && game?.reason === 'cancelled';
  const isPlayer = user && (user.uid === game?.playerWhiteId || user.uid === game?.playerBlackId);

  useEffect(() => {
    if ((isDeclined || isCancelled) && isPlayer && !isSpectating) {
      const title = isDeclined ? "挑战被拒绝" : "对局已取消";
      const desc = isDeclined ? "对方已婉拒您的对局邀请。" : "发起方已取消了本次对局邀请。";
      
      toast({
        variant: "destructive",
        title: title,
        description: desc + " 正在返回大厅...",
      });
      
      const timer = setTimeout(() => {
        router.push('/game/online/lobby');
      }, 2500);
      
      return () => clearTimeout(timer);
    }
  }, [isDeclined, isCancelled, isPlayer, isSpectating, router, toast]);

  useEffect(() => {
    if (game) {
      setTimeUsed({
        black: game.playerBlackTimeUsed || 0,
        white: game.playerWhiteTimeUsed || 0
      });
    }
  }, [game?.id, game?.playerBlackTimeUsed, game?.playerWhiteTimeUsed]);

  useEffect(() => {
    if (isInProgress && !isFinished && !isSpectating && isPlayer && game?.currentTurn) {
      const interval = setInterval(() => {
        setTimeUsed(prev => ({
          ...prev,
          [game.currentTurn]: prev[game.currentTurn as 'black' | 'white'] + 1
        }));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isInProgress, isFinished, isSpectating, isPlayer, game?.currentTurn]);

  const movesQuery = useMemoFirebase(() => {
    if (!db || !roomId || !user || (!isInProgress && !isFinished)) return null;
    return query(collection(db, `games/${roomId}/moves`), orderBy("moveNumber", "asc"));
  }, [db, roomId, user, isInProgress, isFinished]);
  const { data: moves } = useCollection(movesQuery);

  useEffect(() => {
    if (game?.rules) {
      getRulesContent(game.rules as 'chinese' | 'territory', language).then(setRules);
    }
  }, [game?.rules, language]);

  const { board, prisoners } = useMemo(() => {
    let tempBoard = createEmptyBoard(game?.boardSize || 19);
    let p = { black: 0, white: 0 };
    if (!moves) return { board: tempBoard, prisoners: p };
    
    moves.forEach(m => {
      if (m.coordinatesX !== -1) {
        const result = GoLogic.processMove(tempBoard, m.coordinatesX, m.coordinatesY, m.playerColor, []);
        if (result.success) {
           tempBoard = result.newBoard;
           if (result.capturedCount > 0) {
             const color = m.playerColor as 'black' | 'white';
             p[color === 'black' ? 'black' : 'white'] += result.capturedCount; 
           }
        }
      }
    });
    return { board: tempBoard, prisoners: p };
  }, [game?.boardSize, moves]);

  const isMyTurn = game && user && (
    (game.currentTurn === 'black' && user.uid === game.playerBlackId) ||
    (game.currentTurn === 'white' && user.uid === game.playerWhiteId)
  );
  
  const canMove = !isSpectating && isPlayer && isInProgress && isMyTurn;

  const handleMove = async (r: number, c: number) => {
    if (!canMove || !user || !game) return;

    const playerColor = user.uid === game.playerBlackId ? 'black' : 'white';
    const logicResult = GoLogic.processMove(board, r, c, playerColor, []);
    
    if (!logicResult.success) {
      toast({
        variant: "destructive",
        title: "无法落子",
        description: logicResult.error === 'ko' ? "禁止打劫" : "违反围棋规则",
      });
      return;
    }

    const moveData = {
      gameId: roomId,
      playerColor,
      coordinatesX: r,
      coordinatesY: c,
      moveNumber: (moves?.length || 0) + 1,
      timestamp: Date.now(),
      evaluation: 0.5,
    };

    addDoc(collection(db, `games/${roomId}/moves`), moveData).catch(err => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: `games/${roomId}/moves`,
          operation: 'create',
          requestResourceData: moveData
        }));
    });

    const nextTurn = playerColor === 'black' ? 'white' : 'black';
    updateDoc(doc(db, "games", roomId), {
      currentTurn: nextTurn,
      moveCount: (game.moveCount || 0) + 1,
      playerBlackTimeUsed: timeUsed.black,
      playerWhiteTimeUsed: timeUsed.white,
      lastActivityAt: serverTimestamp()
    });
  };

  const handlePass = async () => {
    if (!canMove || !user || !game) return;
    const playerColor = user.uid === game.playerBlackId ? 'black' : 'white';

    const lastMove = moves?.[moves.length - 1];
    const isConsecutivePass = lastMove && lastMove.coordinatesX === -1 && lastMove.coordinatesY === -1;

    const moveData = {
      gameId: roomId,
      playerColor,
      coordinatesX: -1,
      coordinatesY: -1,
      moveNumber: (moves?.length || 0) + 1,
      timestamp: Date.now(),
    };

    addDoc(collection(db, `games/${roomId}/moves`), moveData);

    if (isConsecutivePass) {
      const ruleType = game.rules as 'chinese' | 'territory';
      const score = ruleType === 'chinese' 
        ? GoLogic.calculateChineseScore(board)
        : GoLogic.calculateJapaneseScore(board, prisoners.black, prisoners.white);

      updateDoc(doc(db, "games", roomId), {
        status: 'finished',
        finishedAt: serverTimestamp(),
        moveCount: (game.moveCount || 0) + 1,
        playerBlackTimeUsed: timeUsed.black,
        playerWhiteTimeUsed: timeUsed.white,
        lastActivityAt: serverTimestamp(),
        result: {
          winner: score.winner,
          reason: '双方连续弃权',
          blackScore: score.blackTotal,
          whiteScore: score.whiteTotal,
          details: score.details || null,
          komi: score.komi,
          diff: score.diff
        }
      });
    } else {
      const nextTurn = playerColor === 'black' ? 'white' : 'black';
      updateDoc(doc(db, "games", roomId), {
        currentTurn: nextTurn,
        moveCount: (game.moveCount || 0) + 1,
        playerBlackTimeUsed: timeUsed.black,
        playerWhiteTimeUsed: timeUsed.white,
        lastActivityAt: serverTimestamp()
      });
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loadingGame || loadingUser) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto" />
          <p className="text-muted-foreground font-bold font-headline">同步云端博弈状态...</p>
        </div>
      </div>
    );
  }

  if (isPending && !isSpectating) {
    return (
      <div className="h-screen flex items-center justify-center bg-background/95">
        <div className="text-center space-y-8 max-w-sm px-6">
          <div className="relative mx-auto w-32 h-32">
             <Hourglass className="h-full w-full text-blue-500 animate-pulse opacity-20" />
             <div className="absolute inset-0 flex items-center justify-center">
                <Cloud className="h-12 w-12 text-blue-600 animate-bounce" />
             </div>
          </div>
          <div className="space-y-3">
            <h2 className="text-3xl font-black font-headline tracking-tight">建立云端通道中</h2>
            <p className="text-muted-foreground leading-relaxed">
              正在等待对方确认应战。一旦连接建立，棋盘将自动同步为您开启。
            </p>
          </div>
          <div className="pt-6">
            <Button variant="outline" className="w-full h-12 font-bold border-2" onClick={() => router.push('/game/online/lobby')}>
              取消并返回大厅
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
         <h1 className="text-2xl font-bold flex items-center gap-2 text-blue-500 font-headline">
           <Cloud className={cn("h-6 w-6", isSpectating && "animate-pulse")} />
           {isSpectating ? "云端名局观摩" : "在线同步对弈"}
           {isFinished && <Badge variant="destructive" className="gap-1"><Lock className="h-3 w-3" /> 对局结算完毕</Badge>}
         </h1>
         <div className="flex flex-wrap items-center gap-3">
           {!isSpectating && !isFinished && isInProgress && (
             <Badge variant="default" className="gap-1.5 h-7 bg-green-600">
               <Wifi className="h-3.5 w-3.5" />
               云端实时同步
             </Badge>
           )}
           <Badge variant="outline" className="font-mono">{game?.boardSize}x{game?.boardSize}</Badge>
           <Badge variant="secondary">{game?.rules === 'chinese' ? '中国规则' : '日韩规则'}</Badge>
         </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_350px] gap-8 items-start">
        <div className="flex flex-col items-center">
          <div className="relative w-full max-w-[80vh]">
            <GoBoard 
              board={board} 
              size={game?.boardSize || 19} 
              readOnly={!canMove || isFinished}
              onMove={handleMove}
              currentPlayer={game?.currentTurn as Player}
              lastMove={moves?.length ? { r: moves[moves.length-1].coordinatesX, c: moves[moves.length-1].coordinatesY, player: moves[moves.length-1].playerColor } : null}
              moveSetting={moveSetting}
            />
            
            {isFinished && !dismissGameOver && !isDeclined && !isCancelled && (
               <div className="absolute inset-0 z-50 bg-background/40 backdrop-blur-[1px] flex items-center justify-center rounded-lg p-4">
                  <Card className="max-w-md w-full border-4 border-blue-500 shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-full">
                    <CardHeader className="bg-blue-600 text-white py-5 text-center sticky top-0 z-10">
                      <CardTitle className="flex items-center justify-center gap-2 text-xl font-headline uppercase">
                        <ShieldAlert className="h-6 w-6" /> 对局结算报告
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 text-center space-y-6 bg-background">
                       <h2 className="text-3xl font-black font-headline text-foreground leading-none">对局圆满结束</h2>
                       
                       <div className="grid grid-cols-2 gap-4">
                         <div className="p-4 rounded-xl bg-black/5 border-2 border-primary/10 text-center space-y-1">
                           <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">黑方点数</p>
                           <p className="text-3xl font-black text-foreground font-headline leading-none">{game.result?.blackScore?.toFixed(1) || '0.0'}</p>
                           <p className="text-[10px] text-muted-foreground mt-1">耗时: {formatDuration(game.playerBlackTimeUsed || 0)}</p>
                         </div>
                         <div className="p-4 rounded-xl bg-black/5 border-2 border-primary/10 text-center space-y-1">
                           <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">白方点数</p>
                           <p className="text-3xl font-black text-foreground font-headline leading-none">{game.result?.whiteScore?.toFixed(1) || '0.0'}</p>
                           <p className="text-[10px] text-muted-foreground mt-1">耗时: {formatDuration(game.playerWhiteTimeUsed || 0)}</p>
                         </div>
                       </div>

                       {game.result?.details && (
                         <div className="bg-muted/40 p-5 rounded-xl space-y-3 border shadow-inner text-left">
                           <p className="text-xs font-black border-b pb-2 flex items-center gap-2 text-foreground uppercase tracking-wider">
                             <Calculator className="h-4 w-4 text-blue-500" /> 对局详情 breakdown
                           </p>
                           <div className="grid grid-cols-1 gap-y-2 text-[12px] font-medium text-muted-foreground">
                             {game.rules === 'chinese' ? (
                               <>
                                 <div className="flex justify-between items-center">
                                   <span>黑方子数 (Stones):</span> 
                                   <span className="text-foreground font-bold">{game.result.details.blackStones}</span>
                                 </div>
                                 <div className="flex justify-between items-center">
                                   <span>黑方围地 (Territory):</span> 
                                   <span className="text-foreground font-bold">{game.result.details.blackTerritory}</span>
                                 </div>
                                 <div className="flex justify-between items-center">
                                   <span>白方子数 (Stones):</span> 
                                   <span className="text-foreground font-bold">{game.result.details.whiteStones}</span>
                                 </div>
                                 <div className="flex justify-between items-center">
                                   <span>白方围地 (Territory):</span> 
                                   <span className="text-foreground font-bold">{game.result.details.whiteTerritory}</span>
                                 </div>
                                 <div className="flex justify-between items-center text-blue-500">
                                   <span>公气/单官 (Neutral):</span> 
                                   <span className="font-bold">{game.result.details.neutralPoints}</span>
                                 </div>
                               </>
                             ) : (
                               <>
                                 <div className="flex justify-between items-center">
                                   <span>黑方围空 (Territory):</span> 
                                   <span className="text-foreground font-bold">{game.result.details.blackTerritory} 目</span>
                                 </div>
                                 <div className="flex justify-between items-center">
                                   <span>白方围空 (Territory):</span> 
                                   <span className="text-foreground font-bold">{game.result.details.whiteTerritory} 目</span>
                                 </div>
                                 <div className="flex justify-between items-center text-blue-600">
                                   <span>黑方提子 (Prisoners):</span> 
                                   <span className="font-bold">+{game.result.details.blackPrisoners}</span>
                                 </div>
                                 <div className="flex justify-between items-center text-blue-600">
                                   <span>白方提子 (Prisoners):</span> 
                                   <span className="font-bold">+{game.result.details.whitePrisoners}</span>
                                 </div>
                               </>
                             )}
                           </div>
                         </div>
                       )}

                       <div className="p-6 bg-blue-500/10 rounded-2xl border-4 border-blue-500/20 space-y-2">
                          <p className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em]">最终判定 (总手数: {game.moveCount})</p>
                          <p className="text-4xl font-black font-headline text-blue-800">
                            {game.result?.winner === 'black' ? '黑方胜' : '白方胜'} {game.rules === 'chinese' ? (game.result?.diff * 2).toFixed(1) : game.result?.diff.toFixed(1)} 目
                          </p>
                       </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-3 bg-muted/30 p-6 border-t sticky bottom-0 z-10">
                       <div className="grid grid-cols-2 w-full gap-3">
                         <Button variant="ghost" className="h-12 font-bold gap-2 border-2 bg-background" onClick={() => router.push('/')}>
                           <Home className="h-4 w-4" /> 返回主页
                         </Button>
                         <Button variant="outline" className="h-12 font-bold border-2 bg-background" onClick={() => setDismissGameOver(true)}>
                           留房复盘
                         </Button>
                       </div>
                    </CardFooter>
                  </Card>
               </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <Card className="border-2 shadow-sm">
            <CardHeader className="py-3 bg-blue-500/10 border-b">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" /> 对局选手
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                   <div className="w-8 h-8 rounded-full bg-black border-2 border-white shadow-sm" />
                   <div className="flex flex-col">
                    <span className="text-sm font-bold truncate max-w-[120px]">{game?.playerBlackName || '黑方选手'}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{formatDuration(timeUsed.black)}</span>
                   </div>
                 </div>
                 {game?.playerBlackId === user?.uid && <Badge variant="secondary" className="text-[10px] px-2">您</Badge>}
              </div>
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                   <div className="w-8 h-8 rounded-full bg-white border-2 border-black shadow-sm" />
                   <div className="flex flex-col">
                    <span className="text-sm font-bold truncate max-w-[120px]">{game?.playerWhiteName || '白方选手'}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{formatDuration(timeUsed.white)}</span>
                   </div>
                 </div>
                 {game?.playerWhiteId === user?.uid && <Badge variant="secondary" className="text-[10px] px-2">您</Badge>}
              </div>
            </CardContent>
          </Card>

          {game?.rules === 'territory' && (
            <Card className="border-2 border-blue-500/20 bg-blue-500/5">
              <CardHeader className="py-3 border-b">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-blue-600" /> 实时对局统计
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 grid grid-cols-2 gap-4">
                <div className="text-center">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">黑方提子</p>
                  <p className="text-2xl font-black">{prisoners.black}</p>
                </div>
                <div className="text-center border-l">
                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">白方提子</p>
                  <p className="text-2xl font-black">{prisoners.white}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {!isFinished && isInProgress && (
            <div className="p-4 bg-muted/50 rounded-lg border-2 text-center border-blue-500/20 shadow-inner">
              <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1 tracking-wider">当前落子</p>
              <div className="text-lg font-black flex items-center justify-center gap-2 font-headline">
                <div className={cn("w-3 h-3 rounded-full border shadow-sm", game?.currentTurn === 'black' ? 'bg-black' : 'bg-white')} />
                {game?.currentTurn === 'black' ? '黑方回合' : '白方回合'}
              </div>
            </div>
          )}

          <ToolPanel 
            onPass={canMove ? handlePass : undefined} 
            showChat={true} 
            moveSetting={canMove ? moveSetting : undefined}
            onMoveSettingChange={setMoveSetting}
          />
        </div>
      </div>
    </div>
  );
}
