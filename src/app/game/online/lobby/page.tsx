
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc, updateDoc, orderBy, limit, setDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Swords, Users, PlayCircle, Loader2, UserPlus, Wifi, ShieldCheck, Book, User, CheckCircle2, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function OnlineLobbyPage() {
  const router = useRouter();
  const { user, loading: loadingUser } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

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

  // 2. 监听所有活跃玩家
  const playersQuery = useMemoFirebase(() => db ? query(collection(db, "userProfiles"), orderBy("lastSeen", "desc"), limit(20)) : null, [db]);
  const { data: players } = useCollection(playersQuery);

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
      status: 'pending', // 初始状态为等待中
      boardSize: parseInt(selectedSize),
      rules: selectedRule,
      currentTurn: 'black',
      startedAt: serverTimestamp(),
      playerBlackTimeUsed: 0,
      playerWhiteTimeUsed: 0,
      komi: selectedRule === 'chinese' ? 3.75 : 6.5,
      handicap: 0
    };

    setDoc(gameRef, gameData).then(() => {
      toast({ title: "邀请已发出", description: `等待 ${invitingPlayer.name} 接受挑战...` });
      router.push(`/game/online/${gameId}`);
    }).catch((err) => {
      console.error("Invite failed:", err);
      toast({ variant: "destructive", title: "发起失败", description: "由于权限限制，无法创建对局。" });
      setIsSendingInvite(false);
    });
  };

  const handleAcceptInvite = (gameId: string) => {
    if (!db) return;
    updateDoc(doc(db, "games", gameId), { status: 'in-progress' });
    router.push(`/game/online/${gameId}`);
  };

  const handleDeclineInvite = (gameId: string) => {
    if (!db) return;
    updateDoc(doc(db, "games", gameId), { status: 'finished', result: { winner: null, reason: '对方拒绝了挑战', diff: 0 } });
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
          <p className="text-xs text-muted-foreground italic">寻找志同道合的棋手，共赴黑白之约。</p>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {players?.filter(p => p.id !== user?.uid).map(p => (
          <Card key={p.id} className="hover:border-blue-500 transition-all group border-2">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="border-2 border-muted">
                  <AvatarFallback className="bg-muted font-bold text-muted-foreground">
                    {p.displayName?.[0] || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold text-foreground group-hover:text-blue-600 transition-colors">{p.displayName}</p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Wifi className="h-2 w-2 text-green-500 fill-green-500" /> 在线
                  </p>
                </div>
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                className="rounded-full h-10 w-10 p-0 border-2 hover:bg-blue-50 hover:border-blue-500"
                onClick={() => setInvitingPlayer({ id: p.id, name: p.displayName })}
              >
                <UserPlus className="h-4 w-4 text-blue-500" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 邀请配置对话框 */}
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

      {/* 收到挑战弹窗 */}
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
