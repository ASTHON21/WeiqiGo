
"use client";

import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { GoBoard } from '@/components/game/GoBoard';
import { ToolPanel } from '@/components/game/ToolPanel';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Swords, Loader2, Book, Radio, Calculator, Lock, Wifi, WifiOff, Save } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
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

  // 关键修复：确保 user 已就绪后再发起文档读取
  const { data: game, isLoading: loadingGame } = useDoc(roomId && user ? doc(db, "games", roomId) : null);

  // 关键修复：movesQuery 同样需要守卫
  const movesQuery = useMemoFirebase(() => {
    if (!db || !roomId || !user) return null;
    return query(collection(db, `games/${roomId}/moves`), orderBy("moveNumber", "asc"));
  }, [db, roomId, user]);
  const { data: firestoreMoves } = useCollection(movesQuery);

  // 合并 Firestore 和 P2P 步数
  const moves = [...(firestoreMoves || []), ...localMoves].sort((a, b) => (a.moveNumber || 0) - (b.moveNumber || 0));

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

  const board = (() => {
    if (!game) return createEmptyBoard(19);
    let tempBoard = createEmptyBoard(game.boardSize || 19);
    if (!moves) return tempBoard;
    
    moves.forEach(m => {
      if (m.coordinatesX !== -1) {
        const result = GoLogic.processMove(tempBoard, m.coordinatesX, m.coordinatesY, m.playerColor, []);
        if (result.success) tempBoard = result.newBoard;
      }
    });
    return tempBoard;
  })();

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
      updateDoc(doc(db, "games", roomId), {
        status: 'finished',
        finishedAt: serverTimestamp(),
        moveCount: (game.moveCount || 0) + 1
      }).catch(async (err) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `games/${roomId}`,
            operation: 'update',
            requestResourceData: { status: 'finished' }
          }));
        });

      toast({
        title: "对局结束",
        description: "双方连续弃权，对局已完成。",
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
        winner: null,
        reason: '双方连续弃权',
        details: null
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
         <h1 className="text-2xl font-bold flex items-center gap-2 text-blue-500">
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
               <div className="absolute inset-0 z-50 bg-background/40 backdrop-blur-[1px] flex items-center justify-center rounded-lg">
                  <Card className="max-w-md w-full border-4 border-blue-500 shadow-2xl overflow-hidden">
                    <CardHeader className="bg-blue-500 text-white py-4">
                      <CardTitle className="flex items-center justify-center gap-2 text-xl">
                        <Calculator className="h-6 w-6" /> 对局已结束
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 text-center space-y-4">
                       <h2 className="text-2xl font-black">对局圆满结束</h2>
                       <p className="text-sm text-muted-foreground leading-relaxed">
                         双方棋手已达成共识（连续弃权）。<br/>您可以选择保存记录或留在页面继续查看棋局。
                       </p>
                    </CardContent>
                    <CardFooter className="flex flex-col sm:flex-row gap-3 bg-muted/30 p-4">
                       <Button variant="outline" className="flex-1 h-12 font-bold" onClick={() => setDismissGameOver(true)}>
                         留在房内观摩
                       </Button>
                       <Button variant="secondary" className="flex-1 h-12 font-bold gap-2" onClick={saveToLocalHistory} disabled={isSaved}>
                         <Save className="h-4 w-4" /> {isSaved ? '已保存' : '保存本局记录'}
                       </Button>
                       <Button className="flex-1 h-12 font-bold bg-blue-600 hover:bg-blue-700" onClick={() => router.push('/game/online/lobby')}>
                         返回大厅
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
            <div className="p-4 bg-muted/50 rounded-lg border-2 text-center">
              <p className="text-xs text-muted-foreground uppercase font-bold mb-1">当前回合</p>
              <div className="text-lg font-black flex items-center justify-center gap-2">
                <div className={cn("w-3 h-3 rounded-full border", game?.currentTurn === 'black' ? 'bg-black' : 'bg-white')} />
                {game?.currentTurn === 'black' ? '黑方落子' : '白方落子'}
              </div>
            </div>
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
            <SheetContent side="right" className="w-full md:max-w-[90vw] lg:max-w-[1200px]">
              <SheetHeader>
                <SheetTitle>{game?.rules === 'chinese' ? '中国围棋竞赛规则' : '日韩规则目数计算法'}</SheetTitle>
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
