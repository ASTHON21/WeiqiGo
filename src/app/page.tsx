
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Icons } from '@/components/icons';
import { Play, Swords, Info, History } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function HomePage() {
  const router = useRouter();
  const [practiceSize, setPracticeSize] = useState("19");
  const [onlineSize, setOnlineSize] = useState("19");

  const handleStartPractice = () => {
    router.push(`/game/practice?size=${practiceSize}`);
  };

  const handleStartOnline = () => {
    router.push(`/game/online/lobby?size=${onlineSize}`);
  };

  return (
    <div className="min-h-screen bg-[url('https://images.unsplash.com/photo-1529697210530-8c4bb1358ce5?q=80&w=2070')] bg-cover bg-center">
      <div className="min-h-screen w-full bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center p-6">
        <div className="max-w-5xl w-full space-y-12">
          <div className="text-center space-y-4">
            <h1 className="text-7xl font-bold font-headline tracking-tighter text-primary">SHADOW GO</h1>
            <p className="text-muted-foreground text-xl italic font-medium">
              “博弈之间，见天地，见众生。”
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {/* 本地练棋卡片 */}
            <Card className="border-2 hover:border-primary transition-all shadow-xl">
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Play className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">本地练棋 (Practice)</CardTitle>
                <CardDescription>一人分饰两角，研磨定式，探索棋道变化。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase text-muted-foreground text-center">选择棋盘尺寸</p>
                  <Tabs value={practiceSize} onValueChange={setPracticeSize} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="9">9 x 9</TabsTrigger>
                      <TabsTrigger value="13">13 x 13</TabsTrigger>
                      <TabsTrigger value="19">19 x 19</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full h-12 text-lg font-bold" onClick={handleStartPractice}>
                  开始对局
                </Button>
              </CardFooter>
            </Card>

            {/* 玩家连线卡片 */}
            <Card className="border-2 hover:border-blue-500 transition-all shadow-xl">
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
                  <Swords className="h-8 w-8 text-blue-500" />
                </div>
                <CardTitle className="text-2xl">玩家连线 (Online)</CardTitle>
                <CardDescription>寻找实时对手，在标准的竞技规则下分出胜负。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase text-muted-foreground text-center">选择棋盘尺寸</p>
                  <Tabs value={onlineSize} onValueChange={setOnlineSize} className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="9">9 x 9</TabsTrigger>
                      <TabsTrigger value="13">13 x 13</TabsTrigger>
                      <TabsTrigger value="19">19 x 19</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="secondary" className="w-full h-12 text-lg font-bold" onClick={handleStartOnline}>
                  进入大厅
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="flex justify-center gap-8">
            <Button variant="ghost" onClick={() => router.push('/history')} className="gap-2">
              <History className="h-4 w-4" /> 历史对局
            </Button>
            <Button variant="ghost" className="gap-2">
              <Info className="h-4 w-4" /> 竞技规则
            </Button>
          </div>

          <div className="text-xs text-center text-muted-foreground opacity-50">
            AlphaGo Mirror Architecture v2.0 · Powered by Firebase Studio
          </div>
        </div>
      </div>
    </div>
  );
}
