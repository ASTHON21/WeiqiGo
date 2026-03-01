
"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Play, Swords, History, FileUp, Info, Users, Book, CheckCircle2, XCircle, ShieldCheck, Languages, Moon, Sun, Bell, Settings2, Loader2, ArrowRight } from 'lucide-react';
import { getRulesContent } from '@/app/actions/sgf';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/language-context';
import { useTheme } from '@/context/theme-context';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, limit } from 'firebase/firestore';

export default function HomePage() {
  const router = useRouter();
  const { user, loading: loadingUser } = useUser();
  const db = useFirestore();
  const { language, setLanguage, t } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  
  const [practiceSize, setPracticeSize] = useState("19");
  const [practiceRule, setPracticeRule] = useState("chinese");
  const [acceptingInvites, setAcceptingInvites] = useState(true);
  
  const [ruleViewType, setRuleViewType] = useState<'chinese' | 'territory'>('chinese');
  const [rules, setRules] = useState("");

  // Monitor active games as Black
  const blackGamesQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, "games"),
      where("status", "==", "in-progress"),
      where("playerBlackId", "==", user.uid),
      limit(1)
    );
  }, [db, user?.uid]);

  // Monitor active games as White
  const whiteGamesQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, "games"),
      where("status", "==", "in-progress"),
      where("playerWhiteId", "==", user.uid),
      limit(1)
    );
  }, [db, user?.uid]);

  const { data: bGames } = useCollection(blackGamesQuery);
  const { data: wGames } = useCollection(whiteGamesQuery);

  const activeGame = useMemo(() => {
    const games = [...(bGames || []), ...(wGames || [])];
    return games.length > 0 ? games[0] : null;
  }, [bGames, wGames]);

  useEffect(() => {
    getRulesContent(ruleViewType, language).then(setRules);
  }, [ruleViewType, language]);

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
      date: '2026-02-28',
      version: 'v2.2.1',
      content: language === 'zh' 
        ? '在线对局新增“弃权(Pass)”与“认输(Resign)”功能；优化了结算弹窗在小屏设备上的显示。' 
        : 'Added "Pass" and "Resign" features to online games; optimized settlement dialogs for small screens.'
    },
    {
      date: '2026-02-25',
      version: 'v2.2.0',
      content: language === 'zh' 
        ? '新增对局状态锁定机制；集成落子音效；增强了棋谱导入功能的安全性。' 
        : 'Added game state locking; integrated move sound effects; enhanced security for SGF imports.'
    },
    {
      date: '2026-02-10',
      version: 'v2.0.5',
      content: language === 'zh' 
        ? '全面适配日韩规则（数目法）；增加历史记录导出 SGF 功能。' 
        : 'Full support for Japanese rules; added SGF export to history.'
    }
  ];

  return (
    <div className="min-h-screen bg-[url('https://images.unsplash.com/photo-1529697210530-8c4bb1358ce5?q=80&w=2070')] bg-cover bg-center">
      {/* Top Controls */}
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        <Button 
          variant="outline" 
          onClick={toggleTheme}
          className="rounded-full px-4 h-10 border-2 bg-background/80 backdrop-blur-sm gap-2 hover:bg-background transition-all"
        >
          {theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          <span className="font-bold text-xs">{theme === 'dark' ? 'BK' : 'WH'}</span>
        </Button>

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

          <div className="flex justify-center">
            {loadingUser ? (
              <div className="flex flex-col items-center gap-4 py-12">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-muted-foreground font-bold">校验节点身份...</p>
              </div>
            ) : activeGame ? (
              <Card className="max-w-2xl w-full border-4 border-blue-600 shadow-2xl bg-blue-600/5 animate-in zoom-in-95 duration-300">
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
                    <Swords className="h-10 w-10 text-white animate-pulse" />
                  </div>
                  <CardTitle className="text-3xl font-black font-headline text-blue-700">正在对局中 (ACTIVE GAME)</CardTitle>
                  <CardDescription className="text-lg font-medium">您有一个正在进行中的云端博弈。为了确保同步一致性，请先完成此局。</CardDescription>
                </CardHeader>
                <CardContent className="p-8">
                   <div className="grid grid-cols-2 gap-6">
                      <div className="bg-background/80 p-4 rounded-xl border-2 border-blue-500/20 text-center space-y-1">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">棋盘规模</p>
                        <p className="text-2xl font-black">{activeGame.boardSize} x {activeGame.boardSize}</p>
                      </div>
                      <div className="bg-background/80 p-4 rounded-xl border-2 border-blue-500/20 text-center space-y-1">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">竞技对手</p>
                        <p className="text-2xl font-black truncate">
                          {user?.uid === activeGame.playerBlackId ? activeGame.playerWhiteName : activeGame.playerBlackName}
                        </p>
                      </div>
                   </div>
                </CardContent>
                <CardFooter className="p-8 pt-0">
                  <Button 
                    className="w-full h-16 text-xl font-black bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/30 gap-3"
                    onClick={() => router.push(`/game/online/${activeGame.id}`)}
                  >
                    返回对局页面 <ArrowRight className="h-6 w-6" />
                  </Button>
                </CardFooter>
              </Card>
            ) : (
              <div className="grid md:grid-cols-3 gap-8 w-full">
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
            )}
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
              <SheetContent side="right" className="w-full sm:max-w-[540px]">
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
              <SheetContent side="right" className="w-full md:max-w-[90vw] lg:max-w-[1200px]">
                <SheetHeader className="space-y-4">
                  <SheetTitle className="flex items-center gap-2">
                    <Book className="h-5 w-5 text-accent" /> {t('home.rules.btn')}
                  </SheetTitle>
                  <Tabs value={ruleViewType} onValueChange={(val) => setRuleViewType(val as 'chinese' | 'territory')} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="chinese" className="gap-2">
                        <ShieldCheck className="h-4 w-4" /> {language === 'zh' ? '中国规则 (ZH-AS)' : 'Chinese Rules (EN-AS)'}
                      </TabsTrigger>
                      <TabsTrigger value="territory" className="gap-2">
                        <Book className="h-4 w-4" /> {language === 'zh' ? '日韩规则 (ZH-TBC)' : 'Japanese Rules (EN-TBC)'}
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-160px)] mt-4 pr-4">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <pre className="whitespace-pre-wrap font-sans text-sm p-4 md:p-8 bg-muted/30 rounded-lg border leading-relaxed break-words">
                      {rules || "Loading..."}
                    </pre>
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </div>

          <div className="text-xs text-center text-muted-foreground opacity-50">
            Weiqi Go Hub v2.2.1 · Powered by Firebase Studio
          </div>
        </div>
      </div>
    </div>
  );
}
