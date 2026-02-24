
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, Swords, History, FileUp, Info, Users, Book, CheckCircle2, XCircle } from 'lucide-react';
import { getRulesContent } from '@/app/actions/sgf';
import { cn } from '@/lib/utils';

export default function HomePage() {
  const router = useRouter();
  const [practiceSize, setPracticeSize] = useState("19");
  const [acceptingInvites, setAcceptingInvites] = useState(true);
  const [rules, setRules] = useState("");

  useEffect(() => {
    getRulesContent().then(setRules);
  }, []);

  const handleStartPractice = () => {
    router.push(`/game/practice?size=${practiceSize}`);
  };

  const handleEnterLobby = () => {
    router.push(`/game/online/lobby?acceptInvites=${acceptingInvites}`);
  };

  return (
    <div className="min-h-screen bg-[url('https://images.unsplash.com/photo-1529697210530-8c4bb1358ce5?q=80&w=2070')] bg-cover bg-center">
      <div className="min-h-screen w-full bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center p-6">
        <div className="max-w-6xl w-full space-y-12">
          <div className="text-center space-y-4">
            <h1 className="text-7xl font-bold font-headline tracking-tighter text-primary">SHADOW GO</h1>
            <p className="text-muted-foreground text-xl italic font-medium">
              “博弈之间，见天地，见众生。”
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* 本地练棋卡片 */}
            <Card className="border-2 hover:border-primary transition-all shadow-xl flex flex-col">
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Play className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">本地练棋 (Practice)</CardTitle>
                <CardDescription>一人分饰两角，研磨定式，探索棋道变化。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 mt-auto">
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

            {/* SGF 导入查看卡片 */}
            <Card className="border-2 hover:border-accent transition-all shadow-xl flex flex-col">
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mb-4">
                  <FileUp className="h-8 w-8 text-accent" />
                </div>
                <CardTitle className="text-2xl">SGF 导入 (Viewer)</CardTitle>
                <CardDescription>上传 SGF 棋谱文件，线性查看对局进程，锁定交互。</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex items-center justify-center p-6">
                <p className="text-sm text-center text-muted-foreground">
                  支持 .sgf 格式。支持步进控制与重置，纯净阅览无干预。
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full h-12 text-lg font-bold border-accent text-accent hover:bg-accent hover:text-white" onClick={() => router.push('/game/viewer')}>
                  进入阅览
                </Button>
              </CardFooter>
            </Card>

            {/* 竞技大厅卡片 */}
            <Card className="border-2 hover:border-blue-500 transition-all shadow-xl flex flex-col">
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
                <CardTitle className="text-2xl">竞技大厅 (Lobby)</CardTitle>
                <CardDescription>查看实时在线玩家，发起对局挑战，或观摩名手对弈。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 mt-auto">
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant={acceptingInvites ? "default" : "outline"} 
                    className={cn("gap-2 h-11", acceptingInvites && "bg-green-600 hover:bg-green-700")}
                    onClick={() => setAcceptingInvites(true)}
                  >
                    <CheckCircle2 className="h-4 w-4" /> 接受邀请
                  </Button>
                  <Button 
                    variant={!acceptingInvites ? "default" : "outline"} 
                    className={cn("gap-2 h-11", !acceptingInvites && "bg-red-600 hover:bg-red-700")}
                    onClick={() => setAcceptingInvites(false)}
                  >
                    <XCircle className="h-4 w-4" /> 不接受邀请
                  </Button>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="secondary" className="w-full h-12 text-lg font-bold" onClick={handleEnterLobby}>
                  进入大厅
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="flex justify-center gap-8">
            <Button variant="ghost" onClick={() => router.push('/history')} className="gap-2">
              <History className="h-4 w-4" /> 历史记录
            </Button>
            
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <Info className="h-4 w-4" /> 规则说明
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Book className="h-5 w-5 text-accent" /> 中国围棋竞赛规则
                  </SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-100px)] mt-4 pr-4">
                  <div className="prose prose-sm dark:prose-invert">
                    <pre className="whitespace-pre-wrap font-sans text-sm p-4 bg-muted/30 rounded-lg border">
                      {rules || "正在加载规则..."}
                    </pre>
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </div>

          <div className="text-xs text-center text-muted-foreground opacity-50">
            Go Master Hub v2.0 · Powered by Firebase Studio
          </div>
        </div>
      </div>
    </div>
  );
}
