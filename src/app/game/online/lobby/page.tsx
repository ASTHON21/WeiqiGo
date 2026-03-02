
'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, updateDoc, orderBy, limit, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Swords, Users, PlayCircle, Loader2, UserPlus, Wifi, ShieldCheck, Book, User, CheckCircle2, XCircle, Trophy, Eye, Gamepad2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/context/language-context';
import { cn } from '@/lib/utils';

export default function OnlineLobbyPage() {
  const router = useRouter();
  const { user, loading: loadingUser } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [invitingPlayer, setInvitingPlayer] = useState<{ id: string, name: string } | null>(null);
  const [selectedSize, setSelectedSize] = useState("19");
  const [selectedRule, setSelectedRule] = useState("chinese");
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  // 1. 监听发给自己的待处理邀请
  const inviteQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, "games"),
      where("playerWhiteId", "==", user.uid),
      where("status", "==", "pending"),
      limit(1)
    );
  }, [db, user]);
  const { data: incomingInvites } = useCollection(inviteQuery);

  // 2. 监听所有活跃玩家 (按最后心跳排序)
  const playersQuery = useMemoFirebase(() => db ? query(collection(db, "userProfiles"), orderBy("lastSeen", "desc"), limit(20)) : null, [db]);
  const { data: rawPlayers } = useCollection(playersQuery);

  // 3. 监听所有进行中的对局 (用于判断棋手是否在对局中)
  const activeGamesQuery = useMemoFirebase(() => db ? query(collection(db, "games"), where("status", "==", "in-progress")) : null, [db]);
  const { data: activeGames } = useCollection(activeGamesQuery);

  // 4. 监听完赛名局
  const recentGamesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, "games"), where("status", "==", "finished"), limit(20));
  }, [db]);
  const { data: rawRecentGames } = useCollection(recentGamesQuery);

  // 在内存中过滤掉超过 5 分钟没有心跳的棋手
  const activePlayers = useMemo(() => {
    if (!rawPlayers) return [];
    const now = Date.now();
    const FIVE_MINUTES = 5 * 60 * 1000;
    return rawPlayers.filter(p => {
      if (!p.lastSeen) return false;
      const lastSeenTime = p.lastSeen instanceof Timestamp ? p.lastSeen.toMillis() : new Date(p.lastSeen).getTime();
      return (now - lastSeenTime) < FIVE_MINUTES;
    });
  }, [rawPlayers]);

  // 计算正在对局中的棋手 ID 集合
  const playingPlayerIds = useMemo(() => {
    const ids = new Set<string>();
    activeGames?.forEach(g => {
      if (g.playerBlackId) ids.add(g.playerBlackId);
      if (g.playerWhiteId) ids.add(g.playerWhiteId);
    });
    return ids;
  }, [activeGames]);

  // 名局排序逻辑
  const recentGames = useMemo(() => {
    if (!rawRecentGames) return [];
    return [...rawRecentGames]
      .sort((a, b) => (b.finishedAt?.seconds || 0) - (a.finishedAt?.seconds || 0))
      .slice(0, 10);
  }, [rawRecentGames]);

  const handleInvite = () => {
    if (!invitingPlayer || !user || !db || isSendingInvite) return;
    setIsSendingInvite(true);
    
    const gameRef = doc(collection(db, "games"));
    const gameId = gameRef.id;

    const gameData = {
      id: gameId,
      playerBlackId: user.uid,
      playerWhiteId: invitingPlayer.id,
      playerBlackName: user.displayName,
      playerWhiteName: invitingPlayer.name,
      status: 'pending',
      boardSize: parseInt(selectedSize),
      rules: selectedRule,
      currentTurn: 'black',
      startedAt: serverTimestamp(),
      playerBlackTimeUsed: 0,
      playerWhiteTimeUsed: 0,
      komi: selectedRule === 'chinese' ? 3.75 : 6.5,
      handicap: 0,
      lastActivityAt: serverTimestamp()
    };

    setDoc(gameRef, gameData).then(() => {
      toast({ title: "邀请已发出", description: `等待 ${invitingPlayer.name} 接受挑战...` });
      router.push(`/game/online/${gameId}`);
    }).catch((err) => {
      console.error("Invite failed:", err);
      toast({ variant: "destructive", title: "发起失败", description: "无法连接到竞技节点，请检查网络。" });
      setIsSendingInvite(false);
    });
  };

  const handleAcceptInvite = (gameId: string) => {
    if (!db) return;
    updateDoc(doc(db, "games", gameId), { status: 'in-progress', startedAt: serverTimestamp() });
    router.push(`/game/online/${gameId}`);
  };

  const handleDeclineInvite = (gameId: string) => {
    if (!db) return;
    updateDoc(doc(db, "games", gameId), { status: 'finished', finishedAt: serverTimestamp(), result: { winner: null, reason: '对方拒绝了挑战', diff: 0 } });
  };

  if (loadingUser) return <div className="h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin text-primary h-12 w-12" /></div>;

  const currentInvite = incomingInvites?.[0];

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8 max-w-4xl min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold font-headline text-blue-500 flex items-center gap-3">
            <Swords className="h-8 w-8" /> 竞技大厅
          </h1>
          <p className="text-xs text-muted-foreground italic">寻找活跃棋手，共赴黑白之约。</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {user && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 rounded-full border border-blue-500/20">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-black text-blue-700 uppercase tracking-tight flex items-center gap-1">
                <User className="h-3 w-3" /> {user.displayName}
              </span>
            </div>
          )}
          <Button variant="ghost" size="sm" onClick={() => router.push('/')} className="hover:bg-muted">返回首页</Button>
        </div>
      </div>

      <Tabs defaultValue="players" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-8">
          <TabsTrigger value="players" className="gap-2">
            <Users className="h-4 w-4" /> {t('lobby.tab.players')}
          </TabsTrigger>
          <TabsTrigger value="replays" className="gap-2">
            <Trophy className="h-4 w-4" /> {t('lobby.tab.recent')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="players" className="mt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activePlayers?.filter(p => p.id !== user?.uid).map(p => {
              const isPlaying = playingPlayerIds.has(p.id);
              return (
                <Card key={p.id} className={cn("transition-all group border-2", isPlaying ? "opacity-75" : "hover:border-blue-500")}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="border-2 border-muted">
                        <AvatarFallback className="bg-muted font-bold text-muted-foreground">
                          {p.displayName?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-bold text-foreground group-hover:text-blue-600 transition-colors">{p.displayName}</p>
                        <div className="flex items-center gap-2">
                          {isPlaying ? (
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 gap-1 bg-blue-100 text-blue-700 border-blue-200">
                              <Gamepad2 className="h-2 w-2" /> 正在对局中
                            </Badge>
                          ) : (
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Wifi className="h-2 w-2 text-green-500 fill-green-500" /> 空闲在线
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    {!isPlaying && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="rounded-full h-10 w-10 p-0 border-2 hover:bg-blue-50 hover:border-blue-500"
                        onClick={() => setInvitingPlayer({ id: p.id, name: p.displayName })}
                      >
                        <UserPlus className="h-4 w-4 text-blue-500" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
            {activePlayers?.length <= 1 && (
              <div className="col-span-full py-20 text-center border-2 border-dashed rounded-xl bg-muted/20">
                <p className="text-muted-foreground text-sm font-medium">暂时没有其他在线棋手...</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="replays" className="mt-0">
          <div className="grid gap-4">
            {recentGames?.map(game => (
              <Card key={game.id} className="border-2 hover:border-blue-500 transition-all">
                <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-8 flex-1">
                    <div className="text-center space-y-1">
                       <Badge className={game.result?.winner === 'black' ? 'bg-black text-white' : 'bg-muted'}>
                         {game.result?.winner === 'black' ? t('lobby.game.winner') : ''}
                       </Badge>
                       <p className="font-bold text-sm">{game.playerBlackName}</p>
                       <p className="text-[10px] text-muted-foreground font-bold uppercase">BLACK</p>
                    </div>
                    <div className="flex flex-col items-center gap-2">
                      <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest bg-muted px-2 py-0.5 rounded">VS</div>
                      <Badge variant="outline" className="border-2 font-mono">{game.boardSize}x{game.boardSize}</Badge>
                    </div>
                    <div className="text-center space-y-1">
                       <Badge className={game.result?.winner === 'white' ? 'bg-blue-600 text-white' : 'bg-muted'}>
                         {game.result?.winner === 'white' ? t('lobby.game.winner') : ''}
                       </Badge>
                       <p className="font-bold text-sm">{game.playerWhiteName}</p>
                       <p className="text-[10px] text-muted-foreground font-bold uppercase">WHITE</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <p className="text-[10px] font-bold text-muted-foreground italic">胜负: {game.result?.reason}</p>
                    <Button variant="outline" className="gap-2 border-2 hover:bg-blue-600 hover:text-white hover:border-blue-600" onClick={() => router.push(`/game/online/${game.id}?mode=spectate`)}>
                      <Eye className="h-4 w-4" /> {t('lobby.game.view')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {recentGames?.length === 0 && (
              <div className="py-20 text-center border-2 border-dashed rounded-xl bg-muted/20">
                <p className="text-muted-foreground text-sm font-medium">最近暂无完赛名局...</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!invitingPlayer} onOpenChange={(open) => !open && !isSendingInvite && setInvitingPlayer(null)}>
        <DialogContent className="max-w-md border-4 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-headline flex items-center gap-2">
              <Swords className="h-5 w-5 text-blue-500" /> 向 {invitingPlayer?.name} 发起挑战
            </DialogTitle>
            <DialogDescription>
              请设定对局参数。对方接受后，对局将正式开始。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">棋盘尺寸</label>
              <Tabs value={selectedSize} onValueChange={setSelectedSize} className="w-full">
                <TabsList className="grid w-full grid-cols-3 h-10 bg-muted/50 p-1">
                  <TabsTrigger value="9" className="text-xs">9 x 9</TabsTrigger>
                  <TabsTrigger value="13" className="text-xs">13 x 13</TabsTrigger>
                  <TabsTrigger value="19" className="text-xs">19 x 19</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">对弈规则</label>
              <Tabs value={selectedRule} onValueChange={setSelectedRule} className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-10 bg-muted/50 p-1">
                  <TabsTrigger value="chinese" className="text-xs gap-1"><ShieldCheck className="h-3 w-3" /> 中国规则</TabsTrigger>
                  <TabsTrigger value="territory" className="text-xs gap-1"><Book className="h-3 w-3" /> 日韩规则</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" className="flex-1 font-bold" onClick={() => setInvitingPlayer(null)} disabled={isSendingInvite}>取消</Button>
            <Button className="flex-1 bg-blue-600 hover:bg-blue-700 font-bold gap-2" onClick={handleInvite} disabled={isSendingInvite}>
              {isSendingInvite ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
              {isSendingInvite ? "正在发送..." : "发送挑战书"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!currentInvite} onOpenChange={() => {}}>
        <DialogContent className="max-w-md border-4 border-blue-500 shadow-2xl">
          <DialogHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
              <Swords className="h-8 w-8 text-blue-500 animate-bounce" />
            </div>
            <DialogTitle className="text-2xl font-black font-headline text-blue-700">收到挑战！</DialogTitle>
            <DialogDescription className="text-base">
              来自 <span className="font-bold text-foreground">{currentInvite?.playerBlackName}</span> 的博弈邀请。
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted/30 p-4 rounded-lg flex justify-around text-center border-2 border-blue-500/10">
            <div><p className="text-[10px] font-bold text-muted-foreground uppercase">棋盘</p><p className="font-bold">{currentInvite?.boardSize}x{currentInvite?.boardSize}</p></div>
            <div><p className="text-[10px] font-bold text-muted-foreground uppercase">规则</p><p className="font-bold">{currentInvite?.rules === 'chinese' ? '中国规则' : '日韩规则'}</p></div>
          </div>
          <DialogFooter className="grid grid-cols-2 gap-3 mt-4">
            <Button variant="outline" className="h-12 border-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200 gap-2" onClick={() => handleDeclineInvite(currentInvite.id)}>
              <XCircle className="h-4 w-4" /> 婉言拒绝
            </Button>
            <Button className="h-12 bg-blue-600 hover:bg-blue-700 gap-2" onClick={() => handleAcceptInvite(currentInvite.id)}>
              <CheckCircle2 className="h-4 w-4" /> 接受对局
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="text-center opacity-30 pointer-events-none pb-8">
        <p className="text-[10px] uppercase font-bold tracking-widest">Global Competition Node: SG-1</p>
      </div>
    </div>
  );
}
