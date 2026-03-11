
"use client";

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { GoBoard } from '@/components/game/GoBoard';
import { ToolPanel } from '@/components/game/ToolPanel';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Trophy, Globe, Flag, Hourglass, XCircle, SkipForward, History, Download, ChevronRight, Hash, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState, useMemo, Suspense, useRef } from 'react';
import { useDoc, useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { createEmptyBoard, GoLogic } from '@/lib/go-logic';
import { useToast } from '@/hooks/use-toast';
import { MoveSetting, Player, BoardState, GameHistoryEntry } from '@/lib/types';
import { cn } from '@/lib/utils';
import { exportToSGF } from '@/lib/sgf';
import { format } from 'date-fns';
import { ScrollArea } from "@/components/ui/scroll-area";
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

  const gameRef = useMemoFirebase(() => (db && roomId && user) ? doc(db, "games", roomId) : null, [db, roomId, user]);
  const { data: game, isLoading: loadingGame } = useDoc(gameRef);

  const movesQuery = useMemoFirebase(() => (db && roomId && user && game) ? query(collection(db, `games/${roomId}/moves`), orderBy("moveNumber", "asc")) : null, [db, roomId, user, game?.id]);
  const { data: moves } = useCollection(movesQuery);

  const opponentId = useMemo(() => {
    if (!game || !user) return null;
    return user.uid === game.playerBlackId ? game.playerWhiteId : game.playerBlackId;
  }, [game, user]);

  const opponentProfileRef = useMemoFirebase(() => (db && opponentId) ? doc(db, "userProfiles", opponentId) : null, [db, opponentId]);
  const { data: opponentProfile } = useDoc(opponentProfileRef);

  const isOpponentOffline = useMemo(() => {
    if (!opponentProfile?.lastSeen) return false;
    const now = Date.now();
    const FIVE_MINUTES = 5 * 60 * 1000;
    const lastSeenTime = opponentProfile.lastSeen instanceof Timestamp ? opponentProfile.lastSeen.toMillis() : new Date(opponentProfile.lastSeen).getTime();
    return (now - lastSeenTime) > FIVE_MINUTES;
  }, [opponentProfile]);

  const isFinished = game?.status === 'finished';
  const isInProgress = game?.status === 'in-progress';
  const isPlayer = user && game && (user.uid === game.playerWhiteId || user.uid === game.playerBlackId);
  
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
              moveCount: (moves?.length || 0),
              lastActivityAt: serverTimestamp(),
              result: { 
                winner: color === 'black' ? 'white' : 'black', 
                reason: '超时负', 
                diff: 0,
                komi: game.komi || (game.rules === 'chinese' ? 3.75 : 6.5)
              }
            }).catch(() => {});
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
        const result = GoLogic.processMove(tempBoard, m.coordinatesX, m.coordinatesY, m.playerColor as Player, history.slice(-10));
        if (result.success) {
           tempBoard = result.newBoard;
           if (result.capturedCount > 0) p[m.playerColor === 'black' ? 'black' : 'white'] += result.capturedCount; 
        }
      }
    });
    return { board: tempBoard, prisoners: p, boardHistory: history };
  }, [game?.boardSize, moves]);

  const canMove = !isSpectating && isPlayer && isInProgress && (game?.currentTurn === (user?.uid === game?.playerBlackId ? 'black' : 'white'));

  const handleMove = async (color: Player, r: number, c: number) => {
    if (!db || !roomId || !game || !moves) return;
    const result = GoLogic.processMove(board, r, c, color, boardHistory.slice(-10));
    if (!result.success) {
      toast({ variant: "destructive", title: "落子受限", description: result.error === 'ko' ? "禁止打劫！" : "无效位置。" });
      return;
    }
    addDoc(collection(db, `games/${roomId}/moves`), { 
      gameId: roomId, 
      playerColor: color, 
      coordinatesX: r, 
      coordinatesY: c, 
      moveNumber: moves.length + 1, 
      timestamp: Date.now() 
    });
    updateDoc(doc(db, "games", roomId), { 
      currentTurn: color === 'black' ? 'white' : 'black', 
      playerBlackTimeUsed: timeUsed.black, 
      playerWhiteTimeUsed: timeUsed.white, 
      moveCount: moves.length + 1,
      lastActivityAt: serverTimestamp() 
    });
  };

  const handlePass = async (color: Player) => {
    if (!db || !roomId || !game || !moves) return;
    const isConsecutivePass = moves.length > 0 && moves[moves.length - 1].coordinatesX === -1;
    addDoc(collection(db, `games/${roomId}/moves`), { 
      gameId: roomId, 
      playerColor: color, 
      coordinatesX: -1, 
      coordinatesY: -1, 
      moveNumber: moves.length + 1, 
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
        moveCount: moves.length + 1,
        lastActivityAt: serverTimestamp(),
        result: { 
          winner: score.winner, 
          reason: '双方弃权', 
          blackScore: score.blackScore, 
          whiteScore: score.whiteScore, 
          diff: score.diff, 
          details: score.details,
          komi: score.komi,
          isChinese: game.rules === 'chinese'
        } 
      });
    } else {
      updateDoc(doc(db, "games", roomId), { 
        currentTurn: color === 'black' ? 'white' : 'black', 
        playerBlackTimeUsed: timeUsed.black,
        playerWhiteTimeUsed: timeUsed.white,
        moveCount: moves.length + 1,
        lastActivityAt: serverTimestamp() 
      });
    }
  };

  const handleResign = () => {
    if (!isPlayer || !game || isFinished || !user || !moves) return;
    updateDoc(doc(db, "games", roomId), { 
      status: 'finished', 
      finishedAt: serverTimestamp(), 
      moveCount: moves.length,
      lastActivityAt: serverTimestamp(),
      result: { 
        winner: user.uid === game.playerBlackId ? 'white' : 'black', 
        reason: '对手认输', 
        diff: 0,
        komi: game.komi || (game.rules === 'chinese' ? 3.75 : 6.5)
      } 
    });
    setShowResignConfirm(false);
  };

  const handleDownloadSGF = () => {
    if (!game || !moves) return;
    const historyEntry: GameHistoryEntry = {
      id: game.id,
      date: game.startedAt instanceof Timestamp ? game.startedAt.toDate().toISOString() : new Date().toISOString(),
      mode: 'online',
      boardSize: game.boardSize,
      moveHistory: moves.map((m: any) => ({
        r: m.coordinatesX,
        c: m.coordinatesY,
        player: m.playerColor as Player,
        index: m.moveNumber
      })),
      metadata: {
        event: 'Online Synchronous Match',
        blackName: game.playerBlackName,
        whiteName: game.playerWhiteName,
        komi: (game.result?.komi || game.komi)?.toString(),
        rules: game.rules === 'chinese' ? 'Chinese' : 'Japanese',
        result: `${game.result?.winner === 'black' ? 'B' : 'W'}+${game.result?.diff?.toFixed(1) || '0.0'}`
      },
      result: game.result
    };
    try {
      const sgfData = exportToSGF(historyEntry);
      const blob = new Blob([sgfData], { type: 'application/x-go-sgf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `WEIQI_GO_ONLINE_${format(new Date(), 'yyyyMMdd_HHmm')}.sgf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: '导出成功', description: '棋谱已下载为 SGF 格式。' });
    } catch (error) {
      toast({ title: '导出失败', description: '生成 SGF 时出错。', variant: 'destructive' });
    }
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
             <h2 className="text-sm font-black font-headline text-blue-700 tracking-tight">
               在线同步对弈 (ONLINE SYNC MATCH)
             </h2>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            <Globe className="h-3 w-3 text-green-500" /> 云端同步已开启
          </div>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="border-2 bg-background/50 font-mono">{game?.boardSize}x{game?.boardSize}</Badge>
          <Badge className="bg-blue-600 border-0">{game?.rules === 'chinese' ? '中国规则' : '日韩规则'}</Badge>
        </div>
      </div>

      {isInProgress && !isFinished && (
        <div className="flex justify-center">
          <div className="flex items-center gap-3 px-6 py-2 rounded-full bg-background border-4 border-primary/10 shadow-lg animate-turn-indicator-pop">
            <div className={cn(
              "w-4 h-4 rounded-full border-2 shadow-sm",
              game.currentTurn === 'black' ? 'bg-black border-white/20' : 'bg-white border-black/10'
            )} />
            <span className="text-sm font-black uppercase tracking-[0.2em] text-foreground">
              {game.currentTurn === 'black' ? '黑方回合' : '白方回合'}
            </span>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_350px] gap-8">
        <div className="relative">
          <GoBoard 
            board={board} 
            size={game?.boardSize || 19} 
            onMove={(r, c) => handleMove(game?.currentTurn === 'black' ? 'black' : 'white', r, c)} 
            currentPlayer={game?.currentTurn as Player} 
            readOnly={!canMove || isFinished} 
            lastMove={moves?.length ? moves[moves.length-1] : null}
            moveSetting={moveSetting}
          />
          
          {(isFinished && !dismissGameOver) && (
            <div className="absolute inset-0 bg-background/80 flex items-center justify-center p-4 z-50 animate-in fade-in zoom-in-95">
              <Card className="w-full max-w-xl border-4 border-primary shadow-2xl p-0 overflow-hidden">
                <CardHeader className="bg-primary text-primary-foreground p-6">
                  <CardTitle className="flex items-center justify-center gap-2 text-xl font-headline uppercase tracking-tight">
                    <Trophy className="h-6 w-6" /> 对局结算报告
                  </CardTitle>
                </CardHeader>
                <ScrollArea className="max-h-[60vh] bg-background">
                  <div className="p-8 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-xl bg-muted/30 border-2 border-primary/10 text-center space-y-1">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">黑方得分</p>
                        <p className="text-4xl font-black font-headline leading-none">{game.result?.blackScore?.toFixed(2)}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-muted/30 border-2 border-primary/10 text-center space-y-1">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">白方得分</p>
                        <p className="text-4xl font-black font-headline leading-none">{game.result?.whiteScore?.toFixed(2)}</p>
                      </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-blue-600/10 border-4 border-blue-600/20 text-center space-y-2">
                      <p className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em]">判定详情</p>
                      <h3 className="text-4xl font-black text-blue-800 font-headline">
                        {game.result?.winner === 'black' ? '黑方获胜' : '白方获胜'}
                      </h3>
                      <div className="flex items-center justify-center gap-4 pt-2">
                        <Badge variant="outline" className="border-blue-600/30 text-blue-700 bg-white">
                          差距: {game.result?.diff?.toFixed(2)} {game.result?.isChinese ? '子' : '目'}
                        </Badge>
                        {game.result?.isChinese && (
                          <Badge variant="outline" className="border-blue-600/30 text-blue-700 bg-white">
                            折合目数: {(game.result?.diff * 2)?.toFixed(2)} 目
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground italic pt-2">原因: {game.result?.reason}</p>
                    </div>

                    {game.result?.details && (
                      <div className="p-4 border rounded-lg bg-muted/10 space-y-3 text-xs">
                         <p className="font-bold flex items-center gap-2 border-b pb-2 uppercase">
                            <Hash className="h-3.5 w-3.5 text-primary" /> 分项数据
                         </p>
                         <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                            <div className="flex justify-between items-center"><span className="text-muted-foreground">活子:</span><span className="font-mono font-bold">{game.result.details.blackStones} | {game.result.details.whiteStones}</span></div>
                            <div className="flex justify-between items-center"><span className="text-muted-foreground">围空:</span><span className="font-mono font-bold">{game.result.details.blackTerritory} | {game.result.details.whiteTerritory}</span></div>
                            
                            {game.rules === 'territory' && (
                              <div className="flex justify-between items-center"><span className="text-muted-foreground">提子:</span><span className="font-mono font-bold text-green-600">+{game.result.details.blackPrisoners} | +{game.result.details.whitePrisoners}</span></div>
                            )}
                            
                            <div className="flex justify-between items-center"><span className="text-muted-foreground">死子:</span><span className="font-mono font-bold text-destructive">{game.result.details.blackDeadOnBoard} | {game.result.details.whiteDeadOnBoard}</span></div>
                         </div>
                      </div>
                    )}
                  </div>
                </ScrollArea>
                <CardFooter className="p-6 bg-muted/20 border-t flex flex-col gap-3">
                  <div className="flex w-full gap-3">
                    <Button variant="outline" className="flex-1 h-12 font-bold border-2 gap-2" onClick={() => router.push('/game/online/lobby')}>
                      <ArrowLeft className="h-4 w-4" /> 返回大厅
                    </Button>
                    <Button variant="outline" className="flex-1 h-12 font-bold border-2 gap-2 border-blue-600 text-blue-700 hover:bg-blue-50" onClick={handleDownloadSGF}>
                      <Download className="h-4 w-4" /> 下载 SGF
                    </Button>
                  </div>
                  <Button className="w-full h-12 font-bold bg-primary hover:bg-primary/90 gap-2" onClick={() => setDismissGameOver(true)}>
                    <History className="h-4 w-4" /> 返回复盘
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
                计时与状态
                <div className="flex items-center gap-1">
                   <div className={cn("w-1.5 h-1.5 rounded-full", isOpponentOffline ? "bg-red-500" : "bg-green-500")} />
                   <span className="text-[8px] opacity-70 uppercase">{(isOpponentOffline ? "OFFLINE" : "LIVE")}</span>
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
                  <p className="text-[10px] text-muted-foreground uppercase">Limit: {formatDuration(timeLimit)}</p>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <div className={cn("w-6 h-6 rounded-full bg-white border shadow-sm", isInProgress && game?.currentTurn === 'white' && "ring-2 ring-blue-500 ring-offset-2")} />
                  <span className={cn("font-bold truncate max-w-[120px]", isInProgress && game?.currentTurn === 'white' && "text-blue-600")}>{game?.playerWhiteName}</span>
                </div>
                <div className="text-right">
                  <p className="font-mono text-xl font-black tracking-tighter">{formatDuration(timeUsed.white)}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Limit: {formatDuration(timeLimit)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="space-y-4">
            <ToolPanel 
              onPass={canMove ? () => setShowPassConfirm(true) : undefined} 
              onResign={isInProgress && isPlayer ? () => setShowResignConfirm(true) : undefined} 
              moveSetting={moveSetting}
              onMoveSettingChange={setMoveSetting}
            />
          </div>
        </div>
      </div>

      <AlertDialog open={showPassConfirm} onOpenChange={setShowPassConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-xl font-headline">
              <SkipForward className="h-6 w-6 text-blue-500" /> 确认弃权？
            </AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 font-bold">取消</AlertDialogCancel>
            <AlertDialogAction className="h-11 bg-blue-600 hover:bg-blue-700 font-bold" onClick={() => handlePass(game?.currentTurn === 'black' ? 'black' : 'white')}>
              确认弃权
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showResignConfirm} onOpenChange={setShowResignConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive flex items-center gap-2 text-xl font-headline">
              <Flag className="h-6 w-6" /> 确认认输？
            </AlertDialogTitle>
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
