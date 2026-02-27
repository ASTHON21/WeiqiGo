
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, addDoc, serverTimestamp, doc, updateDoc, orderBy, limit, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Swords, Users, PlayCircle, Loader2, UserPlus, Settings2, Ban, User, Wifi, WifiOff, Clock, Trophy, History, Bell, Hourglass } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/language-context';

export default function OnlineLobbyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const acceptInvites = searchParams.get('acceptInvites') !== 'false';
  const { user, loading: loadingUser } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const { t } = useLanguage();

  const [invitingPlayer, setInvitingPlayer] = useState<{ id: string, name: string } | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>("19");
  const [selectedRule, setSelectedRule] = useState<string>("chinese");
  const [opponentColor, setOpponentColor] = useState<'black' | 'white'>('white');
  const [receivedInvite, setReceivedInvite] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!user?.uid || !db) return;
    const updateStatus = async () => {
      const userRef = doc(db, "userProfiles", user.uid);
      updateDoc(userRef, {
        lastSeen: serverTimestamp(),
        acceptingInvites: acceptInvites
      }).then(() => setIsConnected(true))
        .catch(() => setIsConnected(false));
    };
    updateStatus();
    const heartbeat = setInterval(updateStatus, 30000); 
    return () => clearInterval(heartbeat);
  }, [user?.uid, db, acceptInvites]);

  const usersQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, "userProfiles"), orderBy("lastSeen", "desc"), limit(50));
  }, [db, user?.uid]);
  const { data: allProfiles, isLoading: loadingPlayers } = useCollection(usersQuery);

  const activePlayers = useMemo(() => {
    if (!allProfiles) return [];
    const threshold = Date.now() - 5 * 60000;
    return allProfiles.filter(p => {
      if (p.id === user?.uid) return false;
      if (!p.lastSeen) return false;
      const lastSeenDate = p.lastSeen.toDate ? p.lastSeen.toDate().getTime() : new Date(p.lastSeen).getTime();
      return lastSeenDate > threshold;
    });
  }, [allProfiles, user?.uid]);

  const recentGamesQuery = useMemoFirebase(() => {
    if (!db) return null;
    const oneHourAgo = Timestamp.fromDate(new Date(Date.now() - 60 * 60 * 1000));
    return query(
      collection(db, "games"), 
      where("finishedAt", ">=", oneHourAgo),
      orderBy("finishedAt", "desc"), 
      limit(20)
    );
  }, [db]);
  
  const { data: allRecentGames, isLoading: loadingGames } = useCollection(recentGamesQuery);

  const filteredRecentGames = useMemo(() => {
    if (!allRecentGames) return [];
    return allRecentGames.filter(g => g.status === 'finished' && g.reason !== 'declined');
  }, [allRecentGames]);

  // Directed Invite Listeners
  const invitesBlackQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, "games"), where("status", "==", "pending"), where("playerBlackId", "==", user.uid));
  }, [db, user?.uid]);
  const invitesWhiteQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(collection(db, "games"), where("status", "==", "pending"), where("playerWhiteId", "==", user.uid));
  }, [db, user?.uid]);
  
  const { data: invitesBlack } = useCollection(invitesBlackQuery);
  const { data: invitesWhite } = useCollection(invitesWhiteQuery);

  useEffect(() => {
    if (!user?.uid) return;
    const allInvites = [...(invitesBlack || []), ...(invitesWhite || [])];
    const invite = allInvites.find(g => g.createdBy !== user.uid);
    if (invite && (!receivedInvite || invite.id !== receivedInvite.id)) {
      setReceivedInvite(invite);
    } else if (!invite && receivedInvite) {
      setReceivedInvite(null);
    }
  }, [invitesBlack, invitesWhite, user?.uid, receivedInvite]);

  const handleInviteClick = (id: string, name: string, isAccepting: boolean) => {
    if (!isAccepting) {
      toast({ variant: "destructive", title: "无法邀请", description: `${name} 当前不接受邀请。` });
      return;
    }
    setInvitingPlayer({ id, name });
  };

  const confirmInvite = async () => {
    if (!user?.uid || !invitingPlayer) return;
    
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
      playerBlackTimeUsed: 0,
      playerWhiteTimeUsed: 0,
      lastActivityAt: serverTimestamp()
    };

    addDoc(collection(db, "games"), newGame).then((gameRef) => {
      toast({ title: "挑战书已送达", description: `等待 ${invitingPlayer.name} 开启对局...` });
      setInvitingPlayer(null);
      router.push(`/game/online/${gameRef.id}`);
    }).catch(console.error);
  };

  const handleAcceptInvite = async () => {
    if (!receivedInvite || !db) return;
    
    // Explicitly update status to in-progress first
    await updateDoc(doc(db, "games", receivedInvite.id), {
      status: 'in-progress',
      startedAt: serverTimestamp(),
      lastActivityAt: serverTimestamp()
    });

    toast({ title: "挑战已接受", description: "建立 P2P 隧道中..." });
    router.push(`/game/online/${receivedInvite.id}`);
  };

  const handleDeclineInvite = async () => {
    if (!receivedInvite || !db) return;
    updateDoc(doc(db, "games", receivedInvite.id), {
      status: 'finished',
      reason: 'declined',
      finishedAt: serverTimestamp()
    }).then(() => {
      setReceivedInvite(null);
    }).catch(console.error);
  };

  const formatDuration = (seconds: number = 0) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
            <Swords className="h-10 w-10" /> {t('home.online.title')}
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
                    {acceptInvites ? "等待挑战中" : "免打扰模式"}
                </Badge>
                <Badge variant="ghost" className={cn("h-7 gap-1.5", isConnected ? "text-green-500" : "text-red-500")}>
                  {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                  {isConnected ? "云端同步中" : "连接异常"}
                </Badge>
             </div>
          </div>
        </div>
        <Button variant="outline" onClick={() => router.push('/')}>返回主页</Button>
      </div>

      <Tabs defaultValue="players" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 h-12 mb-6">
          <TabsTrigger value="players" className="gap-2">
            <Users className="h-4 w-4" /> {t('lobby.tab.players')} ({activePlayers.length})
          </TabsTrigger>
          <TabsTrigger value="games" className="gap-2">
            <History className="h-4 w-4" /> {t('lobby.tab.recent')} ({filteredRecentGames?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="players">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {!loadingPlayers ? (
              activePlayers.length > 0 ? (
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
                </Card>
              )
            ) : (
              Array(6).fill(0).map((_, i) => <Card key={i} className="animate-pulse bg-muted/20 border-2 h-24" />)
            )}
          </div>
        </TabsContent>

        <TabsContent value="games">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {!loadingGames ? (
              filteredRecentGames?.length ? (
                filteredRecentGames.map((game) => (
                  <Card key={game.id} className="border-2 overflow-hidden flex flex-col group hover:border-blue-500/50 transition-all shadow-sm">
                    <div className="bg-blue-500/10 p-3 border-b flex items-center justify-between">
                      <div className="flex gap-2">
                        <Badge variant="outline" className="bg-background text-[10px] font-mono">{game.boardSize}x{game.boardSize}</Badge>
                        <Badge variant="secondary" className="text-[10px]">{game.rules === 'chinese' ? '中' : '日韩'}</Badge>
                      </div>
                      <div className="flex items-center gap-1.5 text-blue-600 font-bold text-[10px] font-headline uppercase tracking-wider">
                        <Trophy className="h-3 w-3" /> 名局回看
                      </div>
                    </div>
                    <CardContent className="p-6 flex-1 flex flex-col gap-6">
                      <div className="flex items-center justify-between gap-4">
                        <div className="text-center space-y-2 flex-1">
                           <div className="w-10 h-10 rounded-full bg-black mx-auto ring-2 ring-offset-2 ring-black/10 shadow-sm" />
                           <p className="text-xs font-bold truncate">{game.playerBlackName}</p>
                           {game.result?.winner === 'black' && <Badge variant="secondary" className="text-[10px] py-0">{t('lobby.game.winner')}</Badge>}
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-black text-muted-foreground bg-muted px-2 py-1 rounded italic mb-1">SCORE</p>
                          <p className="text-sm font-bold font-headline">{game.result?.blackScore?.toFixed(1)} : {game.result?.whiteScore?.toFixed(1)}</p>
                        </div>
                        <div className="text-center space-y-2 flex-1">
                           <div className="w-10 h-10 rounded-full bg-white border mx-auto ring-2 ring-offset-2 ring-black/10 shadow-sm" />
                           <p className="text-xs font-bold truncate">{game.playerWhiteName}</p>
                           {game.result?.winner === 'white' && <Badge variant="secondary" className="text-[10px] py-0">{t('lobby.game.winner')}</Badge>}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-2 border-t border-dashed">
                         <div className="flex items-center gap-2 text-xs text-muted-foreground">
                           <Clock className="h-3 w-3" />
                           <span className="font-mono">B:{formatDuration(game.playerBlackTimeUsed)} | W:{formatDuration(game.playerWhiteTimeUsed)}</span>
                         </div>
                         <div className="flex items-center gap-2 text-xs text-muted-foreground justify-end">
                           <History className="h-3 w-3" />
                           <span className="font-bold">总手数: {game.moveCount || 0}</span>
                         </div>
                      </div>
                    </CardContent>
                    <CardFooter className="bg-muted/30 p-3 mt-auto">
                      <Button className="w-full gap-2 font-bold group-hover:bg-blue-600 group-hover:text-white transition-all" variant="outline" onClick={() => router.push(`/game/online/${game.id}?mode=spectate`)}>
                        <PlayCircle className="h-4 w-4" /> {t('lobby.game.view')}
                      </Button>
                    </CardFooter>
                  </Card>
                ))
              ) : (
                <Card className="col-span-full border-2 border-dashed p-12 text-center bg-muted/5">
                  <PlayCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                  <p className="text-muted-foreground font-medium font-headline">暂无最近完赛名局</p>
                </Card>
              )
            ) : (
              <div className="col-span-full flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Received Invite Modal */}
      <Dialog open={!!receivedInvite} onOpenChange={(open) => !open && handleDeclineInvite()}>
        <DialogContent className="sm:max-w-md border-4 border-blue-600 shadow-2xl">
          <DialogHeader>
            <DialogTitle>收到对局挑战</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-6">
            <div className="flex items-center gap-4 bg-blue-500/5 p-4 rounded-xl border border-blue-500/20">
               <Avatar className="h-14 w-14 border-2 border-blue-600">
                 <AvatarFallback className="bg-blue-600 text-white text-xl font-bold font-headline">{receivedInvite?.challengerName?.[0]}</AvatarFallback>
               </Avatar>
               <div>
                 <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">在线挑战邀请</p>
                 <h3 className="text-xl font-black">{receivedInvite?.challengerName}</h3>
               </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 border rounded-lg text-center bg-background"><p className="text-[9px] font-bold text-muted-foreground uppercase">棋盘</p><p className="text-sm font-black">{receivedInvite?.boardSize}x{receivedInvite?.boardSize}</p></div>
              <div className="p-3 border rounded-lg text-center bg-background"><p className="text-[9px] font-bold text-muted-foreground uppercase">角色</p><p className="text-sm font-black">{receivedInvite?.playerBlackId === user?.uid ? '执黑' : '执白'}</p></div>
              <div className="p-3 border rounded-lg text-center bg-background"><p className="text-[9px] font-bold text-muted-foreground uppercase">规则</p><p className="text-sm font-black">{receivedInvite?.rules === 'chinese' ? '中' : '日韩'}</p></div>
            </div>
          </div>
          <DialogFooter className="grid grid-cols-2 gap-4 pt-4 border-t">
            <Button variant="outline" className="h-12 font-bold border-2" onClick={handleDeclineInvite}>拒绝</Button>
            <Button className="h-12 font-bold bg-blue-600 hover:bg-blue-700 shadow-lg" onClick={handleAcceptInvite}>接受并进入</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sending Invite Modal */}
      <Dialog open={!!invitingPlayer} onOpenChange={(open) => !open && setInvitingPlayer(null)}>
        <DialogContent className="sm:max-w-md border-2">
          <DialogHeader>
            <DialogTitle>发起对局挑战</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">棋盘尺寸</Label>
              <Tabs value={selectedSize} onValueChange={setSelectedSize} className="w-full">
                <TabsList className="grid w-full grid-cols-3 h-10"><TabsTrigger value="9">9x9</TabsTrigger><TabsTrigger value="13">13x13</TabsTrigger><TabsTrigger value="19">19x19</TabsTrigger></TabsList>
              </Tabs>
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">对局规则</Label>
              <Tabs value={selectedRule} onValueChange={setSelectedRule} className="w-full">
                <TabsList className="grid w-full grid-cols-2 h-10"><TabsTrigger value="chinese">中国规则</TabsTrigger><TabsTrigger value="territory">日韩规则</TabsTrigger></TabsList>
              </Tabs>
            </div>
            <div className="space-y-3">
              <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">对手颜色</Label>
              <RadioGroup value={opponentColor} onValueChange={(val) => setOpponentColor(val as 'black' | 'white')} className="grid grid-cols-2 gap-4">
                <div className={cn("flex items-center gap-2 border-2 p-3 rounded-lg cursor-pointer", opponentColor === 'black' && "border-blue-500 bg-blue-500/5")}>
                  <RadioGroupItem value="black" id="opt-black" /><Label htmlFor="opt-black" className="cursor-pointer font-bold">对手执黑</Label>
                </div>
                <div className={cn("flex items-center gap-2 border-2 p-3 rounded-lg cursor-pointer", opponentColor === 'white' && "border-blue-500 bg-blue-500/5")}>
                  <RadioGroupItem value="white" id="opt-white" /><Label htmlFor="opt-white" className="cursor-pointer font-bold">对手执白</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <DialogFooter className="pt-4 border-t flex gap-2">
            <Button variant="ghost" onClick={() => setInvitingPlayer(null)} className="flex-1 h-11">取消</Button>
            <Button className="flex-1 bg-blue-600 hover:bg-blue-700 font-bold h-11" onClick={confirmInvite}>下战书</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
