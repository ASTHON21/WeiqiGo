
"use client";

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { GoBoard } from '@/components/game/GoBoard';
import { ToolPanel } from '@/components/game/ToolPanel';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Swords, Loader2, Book, Radio, Calculator, Lock, Wifi, WifiOff, Save, Home, RefreshCw } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useEffect, useState, useMemo } from 'react';
import { getRulesContent } from '@/app/actions/sgf';
import { useDoc, useFirestore, useUser, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, orderBy, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { createEmptyBoard, GoLogic } from '@/lib/go-logic';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { MoveSetting, GameHistoryEntry, Player } from '@/lib/types';
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
  
  // P2P 状态
  const [peer, setPeer] = useState<Peer | null>(null);
  const [myPeerId, setMyPeerId] = useState<string | null>(null);
  const [connection, setConnection] = useState<any>(null);
  const [p2pStatus, setP2PStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [localMoves, setLocalMoves] = useState<any[]>([]);

  const { data: game, isLoading: loadingGame } = useDoc(roomId && user ? doc(db, "games", roomId) : null);

  const movesQuery = useMemoFirebase(() => {
    if (!db || !roomId || !user) return null;
    return query(collection(db, `games/${roomId}/moves`), orderBy("moveNumber", "asc"));
  }, [db, roomId, user]);
  const { data: firestoreMoves } = useCollection(movesQuery);

  const moves = useMemo(() => {
    return [...(firestoreMoves || []), ...localMoves].sort((a, b) => (a.moveNumber || 0) - (b.moveNumber || 0));
  }, [firestoreMoves, localMoves]);

  // 初始化 WebRTC (P2P)
  useEffect(() => {
    if (typeof window === 'undefined' || !roomId || !user || isSpectating) return;

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
          setConnection(conn);
          setP2PStatus('connected');
        });
        conn.on('close', () => setP2PStatus('disconnected'));
      });
    });

    return () => {
      peerInstance?.destroy();
    };
  }, [roomId, user, isSpectating]);

  // 同步 Peer ID 到 Firestore
  useEffect(() => {
    if (!myPeerId || !game || !user || !db || isSpectating) return;
    
    const field = user.uid === game.playerBlackId ? 'playerBlackPeerId' : 'playerWhitePeerId';
    if (game[field] === myPeerId) return;

    updateDoc(doc(db, "games", roomId), { [field]: myPeerId })
      .catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: `games/${roomId}`,
          operation: 'update',
          requestResourceData: { [field]: myPeerId }
        }));
      });
  }, [myPeerId, game, user, db, isSpectating, roomId]);

  // 主动连接对手
  useEffect(() => {
    if (!peer || !game || connection || isSpectating || !user) return;

    const myRole = user.uid === game.playerBlackId ? 'black' : 'white';
    const opponentPeerId = myRole === 'black' ? game.playerWhitePeerId : game.playerBlackPeerId;

    if (opponentPeerId) {
      const conn = peer.connect(opponentPeerId);
      conn.on('open', () => {
        setConnection(conn);
        setP2PStatus('connected');
      });
      conn.on('data', (data: any) => {
        if (data.type === 'move') {
          setLocalMoves(prev => [...prev, data.payload]);
        }
      });
      conn.on('close', () => setP2PStatus('disconnected'));
    }
  }, [peer, game, connection, isSpectating, user]);

  useEffect(() => {
    if (game?.rules) {
      getRulesContent(game.rules as 'chinese' | 'territory', language).then(setRules);
    } else {
      getRulesContent('chinese', language).then(setRules);
    }
  }, [game?.rules, language]);

  // 计算棋盘与提子
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

  const isPlayer = user && (user.uid === game?.playerWhiteId || user.uid === game?.playerBlackId);
  const isMyTurn = game && user && (
    (game.currentTurn === 'black' && user.uid === game.playerBlackId) ||
    (game.currentTurn === 'white' && user.uid === game.playerWhiteId)
  );
  const canMove = !isSpectating && isPlayer && game?.status !== 'finished' && isMyTurn;
  const isFinished = game?.status === 'finished';

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

    const moveData = {
      gameId: roomId,
      playerColor,
      coordinatesX: r,
      coordinatesY: c,
      moveNumber: (moves?.length || 0) + 1,
      timestamp: Date.now(),
      evaluation: 0.5,
    };

    if (connection && p2pStatus === 'connected') {
      connection.send({ type: 'move', payload: moveData });
      setLocalMoves(prev => [...prev, moveData]);
    } else {
      addDoc(collection(db, `games/${roomId}/moves`), moveData)
        .catch(async (err) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `games/${roomId}/moves`,
            operation: 'create',
            requestResourceData: moveData
          }));
        });
    }

    const nextTurn = playerColor === 'black' ? 'white' : 'black';
    const updatePayload = {
      currentTurn: nextTurn,
      status: 'in-progress',
      moveCount: (game.moveCount || 0) + 1
    };
    
    updateDoc(doc(db, "games", roomId), updatePayload)
      .catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: `games/${roomId}`,
          operation: 'update',
          requestResourceData: updatePayload
        }));
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

    if (connection && p2pStatus === 'connected') {
      connection.send({ type: 'move', payload: moveData });
      setLocalMoves(prev => [...prev, moveData]);
    } else {
      addDoc(collection(db, `games/${roomId}/moves`), moveData)
        .catch(async (err) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `games/${roomId}/moves`,
            operation: 'create',
            requestResourceData: moveData
          }));
        });
    }

    if (isConsecutivePass) {
      const ruleType = game.rules as 'chinese' | 'territory';
      const score = ruleType === 'chinese' 
        ? GoLogic.calculateChineseScore(board)
        : GoLogic.calculateJapaneseScore(board, prisoners.black, prisoners.white);

      updateDoc(doc(db, "games", roomId), {
        status: 'finished',
        finishedAt: serverTimestamp(),
        moveCount: (game.moveCount || 0) + 1,
        result: {
          winner: score.winner,
          reason: '双方连续弃权',
          blackScore: score.blackTotal,
          whiteScore: score.whiteTotal,
          details: (score as any).details || null,
          komi: score.komi
        }
      }).catch(async (err) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `games/${roomId}`,
            operation: 'update',
            requestResourceData: { status: 'finished' }
          }));
        });

      toast({
        title: "对局结束",
        description: "双方连续弃权，对局已完成并结算。",
      });
    } else {
      const nextTurn = playerColor === 'black' ? 'white' : 'black';
      updateDoc(doc(db, "games", roomId), {
        currentTurn: nextTurn,
        moveCount: (game.moveCount || 0) + 1
      }).catch(async (err) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `games/${roomId}`,
            operation: 'update',
            requestResourceData: { currentTurn: nextTurn }
          }));
        });
    }
  };

  const saveToLocalHistory = () => {
    if (!game || !moves || isSaved) return;

    const ruleType = game.rules as 'chinese' | 'territory';
    const score = game.result?.blackScore !== undefined ? game.result : (
      ruleType === 'chinese' 
        ? GoLogic.calculateChineseScore(board) 
        : GoLogic.calculateJapaneseScore(board, prisoners.black, prisoners.white)
    );

    const entry: GameHistoryEntry = {
      id: `online-${roomId}-${Date.now()}`,
      date: new Date().toISOString(),
      mode: 'online',
      boardSize: game.boardSize || 19,
      moveHistory: moves.map(m => ({
        r: m.coordinatesX,
        c: m.coordinatesY,
        player: m.playerColor
      })),
      result: {
        winner: score.winner as any,
        reason: game.result?.reason || '双方连续弃权',
        blackScore: (score as any).blackTotal || (score as any).blackScore,
        whiteScore: (score as any).whiteTotal || (score as any).whiteScore,
        details: (score as any).details || null,
        komi: (score as any).komi
      },
      metadata: {
        event: "在线对局",
        blackName: game.playerBlackName,
        whiteName: game.playerWhiteName,
        komi: game.komi?.toString(),
        rules: game.rules === 'chinese' ? '中国规则' : '日韩规则'
      }
    };

    try {
      const existing = JSON.parse(localStorage.getItem('goMasterHistory') || '[]');
      localStorage.setItem('goMasterHistory', JSON.stringify([entry, ...existing]));
      setIsSaved(true);
      toast({
        title: "保存成功",
        description: "本局记录已存入本地历史记录。",
      });
    } catch (e) {
      toast({
        title: "保存失败",
        variant: "destructive"
      });
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
         <h1 className="text-2xl font-bold flex items-center gap-2 text-blue-500 font-headline">
           {isSpectating ? <Radio className="h-6 w-6 animate-pulse" /> : <Swords className="h-6 w-6" />}
           {isSpectating ? "正在观战" : "在线对局"}
           {isFinished && <Badge variant="destructive" className="gap-1"><Lock className="h-3 w-3" /> 对局已结束</Badge>}
         </h1>
         <div className="flex flex-wrap items-center gap-3">
           {!isSpectating && (
             <Badge variant={p2pStatus === 'connected' ? 'default' : 'outline'} className={cn("gap-1.5 h-7", p2pStatus === 'connected' ? "bg-green-600" : "text-yellow-600")}>
               {p2pStatus === 'connected' ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
               {p2pStatus === 'connected' ? 'P2P 已加密连接' : 'P2P 握手中...'}
             </Badge>
           )}
           <Badge variant="outline">{game?.boardSize}x{game?.boardSize}</Badge>
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
            
            {game?.status === 'pending' && !isSpectating && (
               <div className="absolute inset-0 z-50 bg-background/60 backdrop-blur-[2px] flex items-center justify-center rounded-lg border-4 border-dashed border-muted">
                  <div className="text-center space-y-4">
                     <Loader2 className="h-10 w-10 animate-spin text-blue-500 mx-auto" />
                     <p className="text-muted-foreground font-bold">等待对手进入房间...</p>
                  </div>
               </div>
            )}
            
            {isFinished && !dismissGameOver && (
               <div className="absolute inset-0 z-50 bg-background/40 backdrop-blur-[1px] flex items-center justify-center rounded-lg p-4 overflow-y-auto">
                  <Card className="max-w-md w-full border-4 border-blue-500 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                    <CardHeader className="bg-blue-600 text-white py-5 text-center">
                      <CardTitle className="flex items-center justify-center gap-2 text-xl font-headline uppercase tracking-tight">
                        <Calculator className="h-6 w-6" /> 对局结算报告
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-8 text-center space-y-6 bg-background">
                       <h2 className="text-3xl font-black font-headline text-foreground leading-none">对局圆满结束</h2>
                       
                       <div className="grid grid-cols-2 gap-4">
                         <div className="p-4 rounded-xl bg-black/5 border-2 border-primary/10 text-center space-y-1">
                           <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">黑方点数</p>
                           <p className="text-3xl font-black text-foreground font-headline leading-none">{game.result?.blackScore?.toFixed(1) || '0.0'}</p>
                         </div>
                         <div className="p-4 rounded-xl bg-black/5 border-2 border-primary/10 text-center space-y-1">
                           <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">白方点数</p>
                           <p className="text-3xl font-black text-foreground font-headline leading-none">{game.result?.whiteScore?.toFixed(1) || '0.0'}</p>
                         </div>
                       </div>

                       {game.result?.details && (
                         <div className="bg-muted/40 p-5 rounded-xl space-y-2 border text-left shadow-inner">
                            <p className="text-[11px] font-black border-b pb-2 flex items-center gap-2 text-foreground uppercase tracking-wider">
                              <Book className="h-3.5 w-3.5 text-blue-500" /> 计分细节 Breakdown
                            </p>
                            <div className="grid grid-cols-1 gap-y-1.5 text-[12px] font-medium text-muted-foreground">
                              <div className="flex justify-between items-center">
                                <span>黑方围空:</span> 
                                <span className="text-foreground font-bold">{game.result.details.blackTerritory} 目</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span>白方围空:</span> 
                                <span className="text-foreground font-bold">{game.result.details.whiteTerritory} 目</span>
                              </div>
                              <div className="flex justify-between items-center text-red-600/80">
                                <span>黑方损子:</span> 
                                <span className="font-bold">-{game.result.details.blackPrisoners + game.result.details.blackDeadOnBoard} 子</span>
                              </div>
                              <div className="flex justify-between items-center text-red-600/80">
                                <span>白方损子:</span> 
                                <span className="font-bold">-{game.result.details.whitePrisoners + game.result.details.whiteDeadOnBoard} 子</span>
                              </div>
                            </div>
                         </div>
                       )}

                       <div className="p-6 bg-blue-500/10 rounded-2xl border-4 border-blue-500/20 space-y-2">
                          <p className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em]">
                            最终判定 (Komi: {game.result?.komi})
                          </p>
                          <p className="text-4xl font-black font-headline text-blue-800">
                            {game.result?.winner === 'black' ? '黑方胜' : '白方胜'} {Math.abs((game.result?.blackScore || 0) - (game.result?.whiteScore || 0)).toFixed(1)} 目
                          </p>
                       </div>
                    </CardContent>
                    <CardFooter className="flex flex-col gap-3 bg-muted/30 p-6 border-t">
                       <div className="grid grid-cols-2 w-full gap-3">
                         <Button variant="ghost" className="h-12 font-bold gap-2 border-2 bg-background hover:bg-muted" onClick={() => router.push('/')}>
                           <Home className="h-4 w-4" /> 返回主页
                         </Button>
                         <Button variant="outline" className="h-12 font-bold border-2 bg-background" onClick={() => setDismissGameOver(true)}>
                           留在房内复盘
                         </Button>
                       </div>
                       <div className="grid grid-cols-2 w-full gap-3">
                         <Button variant="secondary" className="h-12 font-bold gap-2 border-2 border-blue-600/20" onClick={saveToLocalHistory} disabled={isSaved}>
                           <Save className="h-4 w-4" /> {isSaved ? '已保存' : '保存本地记录'}
                         </Button>
                         <Button className="h-12 font-bold bg-blue-600 hover:bg-blue-700 shadow-lg" onClick={() => router.push('/game/online/lobby')}>
                           返回竞技大厅
                         </Button>
                       </div>
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

          {!isFinished && (
            <div className="p-4 bg-muted/50 rounded-lg border-2 text-center border-blue-500/20 shadow-inner">
              <p className="text-[10px] text-muted-foreground uppercase font-bold mb-1 tracking-wider">当前落子方</p>
              <div className="text-lg font-black flex items-center justify-center gap-2 font-headline">
                <div className={cn("w-3 h-3 rounded-full border shadow-sm", game?.currentTurn === 'black' ? 'bg-black' : 'bg-white')} />
                {game?.currentTurn === 'black' ? '黑方回合' : '白方回合'}
              </div>
            </div>
          )}

          <Sheet>
            <SheetTrigger asChild>
              <Card className="border-2 cursor-pointer hover:bg-muted/50 transition-colors group">
                <CardContent className="p-4 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <Book className="h-4 w-4 text-accent group-hover:scale-110 transition-transform" />
                      <span className="text-sm font-bold">查阅竞赛规则</span>
                   </div>
                   <Badge variant="outline" className="text-[10px]">Rulebook</Badge>
                </CardContent>
              </Card>
            </SheetTrigger>
            <SheetContent side="right" className="w-full md:max-w-[90vw] lg:max-w-[1200px]">
              <SheetHeader>
                <SheetTitle className="font-headline">{game?.rules === 'chinese' ? '中国围棋竞赛规则' : '日韩规则目数计算法'}</SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-100px)] mt-4 pr-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                   <pre className="whitespace-pre-wrap font-sans text-sm p-4 md:p-8 bg-muted/30 rounded-lg border leading-relaxed break-words">{rules}</pre>
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>

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
