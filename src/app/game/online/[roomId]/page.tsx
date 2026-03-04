
"use client";

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { GoBoard } from '@/components/game/GoBoard';
import { ToolPanel } from '@/components/game/ToolPanel';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Swords, Timer, ArrowLeft, Trophy, ShieldAlert, Home, RefreshCw, Calculator, Wifi, Globe, Eye, XCircle, LogOut, AlertTriangle, UserX, Cpu, Flag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState, useMemo, Suspense, useRef } from 'react';
import { useDoc, useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { createEmptyBoard, GoLogic } from '@/lib/go-logic';
import { useToast } from '@/hooks/use-toast';
import { MoveSetting, Player, BoardState } from '@/lib/types';
import { cn } from '@/lib/utils';
import { AI_BOT_CONFIG } from '@/lib/ai/bot-constants';
import { KataGoController } from '@/lib/ai/katago-engine';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [isAiThinking, setIsAiThinking] = useState(false);
  const hasCheckedCatchup = useRef(false);
  
  const aiController = useRef<KataGoController | null>(null);

  const gameRef = useMemoFirebase(() => (db && roomId && user) ? doc(db, "games", roomId) : null, [db, roomId, user]);
  const { data: game, isLoading: loadingGame } = useDoc(gameRef);

  const opponentId = useMemo(() => {
    if (!game || !user) return null;
    return user.uid === game.playerBlackId ? game.playerWhiteId : game.playerBlackId;
  }, [game, user]);

  const opponentProfileRef = useMemoFirebase(() => (db && opponentId) ? doc(db, "userProfiles", opponentId) : null, [db, opponentId]);
  const { data: opponentProfile } = useDoc(opponentProfileRef);

  const isOpponentAi = opponentId === AI_BOT_CONFIG.uid;

  const isOpponentOffline = useMemo(() => {
    if (isOpponentAi) return false;
    if (!opponentProfile?.lastSeen) return false;
    const now = Date.now();
    const FIVE_MINUTES = 5 * 60 * 1000;
    const lastSeenTime = opponentProfile.lastSeen instanceof Timestamp ? opponentProfile.lastSeen.toMillis() : new Date(opponentProfile.lastSeen).getTime();
    return (now - lastSeenTime) > FIVE_MINUTES;
  }, [opponentProfile, isOpponentAi]);

  const isPending = game?.status === 'pending';
  const isFinished = game?.status === 'finished';
  const isInProgress = game?.status === 'in-progress';
  const isPlayer = user && (user.uid === game?.playerWhiteId || user.uid === game?.playerBlackId);
  
  const timeLimit = useMemo(() => {
    if (!game) return 10800;
    return BOARD_TIME_LIMITS[game.boardSize] || 10800;
  }, [game?.boardSize]);

  const movesQuery = useMemoFirebase(() => (db && roomId && user && (isInProgress || isFinished)) ? query(collection(db, `games/${roomId}/moves`), orderBy("moveNumber", "asc")) : null, [db, roomId, user, isInProgress, isFinished]);
  const { data: moves } = useCollection(movesQuery);

  useEffect(() => {
    if (isOpponentAi && game?.boardSize && isInProgress) {
      if (!aiController.current) {
        aiController.current = new KataGoController(game.boardSize);
        aiController.current.init().catch(err => {
          console.error("AI 引擎初始化失败:", err);
          toast({ variant: "destructive", title: "AI 初始化失败", description: "无法载入本地 WASM 模块，请检查网络或资源文件。" });
        });
      }
    }
    return () => {
      aiController.current?.terminate();
      aiController.current = null;
    };
  }, [isOpponentAi, game?.boardSize, isInProgress]);

  useEffect(() => {
    if (db && roomId && game && isPending && isOpponentAi && user?.uid === game.playerBlackId) {
      updateDoc(doc(db, "games", roomId), { 
        status: 'in-progress',
        startedAt: serverTimestamp(),
        lastActivityAt: serverTimestamp() 
      }).catch(() => {});
    }
  }, [db, roomId, game, isPending, isOpponentAi, user]);

  useEffect(() => {
    const handleAiTurn = async () => {
      if (!db || !roomId || !game || !isInProgress || isAiThinking || !aiController.current) return;
      if (game.currentTurn === 'white' && isOpponentAi && user?.uid === game.playerBlackId) {
        setIsAiThinking(true);
        try {
          const history = (moves || []).map(m => ({
            r: m.coordinatesX,
            c: m.coordinatesY,
            color: m.playerColor as 'black' | 'white'
          })).filter(m => m.r !== -1);
          await aiController.current.setHistory(history);
          const suggestion = await aiController.current.generateMove('white');
          if (suggestion.r === -1 && suggestion.c === -1) {
            handlePass('white');
          } else {
            handleMove('white', suggestion.r, suggestion.c);
          }
        } catch (error) {
          console.error("AI 决策异常:", error);
        } finally {
          setIsAiThinking(false);
        }
      }
    };
    if (game?.currentTurn === 'white' && isOpponentAi) {
        const timer = setTimeout(handleAiTurn, 1500);
        return () => clearTimeout(timer);
    }
  }, [game?.currentTurn, isOpponentAi, isInProgress, moves?.length]);

  useEffect(() => {
    if (db && roomId && isInProgress) {
      updateDoc(doc(db, "games", roomId), { lastActivityAt: serverTimestamp() }).catch(() => {});
    }
  }, [db, roomId, isInProgress]);

  useEffect(() => {
    if (game) {
      setTimeUsed({ 
        black: game.playerBlackTimeUsed || 0, 
        white: game.playerWhiteTimeUsed || 0 
      });
    }
  }, [game?.id, game?.playerBlackTimeUsed, game?.playerWhiteTimeUsed]);

  useEffect(() => {
    if (db && roomId && game && isInProgress && !isFinished && !hasCheckedCatchup.current) {
      if (!game.lastActivityAt) return; 
      const turn = game.currentTurn as 'black' | 'white';
      const lastActivity = game.lastActivityAt instanceof Timestamp ? game.lastActivityAt.toMillis() : new Date(game.lastActivityAt).getTime();
      const now = Date.now();
      if (lastActivity > now) {
        hasCheckedCatchup.current = true;
        return;
      }
      const elapsedSinceActivity = Math.floor((now - lastActivity) / 1000);
      const currentTimeUsed = turn === 'black' ? (game.playerBlackTimeUsed || 0) : (game.playerWhiteTimeUsed || 0);
      if (currentTimeUsed + elapsedSinceActivity > timeLimit + 10) {
        updateDoc(doc(db, "games", roomId), {
          status: 'finished',
          finishedAt: serverTimestamp(),
          lastActivityAt: serverTimestamp(),
          result: { 
            winner: turn === 'black' ? 'white' : 'black', 
            reason: '超时负 (自动结算)', 
            diff: 0,
            komi: game.komi || (game.rules === 'chinese' ? 3.75 : 6.5)
          }
        });
      }
      hasCheckedCatchup.current = true;
    }
  }, [db, roomId, game, isInProgress, isFinished, timeLimit]);

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
              moveCount: (moves?.length || 0),
              lastActivityAt: serverTimestamp(),
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
  }, [isInProgress, isFinished, isSpectating, isPlayer, game?.id, game?.currentTurn, timeLimit, db, roomId, moves?.length]);

  const { board, prisoners, boardHistory } = useMemo(() => {
    let tempBoard = createEmptyBoard(game?.boardSize || 19);
    let p = { black: 0, white: 0 };
    let history: BoardState[] = [];
    moves?.forEach(m => {
      history.push(tempBoard.map(row => [...row]));
      if (m.coordinatesX !== -1) {
        const result = GoLogic.processMove(tempBoard, m.coordinatesX, m.coordinatesY, m.playerColor, history.slice(-10));
        if (result.success) {
           tempBoard = result.newBoard;
           if (result.capturedCount > 0) p[m.playerColor === 'black' ? 'black' : 'white'] += result.capturedCount; 
        }
      }
    });
    return { board: tempBoard, prisoners: p, boardHistory: history };
  }, [game?.boardSize, moves]);

  const canMove = !isSpectating && isPlayer && isInProgress && (game?.currentTurn === (user?.uid === game?.playerBlackId ? 'black' : 'white')) && !isAiThinking;

  const handleMove = async (color: Player, r: number, c: number) => {
    if (!db || !roomId || !game) return;
    const result = GoLogic.processMove(board, r, c, color, boardHistory.slice(-10));
    if (!result.success) {
      if (color === 'black') {
        toast({ variant: "destructive", title: "落子受限", description: result.error === 'ko' ? "禁止打劫！" : "无效位置。" });
      }
      return;
    }
    addDoc(collection(db, `games/${roomId}/moves`), { 
      gameId: roomId, 
      playerColor: color, 
      coordinatesX: r, 
      coordinatesY: c, 
      moveNumber: (moves?.length || 0) + 1, 
      timestamp: Date.now() 
    });
    updateDoc(doc(db, "games", roomId), { 
      currentTurn: color === 'black' ? 'white' : 'black', 
      playerBlackTimeUsed: timeUsed.black, 
      playerWhiteTimeUsed: timeUsed.white, 
      moveCount: (moves?.length || 0) + 1,
      lastActivityAt: serverTimestamp() 
    });
  };

  const handlePass = async (color: Player) => {
    if (!db || !roomId || !game) return;
    const isConsecutivePass = moves?.length && moves[moves.length - 1].coordinatesX === -1;
    addDoc(collection(db, `games/${roomId}/moves`), { 
      gameId: roomId, 
      playerColor: color, 
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
        moveCount: (moves?.length || 0) + 1,
        lastActivityAt: serverTimestamp(),
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
        currentTurn: color === 'black' ? 'white' : 'black', 
        playerBlackTimeUsed: timeUsed.black,
        playerWhiteTimeUsed: timeUsed.white,
        moveCount: (moves?.length || 0) + 1,
        lastActivityAt: serverTimestamp() 
      });
    }
  };

  const handleResign = () => {
    if (!isPlayer || !game || isFinished || !user) return;
    updateDoc(doc(db, "games", roomId), { 
      status: 'finished', 
      finishedAt: serverTimestamp(), 
      moveCount: (moves?.length || 0),
      lastActivityAt: serverTimestamp(),
      result: { 
        winner: user.uid === game.playerBlackId ? 'white' : 'black', 
        reason: '对手认输', 
        diff: 0,
        komi: game.komi || (game.rules === 'chinese' ? 3.75 : 6.5)
      } 
    });
    setShowResignConfirm(false);
    toast({ title: "对局已结束", description: "您已认输。" });
  };

  const formatDuration = (s: number) => {
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loadingGame || loadingUser) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-primary w-12 h-12" /></div>;

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
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
            <Globe className="h-3 w-3 text-green-500" /> {isOpponentAi ? "本地 KataGo WASM 已载入" : "云端同步已开启"}
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="border-2 bg-background/50 font-mono">{game?.boardSize}x{game?.boardSize}</Badge>
          <Badge className="bg-blue-600 border-0">{game?.rules === 'chinese' ? '中国规则' : '日韩规则'}</Badge>
        </div>
      </div>

      <div className="flex justify-center">
          {isInProgress && (
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-3 px-6 py-2 rounded-full bg-background border-4 border-primary/10 shadow-lg animate-turn-indicator-pop">
                <div className={cn(
                  "w-4 h-4 rounded-full border-2 shadow-sm",
                  game.currentTurn === 'black' ? 'bg-black border-white/20' : 'bg-white border-black/10'
                )} />
                <span className="text-sm font-black uppercase tracking-[0.2em] text-foreground">
                  {isAiThinking && game.currentTurn === 'white' ? 'AI 正在本地思考...' : (game.currentTurn === 'black' ? '黑方回合' : '白方回合')}
                </span>
                {isAiThinking && game.currentTurn === 'white' && <Loader2 className="h-3 w-3 animate-spin text-blue-500" />}
              </div>
            </div>
          )}
      </div>

      <div className="grid lg:grid-cols-[1fr_350px] gap-8">
        <div className="relative">
          <GoBoard 
            board={board} 
            size={game?.boardSize || 19} 
            onMove={(r, c) => handleMove('black', r, c)} 
            currentPlayer={game?.currentTurn as Player} 
            readOnly={!canMove || isSpectating || isFinished || isAiThinking} 
            lastMove={moves?.length ? moves[moves.length-1] : null}
            moveSetting={moveSetting}
          />
          
          {(isFinished && !dismissGameOver) && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95">
              <Card className="w-full max-w-md border-4 border-primary shadow-2xl p-0 overflow-hidden">
                <CardHeader className="bg-primary text-primary-foreground p-6">
                  <CardTitle className="flex items-center justify-center gap-2 text-xl font-headline uppercase tracking-tight">
                    <Trophy className="h-6 w-6" /> 对局结算报告
                  </CardTitle>
                </CardHeader>
                <div className="p-8 space-y-6 bg-background">
                  <div className="p-6 rounded-2xl bg-blue-600/5 border-4 border-blue-600/20 text-center space-y-2">
                    <p className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em]">最终胜负 (Komi: {game.result?.komi})</p>
                    <h3 className="text-4xl font-black text-blue-800 font-headline">
                      {game.result?.winner === 'black' ? '黑方胜' : '白方胜'} {game.result?.diff?.toFixed(1) || '0.0'} 点
                    </h3>
                    <p className="text-xs text-muted-foreground italic">原因: {game.result?.reason}</p>
                  </div>
                </div>
                <CardFooter className="p-6 bg-muted/20 border-t flex gap-3">
                  <Button variant="outline" className="flex-1 h-12 font-bold border-2 gap-2" onClick={() => router.push('/game/online/lobby')}>
                    <ArrowLeft className="h-4 w-4" /> 返回大厅
                  </Button>
                  <Button className="flex-1 h-12 font-bold bg-primary hover:bg-primary/90 gap-2" onClick={() => setDismissGameOver(true)}>
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
              <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center justify-between">
                <div className="flex items-center gap-2"><Timer className="h-3 w-3" /> 计时与状态</div>
                <div className="flex items-center gap-1">
                   <div className={cn("w-1.5 h-1.5 rounded-full", isOpponentOffline ? "bg-red-500" : "bg-green-500")} />
                   <span className="text-[8px] opacity-70 uppercase">{isOpponentAi ? "AI WASM ONLINE" : (isOpponentOffline ? "OFFLINE" : "LIVE")}</span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className={cn("w-6 h-6 rounded-full bg-black shadow-md", isInProgress && game?.currentTurn === 'black' && "ring-2 ring-blue-500 ring-offset-2")} />
                  <span className={cn("font-bold truncate max-w-[120px]", isInProgress && game?.currentTurn === 'black' && "text-blue-600")}>{game?.playerBlackName}</span>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xl font-black tracking-tighter">{formatDuration(timeUsed.black)}</p>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  {isOpponentAi ? (
                    <div className={cn("w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-white", isInProgress && game?.currentTurn === 'white' && "ring-2 ring-blue-500 ring-offset-2")}>
                      <Cpu className="h-3 w-3" />
                    </div>
                  ) : (
                    <div className={cn("w-6 h-6 rounded-full bg-white border shadow-sm", isInProgress && game?.currentTurn === 'white' && "ring-2 ring-blue-500 ring-offset-2")} />
                  )}
                  <span className={cn("font-bold truncate max-w-[120px]", isInProgress && game?.currentTurn === 'white' && "text-blue-600")}>{game?.playerWhiteName}</span>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xl font-black tracking-tighter">{formatDuration(timeUsed.white)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="space-y-4">
            {isFinished && (
              <Button variant="default" className="w-full h-12 font-black bg-blue-600 hover:bg-blue-700 gap-2 shadow-lg" onClick={() => router.push('/game/online/lobby')}>
                <LogOut className="h-5 w-5" /> 退出并返回大厅
              </Button>
            )}
            <ToolPanel 
              onPass={canMove ? () => setShowPassConfirm(true) : undefined} 
              onResign={isInProgress && isPlayer ? () => setShowResignConfirm(true) : undefined} 
              onExit={() => router.push('/game/online/lobby')}
              moveSetting={moveSetting}
              onMoveSettingChange={setMoveSetting}
            />
          </div>
        </div>
      </div>

      <AlertDialog open={showPassConfirm} onOpenChange={setShowPassConfirm}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>确认弃权？</AlertDialogTitle></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>取消</AlertDialogCancel><AlertDialogAction onClick={() => handlePass('black')}>确认</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showResignConfirm} onOpenChange={setShowResignConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2 text-xl font-headline">
              <Flag className="h-6 w-6" /> 确认认输？
            </AlertDialogTitle>
            <div className="p-4 bg-destructive/5 rounded-lg border border-destructive/10 text-sm text-muted-foreground">
              认输后对局将立即结束，系统会判定对方获胜，并释放当前的竞技配额。
            </div>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 font-bold">取消</AlertDialogCancel>
            <AlertDialogAction className="h-11 bg-destructive hover:bg-destructive/90 font-bold" onClick={handleResign}>确认认输</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
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
