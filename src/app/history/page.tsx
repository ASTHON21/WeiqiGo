
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GameHistoryEntry } from '@/lib/types';
import { format } from 'date-fns';
import { Download, Trash2, Cloud, Monitor, Swords, Disc, BookOpen, ArrowLeft, History } from 'lucide-react';
import { exportToSGF } from '@/lib/sgf';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { cn } from '@/lib/utils';
import { Icons } from '@/components/icons';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

export default function HistoryPage() {
  const router = useRouter();
  const [localHistory, setLocalHistory] = useState<GameHistoryEntry[]>([]);
  const { toast } = useToast();
  const { user } = useUser();
  const db = useFirestore();

  // Load from LocalStorage
  useEffect(() => {
    try {
        const storedHistory = localStorage.getItem('goMasterHistory');
        if (storedHistory) {
          setLocalHistory(JSON.parse(storedHistory));
        }
    } catch (error) {
        console.error("Failed to parse localStorage history:", error);
    }
  }, []);

  // REAL USE: Load from Firestore (Optional Cloud Sync)
  // Only execute query when user is authenticated to avoid permission errors
  const gamesQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(collection(db, "games"), orderBy("startedAt", "desc"));
  }, [db, user]);
  
  const { data: cloudHistory, isLoading: isCloudLoading } = useCollection<any>(gamesQuery);

  // Map cloud games to history entry format if needed and merge
  const displayHistory = [
    ...localHistory, 
    ...(cloudHistory || []).map(g => ({
      ...g,
      date: g.startedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      mode: 'online' as const
    }))
  ].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const handleExport = (game: GameHistoryEntry) => {
    try {
      const sgfData = exportToSGF(game);
      const blob = new Blob([sgfData], { type: 'application/x-go-sgf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `WEIQI_GO_${game.mode}_${format(new Date(game.date), 'yyyyMMdd_HHmm')}.sgf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: '导出成功', description: `棋谱已下载为 SGF 格式。` });
    } catch (error) {
      toast({ title: '导出失败', description: '生成 SGF 时出错。', variant: 'destructive' });
    }
  };
  
  const handleClearLocalHistory = () => {
    localStorage.removeItem('goMasterHistory');
    setLocalHistory([]);
    toast({ title: '本地历史已清空', description: '您的浏览器本地缓存已清理。' });
  }

  const renderWinnerBadge = (game: GameHistoryEntry) => {
    const winner = game.result?.winner;
    if (winner && winner !== 'draw') {
        const isBlack = winner === 'black';
        return (
            <Badge variant={isBlack ? 'default' : 'outline'} className={cn(isBlack ? 'bg-black text-white' : 'bg-white text-black border-black/50')}>
                <Icons.Stone className={cn("w-3 h-3 mr-1.5", isBlack ? 'fill-white' : 'fill-black stroke-white stroke-[2px]')} />
                {winner === 'black' ? '黑方胜' : '白方胜'}
            </Badge>
        );
    }
    if (winner === 'draw') return <Badge variant="secondary">平局</Badge>;
    return <Badge variant="outline">无结果</Badge>;
  }

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'practice': return <Disc className="h-4 w-4 text-primary" />;
      case 'online': return <Swords className="h-4 w-4 text-blue-500" />;
      case 'viewer': return <BookOpen className="h-4 w-4 text-accent" />;
      default: return <Monitor className="h-4 w-4" />;
    }
  };

  return (
    <div className="container mx-auto max-w-4xl p-4 md:p-8 space-y-8">
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <Button variant="ghost" onClick={() => router.push('/')} className="gap-2 mb-2">
            <ArrowLeft className="h-4 w-4" /> 返回首页
          </Button>
          <h1 className="text-3xl font-bold font-headline flex items-center gap-3">
            对局历史记录
            {cloudHistory && cloudHistory.length > 0 && (
              <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/20">
                <Cloud className="w-3 h-3 mr-1"/> 已同步
              </Badge>
            )}
          </h1>
          <p className="text-muted-foreground italic">
            本页显示您在当前设备手动保存的棋谱以及在线对局记录。
          </p>
        </div>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm" disabled={localHistory.length === 0} className="gap-2">
              <Trash2 className="h-4 w-4" /> 清空本地历史
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确定要清空吗？</AlertDialogTitle>
              <AlertDialogDescription>这将永久移除本设备上的所有手动保存记录，此操作不可撤销。</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>取消</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearLocalHistory}>确认清空</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {(isCloudLoading || (user === null)) && displayHistory.length === 0 ? (
        <div className="flex justify-center p-24">
          <Icons.Logo className="animate-spin h-10 w-10 text-accent" />
        </div>
      ) : displayHistory.length > 0 ? (
        <div className="grid gap-6">
            {displayHistory.map((game) => (
                <Card key={game.id} className="border-2 hover:border-accent/50 transition-all group">
                    <CardHeader className="flex flex-row items-center justify-between pb-4 space-y-0 bg-muted/20">
                        <div className="flex items-center gap-4">
                            <div className="p-2 rounded-lg bg-background border-2">
                               {getModeIcon(game.mode)}
                            </div>
                            <div className="flex flex-col">
                                <span className="font-mono text-sm font-bold">{format(new Date(game.date), 'yyyy/MM/dd HH:mm')}</span>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
                                  <span>{game.boardSize}x{game.boardSize} 棋盘</span>
                                  <span>·</span>
                                  <span className="capitalize">{game.mode === 'online' ? '在线挑战' : (game.mode === 'practice' ? '本地练棋' : '阅览器')}</span>
                                </div>
                            </div>
                        </div>
                        {renderWinnerBadge(game)}
                    </CardHeader>
                    <CardContent className="pt-6 pb-6 border-b">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                            <div className="space-y-1">
                                <p className="text-[10px] uppercase font-bold text-muted-foreground">终止原因</p>
                                <p className="font-medium">{game.result?.reason || '手动保存'}</p>
                            </div>
                            <div className="flex justify-between md:justify-end gap-8 font-mono">
                                <div className="text-center">
                                   <p className="text-[10px] uppercase font-bold text-muted-foreground">黑方得分</p>
                                   <p className="text-xl font-black">{game.result?.blackScore?.toFixed(1) ?? 'N/A'}</p>
                                </div>
                                <div className="text-center">
                                   <p className="text-[10px] uppercase font-bold text-muted-foreground">白方得分</p>
                                   <p className="text-xl font-black">{game.result?.whiteScore?.toFixed(1) ?? 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="flex justify-between items-center bg-muted/5 py-3 px-6">
                        <span className="text-[10px] text-muted-foreground italic flex items-center gap-1">
                          <Icons.Logo className="h-3 w-3" /> WEIQI GO Record System v2.1.0
                        </span>
                        <Button variant="secondary" size="sm" onClick={() => handleExport(game)} className="gap-2 group-hover:bg-accent group-hover:text-white transition-colors">
                            <Download className="h-4 w-4" /> 导出 SGF
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
      ) : (
        <Card className="flex flex-col items-center justify-center p-24 text-center border-2 border-dashed bg-muted/10">
            <CardHeader>
                <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <History className="h-8 w-8 text-muted-foreground opacity-30" />
                </div>
                <CardTitle className="text-xl">暂无历史记录</CardTitle>
                <CardDescription className="max-w-xs mx-auto">
                  完成对局并点击“保存记录”后，您的精彩瞬间将出现在这里。
                </CardDescription>
            </CardHeader>
            <CardFooter>
               <Button onClick={() => router.push('/')}>开始第一局</Button>
            </CardFooter>
        </Card>
      )}
    </div>
  );
}
