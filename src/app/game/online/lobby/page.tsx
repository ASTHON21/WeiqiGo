
"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, addDoc, serverTimestamp, setDoc, doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Swords, Users, PlayCircle, Loader2, UserPlus, Settings2, Ban, BellRing, ShieldCheck, Book, Fingerprint, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
  const [showDeviceId, setShowDeviceId] = useState(false);

  // 1. 心跳机制 (Presence System)
  useEffect(() => {
    if (!user || !db) return;

    const heartbeat = setInterval(() => {
      const userRef = doc(db, "userProfiles", user.uid);
      updateDoc(userRef, {
        lastSeen: serverTimestamp(),
        acceptingInvites: acceptInvites
      }).catch(() => {});
    }, 30000);

    updateDoc(doc(db, "userProfiles", user.uid), {
      lastSeen: serverTimestamp(),
      acceptingInvites: acceptInvites
    }).catch(() => {});

    return () => clearInterval(heartbeat);
  }, [user, db, acceptInvites]);

  // 2. 监听活跃棋手 (只显示过去 5 分钟内活跃的用户)
  const usersQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "userProfiles"));
  }, [db, user]);
  
  const { data: allProfiles, isLoading: loadingPlayers } = useCollection(usersQuery);

  const activePlayers = allProfiles?.filter(p => {
    if (p.id === user?.uid) return false;
    if (!p.lastSeen) return false;
    
    const lastSeenDate = p.lastSeen.toDate ? p.lastSeen.toDate() : new Date(p.lastSeen);
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60000);
    return lastSeenDate > fiveMinutesAgo;
  }) || [];

  // 3. 监听实时对局
  const liveGamesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "games"), where("status", "==", "in-progress"));
  }, [db, user]);
  
  const { data: liveGames, isLoading: loadingGames } = useCollection(liveGamesQuery);

  // 4. 监听针对我的挂起邀请
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
    
    try {
      const playerBlackId = opponentColor === 'white' ? user.uid : invitingPlayer.id;
      const playerWhiteId = opponentColor === 'white' ? invitingPlayer.id : user.uid;
      const playerBlackName = opponentColor === 'white' ? user.displayName : invitingPlayer.name;
      const playerWhiteName = opponentColor === 'white' ? invitingPlayer.name : user.displayName;

      const gameRef = await addDoc(collection(db, "games"), {
        playerBlackId,
        playerWhiteId,
        playerBlackName,
        playerWhiteName,
        status: 'pending',
        boardSize: parseInt(selectedSize),
        rules: selectedRule,
        currentTurn: 'black',
        startedAt: serverTimestamp(),
        komi: selectedRule === 'chinese' ? 7.5 : 6.5,
        handicap: 0,
        createdBy: user.uid,
        challengerName: user.displayName
      });
      
      toast({ title: "已发送邀请", description: `等待 ${invitingPlayer.name} 响应...` });
      setInvitingPlayer(null);
      router.push(`/game/online/${gameRef.id}`);
    } catch (err) {
      toast({ variant: "destructive", title: "邀请失败" });
    }
  };

  const handleAcceptInvite = async () => {
    if (!receivedInvite || !db) return;
    try {
      await updateDoc(doc(db, "games", receivedInvite.id), {
        status: 'in-progress',
        startedAt: serverTimestamp()
      });
      router.push(`/game/online/${receivedInvite.id}`);
    } catch (err) {}
  };

  const handleDeclineInvite = async () => {
    if (!receivedInvite || !db) return;
    try {
      await updateDoc(doc(db, "games", receivedInvite.id), {
        status: 'finished',
        reason: 'declined'
      });
      setReceivedInvite(null);
    } catch (err) {}
  };

  if (loadingUser) {
    return (
      <div className="h-screen flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
        <p className="text-muted-foreground font-medium animate-pulse">正在验证设备指纹及身份...</p>
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
             <button 
                onClick={() => setShowDeviceId(!showDeviceId)}
                className="flex items-center gap-1.5 bg-muted/50 px-3 py-1.5 rounded-full border hover:bg-muted transition-all active:scale-95 group"
             >
                <Fingerprint className={cn("h-4 w-4 transition-colors", showDeviceId ? "text-blue-500" : "text-muted-foreground")} />
                <span className="text-xs font-bold text-muted-foreground group-hover:text-foreground">
                  {showDeviceId ? `设备 ID: ${user?.deviceId}` : "点击查看设备指纹"}
                </span>
             </button>

             <div className="flex items-center gap-1.5 bg-blue-500/5 px-3 py-1.5 rounded-full border border-blue-500/20">
                <User className="h-4 w-4 text-blue-400" />
                <span className="text-xs text-muted-foreground">
                  棋手 ID: <span className="font-mono text-foreground font-bold">{user?.uid.substring(0, 12)}...</span>
                </span>
             </div>

             <Badge variant={acceptInvites ? "outline" : "destructive"} className="h-7 px-3">
                {acceptInvites ? "在线等待中" : "离线/忙碌"}
             </Badge>
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
            <PlayCircle className="h-4 w-4" /> 实时观战
          </TabsTrigger>
        </TabsList>

        <TabsContent value="players">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {loadingPlayers ? (
              Array(3).fill(0).map((_, i) => (
                <Card key={i} className="animate-pulse bg-muted/20 border-2 h-24" />
              ))
            ) : activePlayers.length > 0 ? (
              activePlayers.map((player) => {
                const isAccepting = player.acceptingInvites !== false;
                return (
                  <Card key={player.id} className={cn("border-2 transition-all group", isAccepting ? "hover:border-blue-500/50" : "opacity-60")}>
                    <CardContent className="p-6 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-12 w-12 border-2 border-primary">
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
                        className="group-hover:bg-blue-500 group-hover:text-white"
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
                <p className="text-muted-foreground font-medium">当前没有其他活跃棋手，建议开启多个浏览器测试</p>
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
                <Card key={game.id} className="border-2 overflow-hidden flex flex-col">
                  <div className="bg-blue-500/10 p-3 border-b flex items-center justify-between">
                    <Badge variant="outline" className="bg-background">{game.boardSize}x{game.boardSize}</Badge>
                    <span className="text-[10px] font-mono font-bold text-blue-600">对局中</span>
                  </div>
                  <CardContent className="p-6 flex-1 flex flex-col justify-center items-center gap-4">
                    <div className="flex items-center gap-6">
                      <div className="text-center space-y-2">
                         <div className="w-10 h-10 rounded-full bg-black mx-auto" />
                         <p className="text-xs font-bold truncate max-w-[80px]">{game.playerBlackName}</p>
                      </div>
                      <div className="text-xl font-bold text-muted-foreground">VS</div>
                      <div className="text-center space-y-2">
                         <div className="w-10 h-10 rounded-full bg-white border mx-auto" />
                         <p className="text-xs font-bold truncate max-w-[80px]">{game.playerWhiteName}</p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-muted/30 p-3 mt-auto">
                    <Button className="w-full gap-2" variant="secondary" onClick={() => router.push(`/game/online/${game.id}?mode=spectate`)}>
                      <PlayCircle className="h-4 w-4" /> 实时观战
                    </Button>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <Card className="col-span-full border-2 border-dashed p-12 text-center bg-muted/5">
                <PlayCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                <p className="text-muted-foreground font-medium">当前暂无公开对局</p>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!invitingPlayer} onOpenChange={(open) => !open && setInvitingPlayer(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-blue-500" /> 对局设置
            </DialogTitle>
            <DialogDescription>
              向 <span className="text-foreground font-bold">{invitingPlayer?.name}</span> 发起挑战。
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase text-muted-foreground">棋盘尺寸</Label>
              <Tabs value={selectedSize} onValueChange={setSelectedSize} className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="9">9 x 9</TabsTrigger>
                  <TabsTrigger value="13">13 x 13</TabsTrigger>
                  <TabsTrigger value="19">19 x 19</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase text-muted-foreground">落子规则</Label>
              <Tabs value={selectedRule} onValueChange={setSelectedRule} className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="chinese">中国规则</TabsTrigger>
                  <TabsTrigger value="territory">日韩规则</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-bold uppercase text-muted-foreground">指定对方颜色</Label>
              <RadioGroup value={opponentColor} onValueChange={(val) => setOpponentColor(val as 'black' | 'white')} className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2 border p-3 rounded-lg cursor-pointer peer-aria-checked:border-blue-500">
                  <RadioGroupItem value="black" id="opt-black" />
                  <Label htmlFor="opt-black">对方执黑</Label>
                </div>
                <div className="flex items-center gap-2 border p-3 rounded-lg cursor-pointer">
                  <RadioGroupItem value="white" id="opt-white" />
                  <Label htmlFor="opt-white">对方执白</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setInvitingPlayer(null)}>取消</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 font-bold" onClick={confirmInvite}>
              发送挑战
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!receivedInvite} onOpenChange={(open) => !open && handleDeclineInvite()}>
        <DialogContent className="sm:max-w-md border-4 border-blue-500 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl text-blue-600">
              <BellRing className="h-6 w-6 animate-bounce" /> 收到新挑战！
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-6 space-y-6">
            <div className="flex items-center gap-4 bg-muted/50 p-4 rounded-xl border">
               <Avatar className="h-14 w-14 border-2 border-blue-500">
                 <AvatarFallback className="bg-blue-500 text-white text-xl font-bold">
                   {receivedInvite?.challengerName?.[0]}
                 </AvatarFallback>
               </Avatar>
               <div>
                 <p className="text-sm text-muted-foreground">来自棋手的挑战</p>
                 <h3 className="text-xl font-black">{receivedInvite?.challengerName}</h3>
               </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 border rounded-lg text-center bg-background">
                <p className="text-[9px] font-bold text-muted-foreground uppercase">尺寸</p>
                <p className="text-sm font-black">{receivedInvite?.boardSize}x{receivedInvite?.boardSize}</p>
              </div>
              <div className="p-3 border rounded-lg text-center bg-background">
                <p className="text-[9px] font-bold text-muted-foreground uppercase">您执</p>
                <p className="text-sm font-black">{receivedInvite?.playerBlackId === user?.uid ? '黑棋' : '白棋'}</p>
              </div>
              <div className="p-3 border rounded-lg text-center bg-background">
                <p className="text-[9px] font-bold text-muted-foreground uppercase">规则</p>
                <p className="text-sm font-black">{receivedInvite?.rules === 'chinese' ? '中' : '日韩'}</p>
              </div>
            </div>
          </div>

          <DialogFooter className="grid grid-cols-2 gap-4">
            <Button variant="outline" className="h-12 font-bold" onClick={handleDeclineInvite}>婉拒</Button>
            <Button className="h-12 font-bold bg-blue-600 hover:bg-blue-700" onClick={handleAcceptInvite}>接受挑战</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
