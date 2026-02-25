
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, Swords, History, FileUp, Info, Users, Book, CheckCircle2, XCircle, ShieldCheck, Languages, Moon, Sun, Bell } from 'lucide-react';
import { getRulesContent } from '@/app/actions/sgf';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/language-context';
import { useTheme } from '@/context/theme-context';

export default function HomePage() {
  const router = useRouter();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const [practiceSize, setPracticeSize] = useState("19");
  const [practiceRule, setPracticeRule] = useState("chinese");
  const [acceptingInvites, setAcceptingInvites] = useState(true);
  const [rules, setRules] = useState("");

  useEffect(() => {
    getRulesContent().then(setRules);
  }, []);

  const handleStartPractice = () => {
    router.push(`/game/practice?size=${practiceSize}&rule=${practiceRule}`);
  };

  const handleEnterLobby = () => {
    router.push(`/game/online/lobby?acceptInvites=${acceptingInvites}`);
  };

  const toggleLanguage = () => {
    setLanguage(language === 'zh' ? 'en' : 'zh');
  };

  const announcements = [
    {
      date: '2024-03-15',
      version: 'v2.1.0',
      content: language === 'zh' 
        ? '新增系统公告功能；优化在线对局的稳定性；修复了数子结算在部分极端局面下的偏差。' 
        : 'Added Announcements feature; optimized online match stability; fixed minor scoring inaccuracies in edge cases.'
    },
    {
      date: '2024-03-10',
      version: 'v2.0.5',
      content: language === 'zh' 
        ? '全面适配日韩规则（数目法）；增加历史记录导出 SGF 功能；UI 细节调整。' 
        : 'Full support for Japanese rules (Territory counting); added SGF export to history; UI polish.'
    },
    {
      date: '2024-03-01',
      version: 'v2.0.0',
      content: language === 'zh' 
        ? 'Weiqi Go 正式版发布。支持在线对弈、本地练棋及名局阅览模式。' 
        : 'Weiqi Go Official Release. Supports Online, Practice, and Viewer modes.'
    }
  ];

  return (
    <div className="min-h-screen bg-[url('https://images.unsplash.com/photo-1529697210530-8c4bb1358ce5?q=80&w=2070')] bg-cover bg-center">
      {/* Top Right Controls */}
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        {/* Theme Toggle */}
        <Button 
          variant="outline" 
          onClick={toggleTheme}
          className="rounded-full px-4 h-10 border-2 bg-background/80 backdrop-blur-sm gap-2 hover:bg-background transition-all"
        >
          {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          <span className="font-bold text-xs">{theme === 'dark' ? 'BK' : 'WH'}</span>
        </Button>

        {/* Language Toggle */}
        <Button 
          variant="outline" 
          onClick={toggleLanguage}
          className="rounded-full px-4 h-10 border-2 bg-background/80 backdrop-blur-sm gap-2 hover:bg-background transition-all"
        >
          <Languages className="h-4 w-4" />
          <span className="font-bold text-xs">{language === 'zh' ? 'EN' : 'ZH'}</span>
        </Button>
      </div>

      <div className="min-h-screen w-full bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center p-6">
        <div className="max-w-6xl w-full space-y-12">
          <div className="text-center space-y-4">
            <h1 className="text-7xl font-bold font-headline tracking-tighter text-primary">{t('home.title')}</h1>
            <p className="text-muted-foreground text-xl italic font-medium">
              {t('home.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* 本地练棋卡片 */}
            <Card className="border-2 hover:border-primary transition-all shadow-xl flex flex-col">
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <Play className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-2xl">{t('home.practice.title')}</CardTitle>
                <CardDescription>{t('home.practice.desc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 mt-auto">
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground text-center">{t('home.practice.size')}</p>
                  <Tabs value={practiceSize} onValueChange={setPracticeSize} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 h-9">
                      <TabsTrigger value="9" className="text-xs">9 x 9</TabsTrigger>
                      <TabsTrigger value="13" className="text-xs">13 x 13</TabsTrigger>
                      <TabsTrigger value="19" className="text-xs">19 x 19</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground text-center">{t('home.practice.rule')}</p>
                  <Tabs value={practiceRule} onValueChange={setPracticeRule} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 h-9">
                      <TabsTrigger value="chinese" className="text-xs gap-1">
                        <ShieldCheck className="h-3 w-3" /> {t('rules.chinese')}
                      </TabsTrigger>
                      <TabsTrigger value="territory" className="text-xs gap-1">
                        <Book className="h-3 w-3" /> {t('rules.territory')}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full h-12 text-lg font-bold" onClick={handleStartPractice}>
                  {t('home.practice.start')}
                </Button>
              </CardFooter>
            </Card>

            {/* SGF 导入查看卡片 */}
            <Card className="border-2 hover:border-accent transition-all shadow-xl flex flex-col">
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mb-4">
                  <FileUp className="h-8 w-8 text-accent" />
                </div>
                <CardTitle className="text-2xl">{t('home.viewer.title')}</CardTitle>
                <CardDescription>{t('home.viewer.desc')}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex items-center justify-center p-6">
                <p className="text-sm text-center text-muted-foreground">
                  {t('home.viewer.info')}
                </p>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full h-12 text-lg font-bold border-accent text-accent hover:bg-accent hover:text-white" onClick={() => router.push('/game/viewer')}>
                  {t('home.viewer.start')}
                </Button>
              </CardFooter>
            </Card>

            {/* 竞技大厅卡片 */}
            <Card className="border-2 hover:border-blue-500 transition-all shadow-xl flex flex-col">
              <CardHeader className="text-center">
                <div className="mx-auto w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mb-4">
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
                <CardTitle className="text-2xl">{t('home.online.title')}</CardTitle>
                <CardDescription>{t('home.online.desc')}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 mt-auto">
                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant={acceptingInvites ? "default" : "outline"} 
                    className={cn("gap-2 h-11", acceptingInvites && "bg-green-600 hover:bg-green-700")}
                    onClick={() => setAcceptingInvites(true)}
                  >
                    <CheckCircle2 className="h-4 w-4" /> {t('home.online.accept')}
                  </Button>
                  <Button 
                    variant={!acceptingInvites ? "default" : "outline"} 
                    className={cn("gap-2 h-11", !acceptingInvites && "bg-red-600 hover:bg-red-700")}
                    onClick={() => setAcceptingInvites(false)}
                  >
                    <XCircle className="h-4 w-4" /> {t('home.online.decline')}
                  </Button>
                </div>
              </CardContent>
              <CardFooter>
                <Button variant="secondary" className="w-full h-12 text-lg font-bold" onClick={handleEnterLobby}>
                  {t('home.online.start')}
                </Button>
              </CardFooter>
            </Card>
          </div>

          <div className="flex justify-center flex-wrap gap-8">
            <Button variant="ghost" onClick={() => router.push('/history')} className="gap-2">
              <History className="h-4 w-4" /> {t('home.history.btn')}
            </Button>
            
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <Bell className="h-4 w-4" /> {t('home.announcement.btn')}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5 text-primary" /> {t('home.announcement.title')}
                  </SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-100px)] mt-4 pr-4">
                  <div className="space-y-6">
                    {announcements.map((item, idx) => (
                      <div key={idx} className="p-4 rounded-lg bg-muted/30 border border-primary/10 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-primary">{item.version}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">{item.date}</span>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">
                          {item.content}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <Info className="h-4 w-4" /> {t('home.rules.btn')}
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[400px] sm:w-[540px]">
                <SheetHeader>
                  <SheetTitle className="flex items-center gap-2">
                    <Book className="h-5 w-5 text-accent" /> {t('home.rules.btn')}
                  </SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-100px)] mt-4 pr-4">
                  <div className="prose prose-sm dark:prose-invert">
                    <pre className="whitespace-pre-wrap font-sans text-sm p-4 bg-muted/30 rounded-lg border">
                      {rules || "Loading..."}
                    </pre>
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </div>

          <div className="text-xs text-center text-muted-foreground opacity-50">
            Weiqi Go Hub v2.1.0 · Powered by Firebase Studio
          </div>
        </div>
      </div>
    </div>
  );
}
