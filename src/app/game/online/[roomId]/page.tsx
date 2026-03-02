
"use client";

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { GoBoard } from '@/components/game/GoBoard';
import { ToolPanel } from '@/components/game/ToolPanel';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Swords, Timer, ArrowLeft, Trophy, ShieldAlert, Home, RefreshCw, Calculator, Wifi, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState, useMemo, Suspense } from 'react';
import { useDoc, useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { createEmptyBoard, GoLogic } from '@/lib/go-logic';
import { useToast } from '@/hooks/use-toast';
import { MoveSetting, Player } from '@/lib/types';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// 严格的时长规范：19路 3小时，13路 2小时，9路 1小时
const BOARD_TIME_LIMITS: Record<number, number> = {
  19: 3 * 3600, 
  13: 2 * 3600, 
  9: 1 * 3600   
};

function OnlineGameContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  const isSpectating = searchParams.get('mode') === 'spectate';
  const { user, loading: loadingUser } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [moveSetting, setMoveSetting] = useState<MoveSetting>('direct');
  const [dismissGameOver, setDismissGameOver] = useState(false);
  const [showPassConfirm, setShowPassConfirm] = useState(false);
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [timeUsed, setTimeUsed] = useState({ black: 0, white: 0 });

  const gameRef = useMemoFirebase(() => (db && roomId && user) ? doc(db, "games", roomId) : null, [db, roomId, user]);
  const { data: game, isLoading: loadingGame } = useDoc(gameRef);

  const isPending = game?.status === 'pending';
  const isFinished = game?.status === 'finished';
  const isInProgress = game?.status === 'in-progress';
  const isPlayer = user && (user.uid === game?.playerWhiteId || user.uid === game?.playerBlackId);
  
  const timeLimit = useMemo(() => {
    if (!game) return 10800;
    return BOARD_TIME_LIMITS[game.boardSize] || 10800;
  }, [game?.boardSize]);

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
        setTimeUsed(prev => {
          const color = game.currentTurn as 'black' | 'white';
          const nextValue = prev[color] + 1;
          
          if (nextValue >= timeLimit) {
            clearInterval(interval);
            updateDoc(doc(db, "games", roomId), {
              status: 'finished',
              finishedAt: serverTimestamp(),
              result: { 
                winner: color === 'black' ? 'white' : 'black', 
                reason: '超时负', 
                diff: 0,
                komi: game.komi || (game.rules === 'chinese' ? 3.75 : 6.5)
              }
            });
          }
          return { ...prev, [color]: nextValue };
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isInProgress, isFinished, isSpectating, isPlayer, game, timeLimit, db, roomId]);

  const movesQuery = useMemoFirebase(() => (db && roomId && user && (isInProgress || isFinished)) ? query(collection(db, `games/${roomId}/moves`), orderBy("moveNumber", "asc")) : null, [db, roomId, user, isInProgress, isFinished]);
  const { data: moves } = useCollection(movesQuery);

  const { board, prisoners } = useMemo(() => {
    let tempBoard = createEmptyBoard(game?.boardSize || 19);
    let p = { black: 0, white: 0 };
    moves?.forEach(m => {
      if (m.coordinatesX !== -1) {
        const result = GoLogic.processMove(tempBoard, m.coordinatesX, m.coordinatesY, m.playerColor, []);
        if (result.success) {
           tempBoard = result.newBoard;
           if (result.capturedCount > 0) p[m.playerColor === 'black' ? 'black' : 'white'] += result.capturedCount; 
        }
      }
    });
    return { board: tempBoard, prisoners: p };
  }, [game?.boardSize, moves]);

  const canMove = !isSpectating && isPlayer && isInProgress && (game?.currentTurn === (user?.uid === game?.playerBlackId ? 'black' : 'white'));

  const handleMove = async (r: number, c: number) => {
    if (!canMove || !user || !game) return;
    const playerColor = user.uid === game.playerBlackId ? 'black' : 'white';
    const result = GoLogic.processMove(board, r, c, playerColor, []);
    if (!result.success) return toast({ variant: "destructive", title: "无效落子" });

    addDoc(collection(db, `games/${roomId}/moves`), { 
      gameId: roomId, 
      playerColor, 
      coordinatesX: r, 
      coordinatesY: c, 
      moveNumber: (moves?.length || 0) + 1, 
      timestamp: Date.now() 
    });
    
    updateDoc(doc(db, "games", roomId), { 
      currentTurn: playerColor === 'black' ? 'white' : 'black', 
      playerBlackTimeUsed: timeUsed.black, 
      playerWhiteTimeUsed: timeUsed.white, 
      lastActivityAt: serverTimestamp() 
    });
  };

  const handlePass = async () => {
    if (!canMove || !user || !game) return;
    const playerColor = user.uid === game.playerBlackId ? 'black' : 'white';
    const isConsecutivePass = moves?.length && moves[moves.length - 1].coordinatesX === -1;

    addDoc(collection(db, `games/${roomId}/moves`), { 
      gameId: roomId, 
      playerColor, 
      coordinatesX: -1, 
      coordinatesY: -1, 
      moveNumber: (moves?.length || 0) + 1, 
      timestamp: Date.now() 
    });
    
    setShowPassConfirm(false);

    if (isConsecutivePass) {
      const score = game.rules === 'chinese' 
        ? GoLogic.calculateChineseScore(board) 
        : GoLogic.calculateJapaneseScore(board, prisoners.black, prisoners.white);
      
      updateDoc(doc(db, "games", roomId), { 
        status: 'finished', 
        finishedAt: serverTimestamp(), 
        result: { 
          winner: score.winner, 
          reason: '双方弃权', 
          blackScore: score.blackScore, 
          whiteScore: score.whiteScore, 
          diff: score.diff, 
          details: score.details,
          komi: score.komi
        } 
      });
    } else {
      updateDoc(doc(db, "games", roomId), { 
        currentTurn: playerColor === 'black' ? 'white' : 'black', 
        playerBlackTimeUsed: timeUsed.black,
        playerWhiteTimeUsed: timeUsed.white,
        lastActivityAt: serverTimestamp() 
      });
    }
  };

  const handleResign = () => {
    if (!isPlayer || !game || isFinished || !user) return;
    updateDoc(doc(db, "games", roomId), { 
      status: 'finished', 
      finishedAt: serverTimestamp(), 
      result: { 
        winner: user.uid === game.playerBlackId ? 'white' : 'black', 
        reason: '对手认输', 
        diff: 0,
        komi: game.komi || (game.rules === 'chinese' ? 3.75 : 6.5)
      } 
    });
    setShowResignConfirm(false);
  };

  const formatDuration = (s: number) => {
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loadingGame || loadingUser) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary w-12 h-12" /></div>;

  if (isPending) {
    return (
      <div className="h-screen flex items-center justify-center bg-background p-6">
        <Card className="max-w-md w-full border-4 border-blue-500 shadow-2xl">
          <CardHeader className="text-center">
            <div className="mx-auto w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-6">
              <Timer className="h-10 w-10 text-blue-600 animate-spin" />
            </div>
            <CardTitle className="text-3xl font-black font-headline text-blue-700">等待对手回应</CardTitle>
            <CardDescription className="text-lg">已向 <span className="font-bold text-foreground">{game?.playerWhiteName}</span> 发送挑战，请稍候...</CardDescription>
          </CardHeader>
          <CardFooter>
            <Button variant="outline" className="w-full gap-2 border-2" onClick={() => router.push('/game/online/lobby')}>
              <ArrowLeft className="h-4 w-4" /> 取消并返回大厅
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      {/* 顶部在线状态栏 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-blue-500/5 p-4 rounded-xl border-2 border-blue-500/10">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
             <div className="bg-blue-600 text-white text-[10px] font-black px-2 py-0.5 rounded-sm uppercase tracking-tighter">Live</div>
             <h2 className="text-sm font-black font-headline text-blue-700 tracking-tight flex items-center gap-2">
               <Wifi className="h-3 w-3 animate-pulse" /> 在线同步对弈 (ONLINE SYNC MATCH)
             </h2>
          </div>
          <div className="h-4 w-px bg-blue-500/20 hidden md:block" />
          <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            <Globe className="h-3 w-3 text-green-500" /> 云端同步已开启
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="border-2 bg-background/50 font-mono">{game?.boardSize}x{game?.boardSize}</Badge>
          <Badge className="bg-blue-600 border-0">{game?.rules === 'chinese' ? '中国规则' : '日韩规则'}</Badge>
        </div>
      </div>

      {/* 回合提示器 */}
      <div className="flex justify-center">
          {isInProgress && (
            <div className="flex items-center gap-3 px-6 py-2 rounded-full bg-background border-4 border-primary/10 shadow-lg animate-turn-indicator-pop">
              <div className={cn(
                "w-4 h-4 rounded-full border-2 shadow-sm",
                game.currentTurn === 'black' ? 'bg-black border-white/20' : 'bg-white border-black/10'
              )} />
              <span className="text-sm font-black uppercase tracking-[0.2em] text-foreground">
                {game.currentTurn === 'black' ? '黑方回合' : '白方回合'}
              </span>
            </div>
          )}
      </div>

      <div className="grid lg:grid-cols-[1fr_350px] gap-8">
        <div className="relative">
          <GoBoard 
            board={board} 
            size={game?.boardSize || 19} 
            onMove={handleMove} 
            currentPlayer={game?.currentTurn as Player} 
            readOnly={!canMove} 
            lastMove={moves?.length ? moves[moves.length-1] : null}
            moveSetting={moveSetting}
          />
          
          {isFinished && !dismissGameOver && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95">
              <Card className="w-full max-w-md border-4 border-primary shadow-2xl p-0 overflow-hidden">
                <CardHeader className="bg-primary text-primary-foreground p-6">
                  <CardTitle className="flex items-center justify-center gap-2 text-xl font-headline uppercase tracking-tight">
                    <Trophy className="h-6 w-6" /> 对局结算报告
                  </CardTitle>
                </CardHeader>
                <div className="p-8 space-y-6 bg-background">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-muted/30 border-2 border-primary/5 text-center space-y-1">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">黑方得分</p>
                      <p className="text-4xl font-black font-headline">{game.result?.blackScore?.toFixed(1) || '0.0'}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/30 border-2 border-primary/5 text-center space-y-1">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">白方得分</p>
                      <p className="text-4xl font-black font-headline">{game.result?.whiteScore?.toFixed(1) || '0.0'}</p>
                    </div>
                  </div>

                  <div className="p-6 rounded-2xl bg-blue-600/5 border-4 border-blue-600/20 text-center space-y-2">
                    <p className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em]">最终胜负 (Komi: {game.result?.komi})</p>
                    <h3 className="text-4xl font-black text-blue-800 font-headline">
                      {game.result?.winner === 'black' ? '黑方胜' : '白方胜'} {game.rules === 'chinese' ? (game.result?.diff * 2).toFixed(1) : game.result?.diff.toFixed(1)} 点
                    </h3>
                    <p className="text-xs text-muted-foreground italic">原因: {game.result?.reason}</p>
                  </div>
                </div>
                <CardFooter className="p-6 bg-muted/20 border-t flex gap-3">
                  <Button variant="outline" className="flex-1 h-12 font-bold border-2" onClick={() => router.push('/')}>
                    <Home className="h-4 w-4" /> 主页
                  </Button>
                  <Button className="flex-1 h-12 font-bold bg-primary hover:bg-primary/90" onClick={() => setDismissGameOver(true)}>
                    <RefreshCw className="h-4 w-4" /> 进入复盘
                  </Button>
                </CardFooter>
              </Card>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <Card className="border-2">
            <CardHeader className="py-2 bg-muted/20 border-b">
              <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <Timer className="h-3 w-3" /> 计时统计
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-6 h-6 rounded-full bg-black shadow-md",
                    game?.currentTurn === 'black' && "ring-2 ring-blue-500 ring-offset-2"
                  )} />
                  <span className={cn("font-bold truncate max-w-[120px]", game?.currentTurn === 'black' && "text-blue-600")}>{game?.playerBlackName}</span>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xl font-black tracking-tighter">{formatDuration(timeUsed.black)}</p>
                  <p className="text-[9px] text-muted-foreground uppercase font-bold">Limit: {Math.floor(timeLimit/3600)}H</p>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "w-6 h-6 rounded-full bg-white border shadow-sm",
                    game?.currentTurn === 'white' && "ring-2 ring-blue-500 ring-offset-2"
                  )} />
                  <span className={cn("font-bold truncate max-w-[120px]", game?.currentTurn === 'white' && "text-blue-600")}>{game?.playerWhiteName}</span>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xl font-black tracking-tighter">{formatDuration(timeUsed.white)}</p>
                  <p className="text-[9px] text-muted-foreground uppercase font-bold">Limit: {Math.floor(timeLimit/3600)}H</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <ToolPanel 
            onPass={canMove ? () => setShowPassConfirm(true) : undefined} 
            onResign={isInProgress && isPlayer ? () => setShowResignConfirm(true) : undefined} 
            showChat 
            moveSetting={moveSetting}
            onMoveSettingChange={setMoveSetting}
          />
        </div>
      </div>

      <AlertDialog open={showPassConfirm} onOpenChange={setShowPassConfirm}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>确认弃权？</AlertDialogTitle></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction onClick={handlePass}>确认</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={showResignConfirm} onOpenChange={setShowResignConfirm}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle className="text-destructive">确认认输？</AlertDialogTitle></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction className="bg-destructive" onClick={handleResign}>确认</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function OnlineGamePage() {
  return (
    <Suspense fallback={<div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>}>
      <OnlineGameContent />
    </Suspense>
  );
}
