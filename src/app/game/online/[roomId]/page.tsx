
"use client";

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { GoBoard } from '@/components/game/GoBoard';
import { ToolPanel } from '@/components/game/ToolPanel';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Swords, Loader2, Radio, Calculator, Lock, Wifi, WifiOff, Save, Home, Hourglass, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEffect, useState, useMemo, useRef } from 'react';
import { getRulesContent } from '@/app/actions/sgf';
import { useDoc, useFirestore, useUser, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { createEmptyBoard, GoLogic } from '@/lib/go-logic';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { MoveSetting, Player } from '@/lib/types';
import { useLanguage } from '@/context/language-context';
import type Peer from 'peerjs';

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
  const [isSaved, setIsSaved] = useState(false);
  
  // P2P State
  const [peer, setPeer] = useState<Peer | null>(null);
  const [myPeerId, setMyPeerId] = useState<string | null>(null);
  const connectionRef = useRef<any>(null);
  const [p2pStatus, setP2PStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [localMoves, setLocalMoves] = useState<any[]>([]);

  // Time tracking
  const [timeUsed, setTimeUsed] = useState({ black: 0, white: 0 });

  // Get main game document
  const { data: game, isLoading: loadingGame } = useDoc(roomId && user ? doc(db, "games", roomId) : null);

  // Status flags
  const isFinished = game?.status === 'finished';
  const isPending = game?.status === 'pending';
  const isInProgress = game?.status === 'in-progress';
  const isPlayer = user && (user.uid === game?.playerWhiteId || user.uid === game?.playerBlackId);

  // Sync initial time from game doc
  useEffect(() => {
    if (game) {
      setTimeUsed({
        black: game.playerBlackTimeUsed || 0,
        white: game.playerWhiteTimeUsed || 0
      });
    }
  }, [game?.id]);

  // Timer logic
  useEffect(() => {
    if (isInProgress && !isFinished && !isPending && !isSpectating && isPlayer) {
      const interval = setInterval(() => {
        setTimeUsed(prev => ({
          ...prev,
          [game.currentTurn]: prev[game.currentTurn as 'black' | 'white'] + 1
        }));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isInProgress, isFinished, isPending, isSpectating, isPlayer, game?.currentTurn]);

  // Firestore moves listener
  const movesQuery = useMemoFirebase(() => {
    if (!db || !roomId || !user) return null;
    return query(collection(db, `games/${roomId}/moves`), orderBy("moveNumber", "asc"));
  }, [db, roomId, user]);
  const { data: firestoreMoves } = useCollection(movesQuery);

  // Merge P2P moves with Firestore backup
  const moves = useMemo(() => {
    const combined = [...(firestoreMoves || [])];
    localMoves.forEach(lm => {
      if (!combined.find(cm => cm.moveNumber === lm.moveNumber)) {
        combined.push(lm);
      }
    });
    return combined.sort((a, b) => (a.moveNumber || 0) - (b.moveNumber || 0));
  }, [firestoreMoves, localMoves]);

  // Initialize WebRTC Peer
  useEffect(() => {
    if (typeof window === 'undefined' || !roomId || !user || isSpectating || !isPlayer) return;

    let peerInstance: Peer;
    import('peerjs').then(({ default: Peer }) => {
      peerInstance = new Peer();
      setPeer(peerInstance);

      peerInstance.on('open', (id) => {
        setMyPeerId(id);
      });

      peerInstance.on('connection', (conn) => {
        conn.on('data', (data: any) => {
          if (data.type === 'move') {
            setLocalMoves(prev => [...prev, data.payload]);
          }
        });
        conn.on('open', () => {
          connectionRef.current = conn;
          setP2PStatus('connected');
        });
        conn.on('close', () => setP2PStatus('disconnected'));
      });
    });

    return () => {
      peerInstance?.destroy();
      connectionRef.current?.close();
    };
  }, [roomId, user?.uid, isSpectating, isPlayer]);

  // Sync Peer ID to Firestore
  useEffect(() => {
    if (!myPeerId || !game || !user || !db || isSpectating) return;
    
    const field = user.uid === game.playerBlackId ? 'playerBlackPeerId' : 'playerWhitePeerId';
    if (game[field] === myPeerId) return;

    updateDoc(doc(db, "games", roomId), { 
      [field]: myPeerId, 
      lastActivityAt: serverTimestamp() 
    }).catch(console.error);
  }, [myPeerId, game?.playerBlackId, game?.playerWhiteId, user?.uid, db, isSpectating, roomId]);

  // Active Handshake
  useEffect(() => {
    if (!peer || !isInProgress || connectionRef.current || isSpectating || !user || !myPeerId) return;

    const myRole = user.uid === game.playerBlackId ? 'black' : 'white';
    const opponentPeerId = myRole === 'black' ? game.playerWhitePeerId : game.playerBlackPeerId;

    if (opponentPeerId && opponentPeerId !== myPeerId) {
      setP2PStatus('connecting');
      const conn = peer.connect(opponentPeerId);
      conn.on('open', () => {
        connectionRef.current = conn;
        setP2PStatus('connected');
      });
      conn.on('data', (data: any) => {
        if (data.type === 'move') {
          setLocalMoves(prev => [...prev, data.payload]);
        }
      });
      conn.on('close', () => setP2PStatus('disconnected'));
      conn.on('error', () => setP2PStatus('disconnected'));
    }
  }, [peer, isInProgress, game?.playerWhitePeerId, game?.playerBlackPeerId, isSpectating, user?.uid, myPeerId]);

  // Load Rules
  useEffect(() => {
    if (game?.rules) {
      getRulesContent(game.rules as 'chinese' | 'territory', language).then(setRules);
    }
  }, [game?.rules, language]);

  // Logic: Calculate Board
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
             p[color] += result.capturedCount;
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

    // P2P Emit
    if (connectionRef.current && p2pStatus === 'connected') {
      connectionRef.current.send({ type: 'move', payload: moveData });
      setLocalMoves(prev => [...prev, moveData]);
    } 
    
    // Firestore Backup
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

    if (connectionRef.current && p2pStatus === 'connected') {
      connectionRef.current.send({ type: 'move', payload: moveData });
      setLocalMoves(prev => [...prev, moveData]);
    }
    
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
          details: (score as any).details || null,
          komi: score.komi
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
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loadingGame || loadingUser) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto" />
          <p className="text-muted-foreground font-bold">建立对局同步连接...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
         <h1 className="text-2xl font-bold flex items-center gap-2 text-blue-500 font-headline">
           {isSpectating ? <Radio className="h-6 w-6 animate-pulse" /> : <Swords className="h-6 w-6" />}
           {isSpectating ? "观摩名局" : "在线连线对弈"}
           {isFinished && <Badge variant="destructive" className="gap-1"><Lock className="h-3 w-3" /> 对局结算完毕</Badge>}
           {isPending && <Badge variant="outline" className="text-yellow-600 border-yellow-500 animate-pulse">等待对手确认</Badge>}
         </h1>
         <div className="flex flex-wrap items-center gap-3">
           {!isSpectating && !isFinished && !isPending && (
             <Badge variant={p2pStatus === 'connected' ? 'default' : 'outline'} className={cn("gap-1.5 h-7", p2pStatus === 'connected' ? "bg-green-600" : "text-yellow-600 animate-pulse")}>
               {p2pStatus === 'connected' ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
               {p2pStatus === 'connected' ? 'P2P 加密直连' : '寻找 P2P 隧道...'}
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
            
            {isPending && !isSpectating && (
               <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-[2px] flex items-center justify-center rounded-lg border-4 border-dashed border-muted">
                  <div className="text-center space-y-6 max-w-xs p-8">
                     <div className="mx-auto w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center">
                        <Hourglass className="h-10 w-10 text-yellow-600 animate-spin-slow" />
                     </div>
                     <div className="space-y-2">
                        <h3 className="text-2xl font-black font-headline text-foreground">等待对手应战</h3>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          您的挑战已发出。只有在对方点击“接受”并开启房间后，对局同步通道才会激活。
                        </p>
                     </div>
                     <Button variant="outline" className="w-full border-2" onClick={() => router.push('/game/online/lobby')}>取消挑战并返回大厅</Button>
                  </div>
               </div>
            )}

            {isInProgress && p2pStatus !== 'connected' && !isSpectating && moves.length === 0 && (
               <div className="absolute inset-0 z-50 bg-background/80 backdrop-blur-[2px] flex items-center justify-center rounded-lg border-4 border-dashed border-muted">
                  <div className="text-center space-y-4">
                     <Loader2 className="h-12 w-12 animate-spin text-blue-500 mx-auto" />
                     <p className="text-lg font-black font-headline text-foreground">挑战已接受，建立 P2P 隧道...</p>
                     <p className="text-xs text-muted-foreground">正在同步棋盘状态与加密信令</p>
                  </div>
               </div>
            )}
            
            {isFinished && !dismissGameOver && (
               <div className="absolute inset-0 z-50 bg-background/40 backdrop-blur-[1px] flex items-center justify-center rounded-lg p-4 overflow-y-auto">
                  <Card className="max-w-md w-full border-4 border-blue-500 shadow-2xl animate-in zoom-in-95 duration-200">
                    <CardHeader className="bg-blue-600 text-white py-5 text-center">
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

                       <div className="p-6 bg-blue-500/10 rounded-2xl border-4 border-blue-500/20 space-y-2">
                          <p className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em]">最终判定 (总手数: {game.moveCount})</p>
                          <p className="text-4xl font-black font-headline text-blue-800">
                            {game.result?.winner === 'black' ? '黑方胜' : '白方胜'} {Math.abs((game.result?.blackScore || 0) - (game.result?.whiteScore || 0)).toFixed(1)} 目
                          </p>
                       </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-3 bg-muted/30 p-6 border-t">
                       <div className="grid grid-cols-2 w-full gap-3">
                         <Button variant="ghost" className="h-12 font-bold gap-2 border-2 bg-background" onClick={() => router.push('/')}>
                           <Home className="h-4 w-4" /> 返回主页
                         </Button>
                         <Button variant="outline" className="h-12 font-bold border-2 bg-background" onClick={() => setDismissGameOver(true)}>
                           留房复盘
                         </Button>
                       </div>
                       <Button className="w-full h-12 font-bold bg-blue-600 hover:bg-blue-700 shadow-lg" onClick={() => setIsSaved(true)} disabled={isSaved}>
                         <Save className="h-4 w-4" /> {isSaved ? '已保存本地记录' : '保存本地记录'}
                       </Button>
                    </CardFooter>
                  </Card>
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
                   <div className="flex flex-col">
                    <span className="text-sm font-bold truncate max-w-[120px]">{game?.playerBlackName || '黑方选手'}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{formatDuration(timeUsed.black)}</span>
                   </div>
                 </div>
                 {game?.playerBlackId === user?.uid && <Badge variant="secondary">您</Badge>}
              </div>
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                   <div className="w-8 h-8 rounded-full bg-white border-2 border-black shadow-sm" />
                   <div className="flex flex-col">
                    <span className="text-sm font-bold truncate max-w-[120px]">{game?.playerWhiteName || '白方选手'}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">{formatDuration(timeUsed.white)}</span>
                   </div>
                 </div>
                 {game?.playerWhiteId === user?.uid && <Badge variant="secondary">您</Badge>}
              </div>
            </CardContent>
          </Card>

          {!isFinished && isInProgress && (
            <div className="p-4 bg-muted/50 rounded-lg border-2 text-center border-blue-500/20 shadow-inner">
              <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1 tracking-wider">落子状态</p>
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
