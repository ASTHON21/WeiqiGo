'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Icons } from '@/components/icons';
import { Play, Users, Disc, Swords, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

const LEVELS = [
  { id: 'AlphaGo_LeeSedol_G1', title: '人机大战第一局', desc: 'AlphaGo 首次击败李世石，见证历史。', difficulty: 'Hard' },
  { id: 'AlphaGo_Master_60_0', title: 'Master 连胜系列', desc: '横扫棋坛的 60 连胜经典对局。', difficulty: 'Extreme' },
  { id: 'AlphaGo_Self_Play_01', title: '神之对弈', desc: 'AlphaGo 两个版本的巅峰对决。', difficulty: 'Hard' },
];

export default function HomePage() {
  const router = useRouter();
  const [selectedLevel, setSelectedLevel] = useState(LEVELS[0].id);
  const [selfPlayColor, setSelfPlayColor] = useState<'black' | 'white'>('black');

  const startMirrorMatch = () => {
    router.push(`/game?mode=mirror&levelId=${selectedLevel}`);
  };

  const startSelfPlay = () => {
    router.push(`/game?mode=self&playerColor=${selfPlayColor}`);
  };

  const startPvP = () => {
    const randomColor = Math.random() > 0.5 ? 'black' : 'white';
    router.push(`/game?mode=pvp&playerColor=${randomColor}&isWaiting=true`);
  };

  return (
    <div className="min-h-screen bg-[url('https://images.unsplash.com/photo-1529697210530-8c4bb1358ce5?q=80&w=2070')] bg-cover bg-center">
      <div className="min-h-screen w-full bg-background/80 backdrop-blur-sm flex flex-col items-center justify-center p-6">
        <div className="max-w-4xl w-full space-y-8">
          <div className="text-center space-y-2">
            <h1 className="text-5xl font-bold font-headline tracking-tighter text-primary">SHADOW GO</h1>
            <p className="text-muted-foreground text-lg italic">“在阴影中寻找光芒，与 AlphaGo 穿越时空。”</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* 镜像对局 */}
            <Card className="border-2 hover:border-accent transition-all cursor-default">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <Play className="text-accent" />
                </div>
                <CardTitle>镜像关卡</CardTitle>
                <CardDescription>复刻 AlphaGo 经典棋谱，强制对齐训练。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">选择名局</label>
                  <div className="flex flex-col gap-2">
                    {LEVELS.map((lvl) => (
                      <button
                        key={lvl.id}
                        onClick={() => setSelectedLevel(lvl.id)}
                        className={cn(
                          "text-left p-2 rounded-md text-sm transition-colors border",
                          selectedLevel === lvl.id ? "bg-accent/10 border-accent" : "hover:bg-muted border-transparent"
                        )}
                      >
                        <div className="font-medium">{lvl.title}</div>
                        <div className="text-xs text-muted-foreground truncate">{lvl.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={startMirrorMatch}>
                  开始复刻
                </Button>
              </CardFooter>
            </Card>

            {/* 本地练棋 (原自对弈) */}
            <Card className="border-2 hover:border-primary transition-all">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Disc className="text-primary" />
                </div>
                <CardTitle>本地练棋</CardTitle>
                <CardDescription>自由落子，手动操控黑白双方，研究棋理。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 py-4">
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-muted-foreground uppercase">首手选择</label>
                  <div className="flex justify-center gap-4">
                    <button 
                      onClick={() => setSelfPlayColor('black')}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                        selfPlayColor === 'black' ? "border-primary bg-primary/5 scale-105" : "border-transparent opacity-50"
                      )}
                    >
                      <div className="w-10 h-10 rounded-full bg-black shadow-xl" />
                      <span className="text-xs font-bold">先手执黑</span>
                    </button>
                    <button 
                      onClick={() => setSelfPlayColor('white')}
                      className={cn(
                        "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                        selfPlayColor === 'white' ? "border-primary bg-primary/5 scale-105" : "border-transparent opacity-50"
                      )}
                    >
                      <div className="w-10 h-10 rounded-full bg-white border shadow-xl" />
                      <span className="text-xs font-bold">先手执白</span>
                    </button>
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="secondary" className="w-full" onClick={startSelfPlay}>
                  开始练习
                </Button>
              </CardFooter>
            </Card>

            {/* 玩家连线 (PvP) */}
            <Card className="border-2 hover:border-blue-500 transition-all">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                  <Users className="text-blue-500" />
                </div>
                <CardTitle>玩家连线</CardTitle>
                <CardDescription>在全球范围内寻找对手，实时对局博弈。</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col items-center justify-center h-[180px] text-center">
                <div className="p-4 rounded-full bg-blue-50/10 mb-4 animate-pulse">
                  <Swords className="h-12 w-12 text-blue-400" />
                </div>
                <p className="text-xs text-muted-foreground px-4">
                  进入后可发起“换子请求”。系统将为您匹配实力相近的对手。
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white" onClick={startPvP}>
                  进入大厅
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="flex justify-center gap-4 text-muted-foreground text-sm">
            <span className="flex items-center gap-1"><Info className="h-4 w-4" /> 棋盘规格: 19 x 19 标准</span>
            <span>|</span>
            <span className="flex items-center gap-1"><Icons.Logo className="h-4 w-4" /> AlphaGo 镜像系统 v1.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
