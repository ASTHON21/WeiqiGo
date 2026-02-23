
"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Icons } from '@/components/icons';
import { Play, BookOpen, Info } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[url('https://images.unsplash.com/photo-1529697210530-8c4bb1358ce5?q=80&w=2070')] bg-cover bg-center">
      <div className="min-h-screen w-full bg-background/85 backdrop-blur-md flex flex-col items-center justify-center p-6">
        <div className="max-w-4xl w-full text-center space-y-12">
          <div className="space-y-4">
            <h1 className="text-7xl font-bold font-headline tracking-tighter text-primary">SHADOW GO</h1>
            <p className="text-muted-foreground text-xl italic font-medium">
              “复刻棋圣逻辑，探寻博弈边界。”
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            <Button size="lg" className="h-16 px-10 text-lg gap-3 shadow-xl" onClick={() => router.push('/game')}>
              <Play className="h-6 w-6" /> 进入对局中心
            </Button>
            <Button size="lg" variant="outline" className="h-16 px-10 text-lg gap-3 border-2" onClick={() => router.push('/game/viewer')}>
              <BookOpen className="h-6 w-6" /> 名局深度阅览
            </Button>
          </div>

          <div className="pt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-xl bg-muted/10 border border-border/50 backdrop-blur-sm">
               <h3 className="font-bold text-lg mb-2 flex items-center justify-center gap-2"><Icons.Logo className="h-5 w-5 text-accent"/> 名局复刻</h3>
               <p className="text-sm text-muted-foreground">精准解析 SGF 棋谱，动态追踪 AlphaGo 历史性对局轨迹。</p>
            </div>
            <div className="p-6 rounded-xl bg-muted/10 border border-border/50 backdrop-blur-sm">
               <h3 className="font-bold text-lg mb-2 flex items-center justify-center gap-2"><Swords className="h-5 w-5 text-blue-500"/> 多维对弈</h3>
               <p className="text-sm text-muted-foreground">支持本地练棋与在线对战，集成中国围棋数子法竞赛规则。</p>
            </div>
            <div className="p-6 rounded-xl bg-muted/10 border border-border/50 backdrop-blur-sm">
               <h3 className="font-bold text-lg mb-2 flex items-center justify-center gap-2"><Info className="h-5 w-5 text-primary"/> 无损解析</h3>
               <p className="text-sm text-muted-foreground">基于 11 项核心 SGF 元数据，提供最完整的棋谱展示体验。</p>
            </div>
          </div>

          <div className="text-xs text-muted-foreground opacity-50">
            AlphaGo Mirror Architecture v2.0 · Powered by Firebase Studio
          </div>
        </div>
      </div>
    </div>
  );
}

import { Swords } from 'lucide-react';
