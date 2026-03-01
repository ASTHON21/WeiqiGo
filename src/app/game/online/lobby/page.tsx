
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, addDoc, serverTimestamp, doc, updateDoc, orderBy, limit } from 'firebase/firestore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Swords, Users, PlayCircle, Loader2, UserPlus, Wifi } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function OnlineLobbyPage() {
  const router = useRouter();
  const { user, loading: loadingUser } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [invitingPlayer, setInvitingPlayer] = useState<{ id: string, name: string } | null>(null);
  const [activeCount, setActiveCount] = useState(0);

  // 监控活跃对局数
  const activeQuery = useMemoFirebase(() => (db && user) ? query(collection(db, "games"), where("status", "==", "in-progress")) : null, [db, user]);
  const { data: activeGames } = useCollection(activeQuery);

  useEffect(() => {
    if (activeGames && user) {
      const count = activeGames.filter(g => g.playerBlackId === user.uid || g.playerWhiteId === user.uid).length;
      setActiveCount(count);
    }
  }, [activeGames, user]);

  const playersQuery = useMemoFirebase(() => db ? query(collection(db, "userProfiles"), orderBy("lastSeen", "desc"), limit(20)) : null, [db]);
  const { data: players } = useCollection(playersQuery);

  const handleInvite = async () => {
    if (activeCount >= 30) return toast({ variant: "destructive", title: "对局上限", description: "同时进行的对局不能超过30个。" });
    if (!invitingPlayer || !user) return;

    const gameData = {
      playerBlackId: user.uid,
      playerWhiteId: invitingPlayer.id,
      playerBlackName: user.displayName,
      playerWhiteName: invitingPlayer.name,
      status: 'pending',
      boardSize: 19,
      rules: 'chinese',
      currentTurn: 'black',
      startedAt: serverTimestamp(),
      playerBlackTimeUsed: 0,
      playerWhiteTimeUsed: 0,
      createdBy: user.uid
    };

    const ref = await addDoc(collection(db, "games"), gameData);
    router.push(`/game/online/${ref.id}`);
  };

  if (loadingUser) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8 max-w-4xl">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold font-headline text-blue-500 flex items-center gap-2"><Swords /> 竞技大厅</h1>
        <div className="flex items-center gap-3">
          <Badge variant="outline">活跃对局: {activeCount} / 30</Badge>
          <Button variant="ghost" onClick={() => router.push('/')}>返回</Button>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {players?.filter(p => p.id !== user?.uid).map(p => (
          <Card key={p.id} className="hover:border-blue-500 transition-all">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar><AvatarFallback>{p.displayName?.[0]}</AvatarFallback></Avatar>
                <div><p className="font-bold">{p.displayName}</p><p className="text-[10px] text-muted-foreground flex items-center gap-1"><Wifi className="h-2 w-2 text-green-500" /> 在线</p></div>
              </div>
              <Button size="sm" variant="outline" onClick={() => setInvitingPlayer({ id: p.id, name: p.displayName })}><UserPlus className="h-4 w-4" /></Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!invitingPlayer} onOpenChange={() => setInvitingPlayer(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>发起挑战</DialogTitle></DialogHeader>
          <p>确定要向 {invitingPlayer?.name} 发起一场 19x19 的中国规则对局吗？</p>
          <DialogFooter><Button variant="outline" onClick={() => setInvitingPlayer(null)}>取消</Button><Button onClick={handleInvite}>发送挑战书</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
