
"use client";

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Swords, Users, PlayCircle, Loader2, UserPlus, Trophy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function OnlineLobbyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultSize = parseInt(searchParams.get('size') || '19');
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  // 获取在线玩家 (此处模拟，实际开发中需通过 heartbeat 维护 onlineProfiles)
  const usersQuery = useMemoFirebase(() => query(collection(db, "userProfiles")), [db]);
  const { data: onlinePlayers, isLoading: loadingPlayers } = useCollection(usersQuery);

  // 获取进行中的对局用于观战
  const liveGamesQuery = useMemoFirebase(() => 
    query(collection(db, "games"), where("status", "==", "in-progress")), [db]);
  const { data: liveGames, isLoading: loadingGames } = useCollection(liveGamesQuery);

  const handleInvite = async (targetUserId: string, targetName: string) => {
    if (!user) return;
    
    try {
      const gameRef = await addDoc(collection(db, "games"), {
        playerBlackId: user.uid,
        playerWhiteId: targetUserId,
        status: 'pending',
        boardSize: defaultSize,
        currentTurn: 'black',
        startedAt: serverTimestamp(),
        komi: 7.5,
        handicap: 0,
      });
      
      toast({
        title: "已发送邀请",
        description: `正在等待 ${targetName} 接受对局请求...`,
      });
      
      router.push(`/game/online/${gameRef.id}`);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "邀请失败",
        description: "无法发起对局邀请，请稍后重试。",
      });
    }
  };

  const handleSpectate = (gameId: string) => {
    router.push(`/game/online/${gameId}?mode=spectate`);
  };

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-8 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold font-headline tracking-tight text-blue-500 flex items-center gap-3">
            <Swords className="h-10 w-10" /> 竞技大厅
          </h1>
          <p className="text-muted-foreground italic">实时在线对局与社交中心</p>
        </div>
        <Button variant="outline" onClick={() => router.push('/')}>返回主页</Button>
      </div>

      <Tabs defaultValue="players" className="w-full">
        <TabsList className="grid w-full max-w-md grid-cols-2 h-12 mb-6">
          <TabsTrigger value="players" className="gap-2">
            <Users className="h-4 w-4" /> 在线玩家
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
                  <CardContent className="h-24" />
                </Card>
              ))
            ) : onlinePlayers?.filter(p => p.id !== user?.uid).map((player) => (
              <Card key={player.id} className="border-2 hover:border-blue-500/50 transition-all group">
                <CardContent className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 border-2 border-primary">
                      <AvatarFallback>{player.displayName?.[0] || 'U'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-bold text-lg">{player.displayName}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[10px]">9 Dan</Badge>
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span className="text-[10px] text-muted-foreground">在线</span>
                      </div>
                    </div>
                  </div>
                  <Button size="icon" variant="ghost" className="group-hover:bg-blue-500 group-hover:text-white transition-colors" onClick={() => handleInvite(player.id, player.displayName)}>
                    <UserPlus className="h-5 w-5" />
                  </Button>
                </CardContent>
              </Card>
            )) || <div className="col-span-full text-center py-12 text-muted-foreground">暂无其他玩家在线</div>}
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
                    <span className="text-[10px] font-mono font-bold text-blue-600">IN PROGRESS</span>
                  </div>
                  <CardContent className="p-6 flex-1 flex flex-col justify-center items-center gap-4">
                    <div className="flex items-center gap-6">
                      <div className="text-center space-y-2">
                         <div className="w-10 h-10 rounded-full bg-black mx-auto ring-2 ring-offset-2 ring-black/10" />
                         <p className="text-xs font-bold truncate max-w-[80px]">Player 1</p>
                      </div>
                      <div className="text-xl font-bold text-muted-foreground">VS</div>
                      <div className="text-center space-y-2">
                         <div className="w-10 h-10 rounded-full bg-white border mx-auto ring-2 ring-offset-2 ring-black/10" />
                         <p className="text-xs font-bold truncate max-w-[80px]">Player 2</p>
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
    </div>
  );
}
