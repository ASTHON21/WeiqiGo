"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import { collection, query, where, addDoc, serverTimestamp, doc, updateDoc, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Swords, Users, PlayCircle, Loader2, UserPlus, Settings2, Ban, BellRing, User, Wifi, WifiOff, Clock, Layers } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

function LiveGameTimer({ startedAt }: { startedAt: any }) {
  const [duration, setDuration] = useState("00:00");

  useEffect(() => {
    if (!startedAt) return;
    const start = startedAt.toDate ? startedAt.toDate() : new Date(startedAt);
    
    const update = () => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
      if (diff < 0) return;
      
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      
      if (h > 0) {
        setDuration(`${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      } else {
        setDuration(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
      }
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  return <span className="font-mono">{duration}</span>;
}

export default function OnlineLobbyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const acceptInvites = searchParams.get('acceptInvites') !== 'false';
  const { user, loading: loadingUser } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [invitingPlayer, setInvitingPlayer] = useState<{ id: string, name: string } | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>("19");
  const [selectedRule, setSelectedRule] = useState<string>("chinese");
  const [opponentColor, setOpponentColor] = useState<'black' | 'white'>('white');
  const [receivedInvite, setReceivedInvite] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  // 定时发送心跳，标记玩家在线
  useEffect(() => {
    if (!user || !db) return;

    const updateStatus = async () => {
      const userRef = doc(db, "userProfiles", user.uid);
      updateDoc(userRef, {
        lastSeen: serverTimestamp(),
        acceptingInvites: acceptInvites
      }).then(() => setIsConnected(true))
        .catch(async (err) => {
          setIsConnected(false);
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `userProfiles/${user.uid}`,
            operation: 'update',
            requestResourceData: { lastSeen: 'serverTimestamp', acceptingInvites: acceptInvites }
          }));
        });
    };

    updateStatus();
    const heartbeat = setInterval(updateStatus, 30000); // 30秒心跳
    return () => clearInterval(heartbeat);
  }, [user, db, acceptInvites]);

  // 监听活跃棋手 (5分钟内有活跃心跳)
  const usersQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "userProfiles"), orderBy("lastSeen", "desc"), limit(50));
  }, [db, user]);
  
  const { data: allProfiles, isLoading: loadingPlayers } = useCollection(usersQuery);

  const activePlayers = allProfiles?.filter(p => {
    if (p.id === user?.uid) return false;
    if (!p.lastSeen) return false;
    const lastSeenDate = p.lastSeen.toDate ? p.lastSeen.toDate() : new Date(p.lastSeen);
    const threshold = new Date(Date.now() - 5 * 60000); // 5分钟有效期
    return lastSeenDate > threshold;
  }) || [];

  // 监听实时对局 (过滤掉超过24小时的僵尸对局)
  const liveGamesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    const yesterday = new Date(Date.now() - 24 * 60 * 60000);
    return query(
      collection(db, "games"), 
      where("status", "==", "in-progress"),
      where("startedAt", ">", yesterday)
    );
  }, [db, user]);
  
  const { data: liveGames, isLoading: loadingGames } = useCollection(liveGamesQuery);

  // 监听受到的邀请
  useEffect(() => {
    if (!db || !user) return;
    const q = query(collection(db, "games"), where("status", "==", "pending"));
    
    const unsub = onSnapshot(q, (snapshot) => {
      const activeInvite = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .find(g => (g.playerBlackId === user.uid || g.playerWhiteId === user.uid) && g.createdBy !== user.uid);
      
      if (activeInvite && (!receivedInvite || activeInvite.id !== receivedInvite.id)) {
        setReceivedInvite(activeInvite);
      }
    }, (err) => {
      console.error("Invite Listener Error:", err);
    });

    return () => unsub();
  }, [db, user, receivedInvite]);

  const handleInviteClick = (id: string, name: string, isAccepting: boolean) => {
    if (!isAccepting) {
      toast({
        variant: "destructive",
        title: "无法邀请",
        description: `${name} 当前不接受邀请。`,
      });
      return;
    }
    setInvitingPlayer({ id, name });
  };

  const confirmInvite = async () => {
    if (!user || !invitingPlayer) return;
    
    const playerBlackId = opponentColor === 'white' ? user.uid : invitingPlayer.id;
    const playerWhiteId = opponentColor === 'white' ? invitingPlayer.id : user.uid;
    const playerBlackName = opponentColor === 'white' ? user.displayName : invitingPlayer.name;
    const playerWhiteName = opponentColor === 'white' ? invitingPlayer.name : user.displayName;

    const newGame = {
      playerBlackId,
      playerWhiteId,
      playerBlackName,
      playerWhiteName,
      status: 'pending',
      boardSize: parseInt(selectedSize),
      rules: selectedRule,
      currentTurn: 'black',
      startedAt: serverTimestamp(),
      komi: selectedRule === 'chinese' ? 3.75 : 6.5,
      handicap: 0,
      createdBy: user.uid,
      challengerName: user.displayName,
      moveCount: 0,
      lastActivityAt: serverTimestamp()
    };

    addDoc(collection(db, "games"), newGame)
      .then((gameRef) => {
        toast({ title: "已发送邀请", description: `等待 ${invitingPlayer.name} 响应...` });
        setInvitingPlayer(null);
        router.push(`/game/online/${gameRef.id}`);
      })
      .catch((err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'games',
          operation: 'create',
          requestResourceData: newGame
        }));
      });
  };

  const handleAcceptInvite = async () => {
    if (!receivedInvite || !db) return;
    updateDoc(doc(db, "games", receivedInvite.id), {
      status: 'in-progress',
      startedAt: serverTimestamp(),
      lastActivityAt: serverTimestamp(),
      moveCount: 0
    }).then(() => {
      router.push(`/game/online/${receivedInvite.id}`);
    }).catch((err) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: `games/${receivedInvite.id}`,
        operation: 'update',
        requestResourceData: { status: 'in-progress' }
      }));
    });
  };

  const handleDeclineInvite = async () => {
    if (!receivedInvite || !db) return;
    updateDoc(doc(db, "games", receivedInvite.id), {
      status: 'finished',
      reason: 'declined',
      finishedAt: serverTimestamp()
    }).then(() => {
      setReceivedInvite(null);
    }).catch((err) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: `games/${receivedInvite.id}`,
        operation: 'update',
        requestResourceData: { status: 'finished' }
      }));
    });
  };

  if (loadingUser) {
    return (
      <div className="h-screen flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
        <p className="text-muted-foreground font-medium animate-pulse">正在进入竞技大厅...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold font-headline tracking-tight text-blue-500 flex items-center gap-3">
            <Swords className="h-10 w-10" /> 竞技大厅
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-sm">
             <div className="flex items-center gap-1.5 bg-blue-500/5 px-3 py-1.5 rounded-full border border-blue-500/20 shadow-sm">
                <User className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-muted-foreground">
                  棋手: <span className="font-mono text-foreground font-bold">{user?.displayName}</span>
                </span>
             </div>

             <div className="flex items-center gap-2">
                <Badge variant={acceptInvites ? "outline" : "destructive"} className="h-7 px-3 border-2">
                    {acceptInvites ? "等待对局" : "暂不接受挑战"}
                </Badge>
                <Badge variant="ghost" className={cn("h-7 gap-1.5", isConnected ? "text-green-500" : "text-red-500")}>
                  {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                  {isConnected ? "云端同步正常" : "同步连接中断"}
                </Badge>
             </div>
          </div>
        </div>
        <Button variant="outline" onClick={() => router.push('/')}>返回主页</Button>
      </div>

      <Tabs defaultValue="players" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 h-12 mb-6">
          <TabsTrigger value="players" className="gap-2">
            <Users className="h-4 w-4" /> 活跃棋手 ({activePlayers.length})
          </TabsTrigger>
          <TabsTrigger value="games" className="gap-2">
            <PlayCircle className="h-4 w-4" /> 实时对局 ({liveGames?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="players">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {loadingPlayers ? (
              Array(6).fill(0).map((_, i) => (
                <Card key={i} className="animate-pulse bg-muted/20 border-2 h-24" />
              ))
            ) : activePlayers.length > 0 ? (
              activePlayers.map((player) => {
                const isAccepting = player.acceptingInvites !== false;
                return (
                  <Card key={player.id} className={cn("border-2 transition-all group", isAccepting ? "hover:border-blue-500/50 shadow-sm" : "opacity-60 grayscale-[0.5]")}>
                    <CardContent className="p-6 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 border-2 border-blue-500/30">
                          <AvatarFallback className={cn("text-white font-bold bg-blue-500")}>
                            {player.displayName?.[0] || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-0.5">
                          <h3 className="font-bold text-lg flex items-center gap-2">
                            {player.displayName}
                            {!isAccepting && <Ban className="h-3 w-3 text-red-500" />}
                          </h3>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <span className="text-[10px] text-muted-foreground font-mono">
                              ID: {player.id.substring(0, 8)}...
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button 
                        size="icon" 
                        variant="ghost" 
                        disabled={!isAccepting}
                        className="group-hover:bg-blue-600 group-hover:text-white transition-colors"
                        onClick={() => handleInviteClick(player.id, player.displayName, isAccepting)}
                      >
                        <UserPlus className="h-5 w-5" />
                      </Button>
                    </CardContent>
                  </Card>
                )
              })
            ) : (
              <Card className="col-span-full border-2 border-dashed p-12 text-center bg-muted/5">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                <p className="text-muted-foreground font-medium font-headline">暂无在线棋手</p>
                <p className="text-xs text-muted-foreground mt-2">提示：打开一个无痕窗口访问本项目，即可看到自己。</p>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="games">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {loadingGames ? (
              <div className="col-span-full flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              </div>
            ) : liveGames?.length ? (
              liveGames.map((game) => (
                <Card key={game.id} className="border-2 overflow-hidden flex flex-col group hover:border-blue-500/50 transition-all shadow-sm">
                  <div className="bg-blue-500/10 p-3 border-b flex items-center justify-between">
                    <div className="flex gap-2">
                      <Badge variant="outline" className="bg-background text-[10px] font-mono">{game.boardSize}x{game.boardSize}</Badge>
                      <Badge variant="secondary" className="text-[10px]">{game.rules === 'chinese' ? '中' : '日韩'}</Badge>
                    </div>
                    <div className="flex items-center gap-1.5 text-blue-600 font-bold text-[10px] font-headline uppercase tracking-wider">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                      正在对局
                    </div>
                  </div>
                  <CardContent className="p-6 flex-1 flex flex-col gap-6">
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-center space-y-2 flex-1">
                         <div className="w-10 h-10 rounded-full bg-black mx-auto ring-2 ring-offset-2 ring-black/10 shadow-sm" />
                         <p className="text-xs font-bold truncate">{game.playerBlackName}</p>
                      </div>
                      <div className="text-[10px] font-black text-muted-foreground bg-muted px-2 py-1 rounded italic">VS</div>
                      <div className="text-center space-y-2 flex-1">
                         <div className="w-10 h-10 rounded-full bg-white border mx-auto ring-2 ring-offset-2 ring-black/10 shadow-sm" />
                         <p className="text-xs font-bold truncate">{game.playerWhiteName}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2 border-t border-dashed">
                       <div className="flex items-center gap-2 text-xs text-muted-foreground">
                         <Clock className="h-3 w-3" />
                         <LiveGameTimer startedAt={game.startedAt} />
                       </div>
                       <div className="flex items-center gap-2 text-xs text-muted-foreground justify-end">
                         <Layers className="h-3 w-3" />
                         <span>第 <span className="font-bold text-foreground">{game.moveCount || 0}</span> 手</span>
                       </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-muted/30 p-3 mt-auto">
                    <Button className="w-full gap-2 font-bold group-hover:bg-blue-600 group-hover:text-white transition-all" variant="outline" onClick={() => router.push(`/game/online/${game.id}?mode=spectate`)}>
                      <PlayCircle className="h-4 w-4" /> 实时观战
                    </Button>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <Card className="col-span-full border-2 border-dashed p-12 text-center bg-muted/5">
                <PlayCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                <p className="text-muted-foreground font-medium font-headline">当前暂无公开对局</p>
                <p className="text-xs text-muted-foreground mt-2">发起挑战即可出现在此处。</p>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* 收到挑战弹窗 */}
      <Dialog open={!!receivedInvite} onOpenChange={(open) => !open && handleDeclineInvite()}>
        <DialogContent className="sm:max-w-md border-4 border-blue-600 shadow-2xl animate-in zoom-in-95">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl text-blue-600 font-headline">
              <BellRing className="h-6 w-6 animate-bounce" /> 您有新的挑战！
            </DialogTitle>
            <DialogDescription>收到来自竞技大厅的棋手对局请求。</DialogDescription>
          </DialogHeader>
          
          <div className="py-6 space-y-6">
            <div className="flex items-center gap-4 bg-blue-500/5 p-4 rounded-xl border border-blue-500/20">
               <Avatar className="h-14 w-14 border-2 border-blue-600">
                 <AvatarFallback className="bg-blue-600 text-white text-xl font-bold font-headline">
                   {receivedInvite?.challengerName?.[0]}
                 </AvatarFallback>
               </Avatar>
               <div>
                 <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">Challenger</p>
                 <h3 className="text-xl font-black">{receivedInvite?.challengerName}</h3>
               </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 border rounded-lg text-center bg-background shadow-inner">
                <p className="text-[9px] font-bold text-muted-foreground uppercase">棋盘</p>
                <p className="text-sm font-black">{receivedInvite?.boardSize}x{receivedInvite?.boardSize}</p>
              </div>
              <div className="p-3 border rounded-lg text-center bg-background shadow-inner">
                <p className="text-[9px] font-bold text-muted-foreground uppercase">您执</p>
                <p className="text-sm font-black">{receivedInvite?.playerBlackId === user?.uid ? '黑棋' : '白棋'}</p>
              </div>
              <div className="p-3 border rounded-lg text-center bg-background shadow-inner">
                <p className="text-[9px] font-bold text-muted-foreground uppercase">规则</p>
                <p className="text-sm font-black">{receivedInvite?.rules === 'chinese' ? '中' : '日韩'}</p>
              </div>
            </div>
          </div>

          <DialogFooter className="grid grid-cols-2 gap-4 pt-4 border-t">
            <Button variant="outline" className="h-12 font-bold border-2" onClick={handleDeclineInvite}>婉言谢绝</Button>
            <Button className="h-12 font-bold bg-blue-600 hover:bg-blue-700 shadow-lg" onClick={handleAcceptInvite}>接受挑战</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 对局设置弹窗 */}
      <Dialog open={!!invitingPlayer} onOpenChange={(open) => !open && setInvitingPlayer(null)}>
        <DialogContent className="sm:max-w-md border-2">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-headline text-xl">
              <Settings2 className="h-5 w-5 text-blue-500" /> 发起挑战设置
            </DialogTitle>
            <DialogDescription>
              向 <span className="text-foreground font-bold">{invitingPlayer?.name}</span> 发送对局邀请。
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">棋盘尺寸</Label>
              <Tabs value={selectedSize} onValueChange={setSelectedSize} className="w-full">
                <TabsList className="grid w-full grid-cols-3 h-10">
                  <TabsTrigger value="9">9 x 9</TabsTrigger>
                  <TabsTrigger value="13">13 x 13</TabsTrigger>
                  <TabsTrigger value="19">19 x 19</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">落子规则</Label>
              <Tabs value={selectedRule} onValueChange={setSelectedRule} className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-10">
                  <TabsTrigger value="chinese">中国规则</TabsTrigger>
                  <TabsTrigger value="territory">日韩规则</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">对手执子</Label>
              <RadioGroup value={opponentColor} onValueChange={(val) => setOpponentColor(val as 'black' | 'white')} className="grid grid-cols-2 gap-4">
                <div className={cn("flex items-center gap-2 border-2 p-3 rounded-lg cursor-pointer transition-colors", opponentColor === 'black' && "border-blue-500 bg-blue-500/5")}>
                  <RadioGroupItem value="black" id="opt-black" />
                  <Label htmlFor="opt-black" className="cursor-pointer font-bold">对手执黑</Label>
                </div>
                <div className={cn("flex items-center gap-2 border-2 p-3 rounded-lg cursor-pointer transition-colors", opponentColor === 'white' && "border-blue-500 bg-blue-500/5")}>
                  <RadioGroupItem value="white" id="opt-white" />
                  <Label htmlFor="opt-white" className="cursor-pointer font-bold">对手执白</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t">
            <Button variant="ghost" onClick={() => setInvitingPlayer(null)} className="h-11 px-6">取消</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 font-bold h-11 px-8 shadow-md" onClick={confirmInvite}>
              发送邀请
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
