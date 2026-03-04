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
import { Swords, Users, PlayCircle, Loader2, UserPlus, Wifi, ShieldCheck, Book, User, CheckCircle2, XCircle, Trophy, Eye, Gamepad2, Clock } from 'lucide-react';
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

  // 辅助函数：格式化时间
  const formatDuration = (s: number) => {
    const hrs = Math.floor(s / 3600);
    const mins = Math.floor((s % 3600) / 60);
    const secs = s % 60;
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 监听邀请
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

  // 活跃棋手查询
  const playersQuery = useMemoFirebase(() => db ? query(collection(db, "userProfiles"), orderBy("lastSeen", "desc"), limit(20)) : null, [db]);
  const { data: rawPlayers } = useCollection(playersQuery);

  // 活跃对局统计 (用于资源回收)
  const activeGamesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, "games"), 
      where("status", "in", ["pending", "in-progress"])
    );
  }, [db]);
  const { data: allActiveGames } = useCollection(activeGamesQuery);

  /**
   * 历史名局查询逻辑优化
   * 移除 where("status", "==", "finished") 以避免强制复合索引要求。
   * 采用单字段排序并在客户端进行过滤。
   */
  const recentGamesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(
      collection(db, "games"), 
      orderBy("finishedAt", "desc"),
      limit(50) 
    );
  }, [db]);
  const { data: rawRecentGames } = useCollection(recentGamesQuery);

  // 过滤真实在线玩家
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

  // 过滤 1 小时内的已完赛名局 (客户端过滤以规避索引问题)
  const filteredRecentGames = useMemo(() => {
    if (!rawRecentGames) return [];
    const now = Date.now();
    const ONE_HOUR = 60 * 60 * 1000;
    
    return rawRecentGames.filter(game => {
      // 仅显示状态为已完成的对局
      if (game.status !== 'finished') return false;
      if (!game.finishedAt) return false;
      const finishedTime = game.finishedAt instanceof Timestamp ? game.finishedAt.toMillis() : new Date(game.finishedAt).getTime();
      return (now - finishedTime) < ONE_HOUR;
    });
  }, [rawRecentGames]);

  // 计算真实的活跃对局数 (排除 15 分钟无互动的僵尸对局)
  const trulyActiveGamesCount = useMemo(() => {
    if (!allActiveGames) return 0;
    const now = Date.now();
    const STALE_THRESHOLD = 15 * 60 * 1000;
    return allActiveGames.filter(g => {
      if (!g.lastActivityAt) return true; 
      const lastActivity = g.lastActivityAt instanceof Timestamp ? g.lastActivityAt.toMillis() : new Date(g.lastActivityAt).getTime();
      return (now - lastActivity) < STALE_THRESHOLD;
    }).length;
  }, [allActiveGames]);

  // 正在对局中的玩家 ID 集合
  const playingPlayerIds = useMemo(() => {
    const ids = new Set<string>();
    const now = Date.now();
    const STALE_THRESHOLD = 15 * 60 * 1000;

    allActiveGames?.forEach(g => {
      if (g.status === 'in-progress') {
        const lastActivity = g.lastActivityAt instanceof Timestamp ? g.lastActivityAt.toMillis() : new Date(g.lastActivityAt).getTime();
        if ((now - lastActivity) < STALE_THRESHOLD) {
          if (g.playerBlackId) ids.add(g.playerBlackId);
          if (g.playerWhiteId) ids.add(g.playerWhiteId);
        }
      }
    });
    return ids;
  }, [allActiveGames]);

  const handleInvite = () => {
    if (!invitingPlayer || !user || !db || isSendingInvite) return;
    
    if (trulyActiveGamesCount >= 30) {
      toast({ variant: "destructive", title: "服务器负载受限", description: "活跃对局已达上限。" });
      return;
    }

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
      moveCount: 0,
      lastActivityAt: serverTimestamp()
    };

    setDoc(gameRef, gameData).then(() => {
      toast({ title: "挑战已发送", description: `等待 ${invitingPlayer.name} 接受...` });
      router.push(`/game/online/${gameId}`);
    }).catch((err) => {
      toast({ variant: "destructive", title: "发起失败", description: "网络异常。" });
      setIsSendingInvite(false);
    });
  };

  const handleAcceptInvite = (gameId: string) => {
    if (!db) return;
    updateDoc(doc(db, "games", gameId), { status: 'in-progress', startedAt: serverTimestamp(), lastActivityAt: serverTimestamp() });
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
          <p className="text-xs text-muted-foreground italic">寻找志同道合的棋友进行在线同步博弈。</p>
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
          <Button variant="ghost" size="sm" onClick={() => router.push('/')}>返回首页</Button>
        </div>
      </div>

      <Tabs defaultValue="players" className="w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
            <TabsTrigger value="players" className="gap-2">
              <Users className="h-4 w-4" /> {t('lobby.tab.players')}
            </TabsTrigger>
            <TabsTrigger value="replays" className="gap-2">
              <Trophy className="h-4 w-4" /> {t('lobby.tab.recent')}
            </TabsTrigger>
          </TabsList>
          
          <Badge variant="outline" className={cn(
            "border-2 font-mono gap-2 px-3 py-1",
            trulyActiveGamesCount >= 25 ? "bg-red-500/10 border-red-500 text-red-700" : "bg-muted/50 border-muted"
          )}>
            <Wifi className={cn("h-3 w-3", trulyActiveGamesCount >= 25 ? "text-red-500" : "text-blue-500")} /> 
            活跃对局: {trulyActiveGamesCount} / 30
          </Badge>
        </div>

        <TabsContent value="players" className="mt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {activePlayers?.filter(p => p.id !== user?.uid).map(p => {
              const isPlaying = playingPlayerIds.has(p.id);
              return (
                <Card key={p.id} className={cn("transition-all group border-2", isPlaying ? "opacity-75" : "hover:border-blue-500")}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="border-2 border-muted">
                        <AvatarFallback className="font-bold bg-muted text-muted-foreground">
                          {p.displayName?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-bold text-foreground group-hover:text-blue-600 transition-colors">
                            {p.displayName}
                        </p>
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
            {activePlayers?.filter(p => p.id !== user?.uid).length === 0 && (
              <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl bg-muted/20">
                <p className="text-muted-foreground text-sm italic">当前大厅暂无其他空闲棋手...</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="replays" className="mt-0">
          <div className="grid gap-4">
            {filteredRecentGames.length > 0 ? (
              filteredRecentGames.map(game => (
                <Card key={game.id} className="border-2 hover:border-blue-500 transition-all">
                  <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-8 flex-1">
                      <div className="text-center space-y-1">
                         <Badge className={game.result?.winner === 'black' ? 'bg-black text-white' : 'bg-muted'}>
                           {game.result?.winner === 'black' ? t('lobby.game.winner') : ''}
                         </Badge>
                         <p className="font-bold text-sm">{game.playerBlackName}</p>
                         <div className="flex items-center gap-1 justify-center text-[9px] text-muted-foreground font-mono">
                            <Clock className="h-2 w-2" /> {formatDuration(game.playerBlackTimeUsed || 0)}
                         </div>
                      </div>
                      <div className="flex flex-col items-center gap-1 min-w-[100px]">
                        <div className="text-[10px] font-black text-muted-foreground uppercase tracking-widest bg-muted px-2 py-0.5 rounded">VS</div>
                        <Badge variant="outline" className="border-2 font-mono h-6">{game.boardSize}x{game.boardSize}</Badge>
                        <div className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100 mt-1">
                          {game.rules === 'chinese' ? '中国规则' : '日韩规则'}
                        </div>
                      </div>
                      <div className="text-center space-y-1">
                         <Badge className={game.result?.winner === 'white' ? 'bg-blue-600 text-white' : 'bg-muted'}>
                           {game.result?.winner === 'white' ? t('lobby.game.winner') : ''}
                         </Badge>
                         <p className="font-bold text-sm">{game.playerWhiteName}</p>
                         <div className="flex items-center gap-1 justify-center text-[9px] text-muted-foreground font-mono">
                            <Clock className="h-2 w-2" /> {formatDuration(game.playerWhiteTimeUsed || 0)}
                         </div>
                      </div>
                    </div>
                    <Button variant="outline" className="gap-2 border-2 hover:bg-blue-600 hover:text-white h-10 px-6 font-bold" onClick={() => router.push(`/game/online/${game.id}?mode=spectate`)}>
                      <Eye className="h-4 w-4" /> {t('lobby.game.view')}
                    </Button>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-12 border-2 border-dashed rounded-xl bg-muted/20">
                <Trophy className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground text-sm">一小时内暂无完赛名局。</p>
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
              {isSendingInvite ? "正在进入..." : "开始博弈"}
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
              来自 <span className="font-bold text-foreground">{currentInvite?.playerBlackName}</span> 的挑战。
            </DialogDescription>
          </DialogHeader>

          <div className="p-4 bg-muted/30 rounded-lg border text-sm space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest">棋盘尺寸</span>
              <Badge variant="outline" className="font-mono border-2">{currentInvite?.boardSize}x{currentInvite?.boardSize}</Badge>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground font-bold text-[10px] uppercase tracking-widest">对弈规则</span>
              <Badge className="bg-blue-600 border-0">
                {currentInvite?.rules === 'chinese' ? '中国规则' : '日韩规则'}
              </Badge>
            </div>
          </div>

          <DialogFooter className="grid grid-cols-2 gap-3 mt-4">
            <Button variant="outline" className="h-12 border-2" onClick={() => handleDeclineInvite(currentInvite.id)}>拒绝</Button>
            <Button className="h-12 bg-blue-600" onClick={() => handleAcceptInvite(currentInvite.id)}>接受</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
