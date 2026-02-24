"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, addDoc, serverTimestamp, setDoc, doc, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Swords, Users, PlayCircle, Loader2, UserPlus, Settings2, Ban, BellRing } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function OnlineLobbyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const acceptInvites = searchParams.get('acceptInvites') === 'true';
  const { user, loading: loadingUser } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [invitingPlayer, setInvitingPlayer] = useState<{ id: string, name: string } | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>("19");
  const [opponentColor, setOpponentColor] = useState<'black' | 'white'>('white');

  // 接收到的邀请状态
  const [receivedInvite, setReceivedInvite] = useState<any>(null);

  // 1. 初始化/更新用户 Profile
  useEffect(() => {
    if (user && db) {
      const userRef = doc(db, "userProfiles", user.uid);
      setDoc(userRef, {
        id: user.uid,
        displayName: user.displayName,
        lastLoginAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        acceptingInvites: acceptInvites,
      }, { merge: true });
    }
  }, [user, db, acceptInvites]);

  // 2. 监听在线棋手
  const usersQuery = useMemoFirebase(() => query(collection(db, "userProfiles")), [db]);
  const { data: onlinePlayers, isLoading: loadingPlayers } = useCollection(usersQuery);

  // 3. 监听实时对局（观战用）
  const liveGamesQuery = useMemoFirebase(() => 
    query(collection(db, "games"), where("status", "==", "in-progress")), [db]);
  const { data: liveGames, isLoading: loadingGames } = useCollection(liveGamesQuery);

  // 4. 监听针对我的挂起邀请 (Pending Invites)
  const myInvitesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, "games"), 
      where("status", "==", "pending")
    );
  }, [db, user]);

  const { data: allPendingGames } = useCollection(myInvitesQuery);

  // 过滤出真正属于我的邀请（作为黑方或白方，且我不是发起者 - 简化逻辑：只要是针对我的 ID 且我是被动加入方）
  useEffect(() => {
    if (allPendingGames && user) {
      const activeInvite = allPendingGames.find(g => 
        (g.playerBlackId === user.uid || g.playerWhiteId === user.uid) && 
        g.createdBy !== user.uid // 确保不是我自己发起的
      );
      if (activeInvite && (!receivedInvite || activeInvite.id !== receivedInvite.id)) {
        setReceivedInvite(activeInvite);
      }
    }
  }, [allPendingGames, user, receivedInvite]);

  const handleInviteClick = (id: string, name: string, isAccepting: boolean) => {
    if (!isAccepting) {
      toast({
        variant: "destructive",
        title: "无法邀请",
        description: `${name} 当前设置了不接受任何对局邀请。`,
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
        currentTurn: 'black',
        startedAt: serverTimestamp(),
        komi: 7.5,
        handicap: 0,
        createdBy: user.uid, // 标记发起者
        challengerName: user.displayName
      });
      
      toast({
        title: "已发送邀请",
        description: `正在等待 ${invitingPlayer.name} 接受对局请求...`,
      });
      
      setInvitingPlayer(null);
      router.push(`/game/online/${gameRef.id}`);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "邀请失败",
        description: "无法发起对局邀请，请稍后重试。",
      });
    }
  };

  const handleAcceptInvite = async () => {
    if (!receivedInvite || !db) return;
    try {
      await updateDoc(doc(db, "games", receivedInvite.id), {
        status: 'in-progress',
        startedAt: serverTimestamp()
      });
      const inviteId = receivedInvite.id;
      setReceivedInvite(null);
      router.push(`/game/online/${inviteId}`);
    } catch (err) {
      console.error("接受邀请失败", err);
    }
  };

  const handleDeclineInvite = async () => {
    if (!receivedInvite || !db) return;
    try {
      await updateDoc(doc(db, "games", receivedInvite.id), {
        status: 'finished',
        reason: 'declined'
      });
      setReceivedInvite(null);
      toast({ title: "已拒绝邀请" });
    } catch (err) {
      console.error("拒绝邀请失败", err);
    }
  };

  const handleSpectate = (gameId: string) => {
    router.push(`/game/online/${gameId}?mode=spectate`);
  };

  if (loadingUser) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-500" /></div>;
  }

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold font-headline tracking-tight text-blue-500 flex items-center gap-3">
            <Swords className="h-10 w-10" /> 竞技大厅
          </h1>
          <div className="text-muted-foreground italic flex items-center flex-wrap gap-2 mt-1">
            <span>您当前的临时身份: <span className="text-foreground font-bold">{user?.displayName}</span></span>
            <Badge variant={acceptInvites ? "outline" : "destructive"}>
              {acceptInvites ? "接受邀请中" : "拒绝邀请中"}
            </Badge>
          </div>
        </div>
        <Button variant="outline" onClick={() => router.push('/')}>返回主页</Button>
      </div>

      <Tabs defaultValue="players" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 h-12 mb-6">
          <TabsTrigger value="players" className="gap-2">
            <Users className="h-4 w-4" /> 在线棋手
          </TabsTrigger>
          <TabsTrigger value="games" className="gap-2">
            <PlayCircle className="h-4 w-4" /> 实时观战
          </TabsTrigger>
        </TabsList>

        <TabsContent value="players">
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {loadingPlayers ? (
              Array(6).fill(0).map((_, i) => (
                <Card key={i} className="animate-pulse bg-muted/20 border-2">
                  <div className="p-6 h-24" />
                </Card>
              ))
            ) : onlinePlayers?.filter(p => p.id !== user?.uid).map((player) => {
              const isAccepting = player.acceptingInvites !== false;
              return (
                <Card key={player.id} className={cn("border-2 transition-all group", isAccepting ? "hover:border-blue-500/50" : "opacity-60")}>
                  <CardContent className="p-6 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12 border-2 border-primary">
                        <AvatarFallback className={cn("text-white font-bold", isAccepting ? "bg-blue-500" : "bg-muted-foreground")}>
                          {player.displayName?.[0] || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-bold text-lg flex items-center gap-2">
                          {player.displayName}
                          {!isAccepting && <Ban className="h-3 w-3 text-red-500" title="不接受邀请" />}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <div className={cn("w-2 h-2 rounded-full", isAccepting ? "bg-green-500 animate-pulse" : "bg-red-400")} />
                          <span className="text-[10px] text-muted-foreground">
                            {isAccepting ? "可对弈" : "请勿打扰"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      disabled={!isAccepting}
                      className={cn(isAccepting && "group-hover:bg-blue-500 group-hover:text-white transition-colors")} 
                      onClick={() => handleInviteClick(player.id, player.displayName, isAccepting)}
                    >
                      {isAccepting ? <UserPlus className="h-5 w-5" /> : <Ban className="h-5 w-5 text-red-500" />}
                    </Button>
                  </CardContent>
                </Card>
              );
            }) || <div className="col-span-full text-center py-12 text-muted-foreground">暂无其他棋手在线</div>}
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
                    <span className="text-[10px] font-mono font-bold text-blue-600">进行中</span>
                  </div>
                  <CardContent className="p-6 flex-1 flex flex-col justify-center items-center gap-4">
                    <div className="flex items-center gap-6">
                      <div className="text-center space-y-2">
                         <div className="w-10 h-10 rounded-full bg-black mx-auto ring-2 ring-offset-2 ring-black/10" />
                         <p className="text-xs font-bold truncate max-w-[80px]">{game.playerBlackName || '匿名黑方'}</p>
                      </div>
                      <div className="text-xl font-bold text-muted-foreground">VS</div>
                      <div className="text-center space-y-2">
                         <div className="w-10 h-10 rounded-full bg-white border mx-auto ring-2 ring-offset-2 ring-black/10" />
                         <p className="text-xs font-bold truncate max-w-[80px]">{game.playerWhiteName || '匿名白方'}</p>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-muted/30 p-3 mt-auto">
                    <Button className="w-full gap-2" variant="secondary" onClick={() => handleSpectate(game.id)}>
                      <PlayCircle className="h-4 w-4" /> 实时观战
                    </Button>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <Card className="col-span-full border-2 border-dashed p-12 text-center bg-muted/5">
                <PlayCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                <p className="text-muted-foreground font-medium">当前没有任何正在进行的公开对局</p>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* 发起邀请配置弹窗 */}
      <Dialog open={!!invitingPlayer} onOpenChange={(open) => !open && setInvitingPlayer(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-blue-500" /> 对局邀请设置
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
              <Label className="text-xs font-bold uppercase text-muted-foreground">指定对方棋子颜色</Label>
              <RadioGroup 
                value={opponentColor} 
                onValueChange={(val) => setOpponentColor(val as 'black' | 'white')}
                className="grid grid-cols-2 gap-4"
              >
                <div>
                  <RadioGroupItem value="black" id="opponent-black" className="peer sr-only" />
                  <Label
                    htmlFor="opponent-black"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-blue-500 [&:has([data-state=checked])]:border-blue-500"
                  >
                    <div className="w-8 h-8 rounded-full bg-black border-2 border-white mb-2" />
                    <span className="text-xs font-bold">对方执黑</span>
                  </Label>
                </div>
                <div>
                  <RadioGroupItem value="white" id="opponent-white" className="peer sr-only" />
                  <Label
                    htmlFor="opponent-white"
                    className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-blue-500 [&:has([data-state=checked])]:border-blue-500"
                  >
                    <div className="w-8 h-8 rounded-full bg-white border-2 border-black mb-2" />
                    <span className="text-xs font-bold">对方执白</span>
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <DialogFooter className="sm:justify-between">
            <Button variant="ghost" onClick={() => setInvitingPlayer(null)}>取消</Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold" onClick={confirmInvite}>
              发送邀请挑战
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 收到邀请弹窗 */}
      <Dialog open={!!receivedInvite} onOpenChange={(open) => !open && handleDeclineInvite()}>
        <DialogContent className="sm:max-w-md border-4 border-blue-500 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl text-blue-600">
              <BellRing className="h-6 w-6 animate-bounce" /> 收到新对局挑战！
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-6 space-y-6">
            <div className="flex items-center gap-4 bg-muted/50 p-4 rounded-xl border">
               <Avatar className="h-14 w-14 border-2 border-blue-500">
                 <AvatarFallback className="bg-blue-500 text-white text-xl font-bold">
                   {receivedInvite?.challengerName?.[0] || '?'}
                 </AvatarFallback>
               </Avatar>
               <div>
                 <p className="text-sm text-muted-foreground">来自棋手的挑战</p>
                 <h3 className="text-xl font-black">{receivedInvite?.challengerName}</h3>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 border rounded-lg text-center space-y-1 bg-background">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">棋盘尺寸</p>
                <p className="text-lg font-black">{receivedInvite?.boardSize} x {receivedInvite?.boardSize}</p>
              </div>
              <div className="p-3 border rounded-lg text-center space-y-1 bg-background">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">您的角色</p>
                <div className="flex items-center justify-center gap-2">
                  <div className={cn("w-3 h-3 rounded-full border", receivedInvite?.playerBlackId === user?.uid ? "bg-black" : "bg-white")} />
                  <p className="text-lg font-black">{receivedInvite?.playerBlackId === user?.uid ? '执黑' : '执白'}</p>
                </div>
              </div>
            </div>

            <div className="text-xs text-center text-muted-foreground bg-blue-50 p-2 rounded italic">
              * 接受挑战后将立即进入对局房间，遵循中国围棋规则。
            </div>
          </div>

          <DialogFooter className="grid grid-cols-2 gap-4">
            <Button variant="outline" className="h-12 text-lg font-bold" onClick={handleDeclineInvite}>
              婉言拒绝
            </Button>
            <Button className="h-12 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white" onClick={handleAcceptInvite}>
              接受对局
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}