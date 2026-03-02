
"use client";

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { GoBoard } from '@/components/game/GoBoard';
import { ToolPanel } from '@/components/game/ToolPanel';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState, useMemo, Suspense } from 'react';
import { useDoc, useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { createEmptyBoard, GoLogic } from '@/lib/go-logic';
import { useToast } from '@/hooks/use-toast';
import { MoveSetting, Player } from '@/lib/types';
import { useLanguage } from '@/context/language-context';
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
  19: 3 * 3600, 13: 2 * 3600, 9: 1 * 3600
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
  const { language } = useLanguage();

  const [moveSetting, setMoveSetting] = useState<MoveSetting>('direct');
  const [dismissGameOver, setDismissGameOver] = useState(false);
  const [showPassConfirm, setShowPassConfirm] = useState(false);
  const [showResignConfirm, setShowResignConfirm] = useState(false);
  const [timeUsed, setTimeUsed] = useState({ black: 0, white: 0 });

  const gameRef = useMemoFirebase(() => (db && roomId && user) ? doc(db, "games", roomId) : null, [db, roomId, user]);
  const { data: game, isLoading: loadingGame } = useDoc(gameRef);

  const isFinished = game?.status === 'finished';
  const isInProgress = game?.status === 'in-progress';
  const isPlayer = user && (user.uid === game?.playerWhiteId || user.uid === game?.playerBlackId);
  const timeLimit = useMemo(() => BOARD_TIME_LIMITS[game?.boardSize || 19] || 10800, [game?.boardSize]);

  useEffect(() => {
    if (game) setTimeUsed({ black: game.playerBlackTimeUsed || 0, white: game.playerWhiteTimeUsed || 0 });
  }, [game?.id, game?.playerBlackTimeUsed, game?.playerWhiteTimeUsed]);

  useEffect(() => {
    if (isInProgress && !isFinished && !isSpectating && isPlayer && game?.currentTurn) {
      const interval = setInterval(() => {
        setTimeUsed(prev => {
          const color = game.currentTurn as 'black' | 'white';
          const nextValue = prev[color] + 1;
          if (nextValue >= timeLimit) {
            updateDoc(doc(db, "games", roomId), {
              status: 'finished',
              finishedAt: serverTimestamp(),
              result: { winner: color === 'black' ? 'white' : 'black', reason: '超时负', diff: 0 }
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

    addDoc(collection(db, `games/${roomId}/moves`), { gameId: roomId, playerColor, coordinatesX: r, coordinatesY: c, moveNumber: (moves?.length || 0) + 1, timestamp: Date.now() });
    updateDoc(doc(db, "games", roomId), { currentTurn: playerColor === 'black' ? 'white' : 'black', playerBlackTimeUsed: timeUsed.black, playerWhiteTimeUsed: timeUsed.white, lastActivityAt: serverTimestamp() });
  };

  const handlePass = async () => {
    if (!canMove || !user || !game) return;
    const playerColor = user.uid === game.playerBlackId ? 'black' : 'white';
    const isConsecutivePass = moves?.length && moves[moves.length - 1].coordinatesX === -1;

    addDoc(collection(db, `games/${roomId}/moves`), { gameId: roomId, playerColor, coordinatesX: -1, coordinatesY: -1, moveNumber: (moves?.length || 0) + 1, timestamp: Date.now() });
    setShowPassConfirm(false);

    if (isConsecutivePass) {
      const score = game.rules === 'chinese' ? GoLogic.calculateChineseScore(board) : GoLogic.calculateJapaneseScore(board, prisoners.black, prisoners.white);
      updateDoc(doc(db, "games", roomId), { status: 'finished', finishedAt: serverTimestamp(), result: { winner: score.winner, reason: '双方弃权', blackScore: score.blackScore, whiteScore: score.whiteScore, diff: score.diff, details: score.details } });
    } else {
      updateDoc(doc(db, "games", roomId), { currentTurn: playerColor === 'black' ? 'white' : 'black', lastActivityAt: serverTimestamp() });
    }
  };

  const handleResign = () => {
    if (!isPlayer || !game || isFinished || !user) return;
    updateDoc(doc(db, "games", roomId), { status: 'finished', finishedAt: serverTimestamp(), result: { winner: user.uid === game.playerBlackId ? 'white' : 'black', reason: '对手认输', diff: 0 } });
    setShowResignConfirm(false);
  };

  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  if (loadingGame || loadingUser) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold font-headline text-blue-500">云端对弈</h1>
        <div className="flex gap-2">
          <Badge variant="outline">{game?.boardSize}x{game?.boardSize}</Badge>
          <Badge>{game?.rules === 'chinese' ? '中国规则' : '日韩规则'}</Badge>
        </div>
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
            <div className="absolute inset-0 bg-background/60 flex items-center justify-center p-4 z-50">
              <Card className="w-full max-w-sm border-4 border-blue-500">
                <CardHeader className="text-center bg-blue-500 text-white"><CardTitle>对局报告</CardTitle></CardHeader>
                <CardContent className="p-6 text-center space-y-4">
                  <h2 className="text-2xl font-black">{game.result?.winner === 'black' ? '黑胜' : '白胜'}</h2>
                  <p className="text-xl font-headline">领先 {game.rules === 'chinese' ? (game.result?.diff * 2).toFixed(1) : game.result?.diff.toFixed(1)} 点</p>
                  <p className="text-xs text-muted-foreground">原因: {game.result?.reason}</p>
                </CardContent>
                <CardFooter className="flex gap-2"><Button variant="outline" className="flex-1" onClick={() => router.push('/')}>回主页</Button><Button className="flex-1" onClick={() => setDismissGameOver(true)}>复盘</Button></CardFooter>
              </Card>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <Card className="border-2"><CardContent className="p-4 space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-black" /><span>{game?.playerBlackName}</span></div>
              <span className="font-mono text-xs">{formatDuration(timeUsed.black)}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-white border" /><span>{game?.playerWhiteName}</span></div>
              <span className="font-mono text-xs">{formatDuration(timeUsed.white)}</span>
            </div>
          </CardContent></Card>
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
