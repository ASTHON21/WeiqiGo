
"use client";

import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Disc, Swords, BookOpen } from 'lucide-react';

export default function GameEntryPage() {
  const router = useRouter();

  const modes = [
    {
      id: 'viewer',
      title: '名局阅览 (Viewer)',
      desc: '深入研究历史经典对局，通过复刻学习棋圣思路。',
      icon: <BookOpen className="h-8 w-8 text-accent" />,
      color: 'hover:border-accent',
      path: '/game/viewer'
    },
    {
      id: 'practice',
      title: '自对弈 (Practice)',
      desc: '本地自由落子练习，支持悔棋、研究变化。',
      icon: <Disc className="h-8 w-8 text-primary" />,
      color: 'hover:border-primary',
      path: '/game/practice'
    },
    {
      id: 'online',
      title: '玩家连线 (Online)',
      desc: '在线寻找对手，进行实时网络对战。',
      icon: <Swords className="h-8 w-8 text-blue-500" />,
      color: 'hover:border-blue-500',
      path: '/game/online/lobby'
    }
  ];

  return (
    <div className="min-h-screen bg-background p-6 flex flex-col items-center justify-center">
      <div className="max-w-4xl w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold font-headline tracking-tight">GO MASTER HUB</h1>
          <p className="text-muted-foreground mt-2 italic">选择您的博弈模式</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {modes.map(mode => (
            <Card key={mode.id} className={`border-2 transition-all cursor-pointer ${mode.color}`} onClick={() => router.push(mode.path)}>
              <CardHeader>
                <div className="mb-4">{mode.icon}</div>
                <CardTitle className="text-xl">{mode.title}</CardTitle>
                <CardDescription>{mode.desc}</CardDescription>
              </CardHeader>
              <CardFooter>
                <Button className="w-full" variant="secondary">进入模式</Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="flex justify-center gap-6 text-sm text-muted-foreground">
          <Button variant="link" onClick={() => router.push('/')} className="gap-2">
             返回主页
          </Button>
        </div>
      </div>
    </div>
  );
}
