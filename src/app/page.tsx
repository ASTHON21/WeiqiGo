"use client";

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Swords, FileUp, Users, CheckCircle2, XCircle, Languages, Moon, Sun, Loader2, ArrowRight, Flag, ShieldCheck, Book } from 'lucide-react';
import { getRulesContent } from '@/app/actions/sgf';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/context/language-context';
import { useTheme } from '@/context/theme-context';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

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
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  const activeGamesQuery = useMemoFirebase(() => {
    if (!db || !user?.uid) return null;
    return query(
      collection(db, "games"),
      where("status", "==", "in-progress")
    );
  }, [db, user?.uid]);

  const { data: allActiveGames } = useCollection(activeGamesQuery);

  const activeGame = useMemo(() => {
    if (!allActiveGames || !user) return null;
    return allActiveGames.find(g => g.playerBlackId === user.uid || g.playerWhiteId === user.uid) || null;
  }, [allActiveGames, user]);

  useEffect(() => {
    if (hasMounted) {
      getRulesContent(ruleViewType, language).then(setRules);
    }
  }, [ruleViewType, language, hasMounted]);

  const handleStartPractice = () => {
    router.push(`/game/practice?size=${practiceSize}&rule=${practiceRule}`);
  };

  const handleEnterLobby = () => {
    router.push(`/game/online/lobby`);
  };

  const handleResignActiveGame = async (gameId: string) => {
    if (!db || !user || !activeGame) return;
    const isBlack = user.uid === activeGame.playerBlackId;
    const winner = isBlack ? 'white' : 'black';
    try {
      await updateDoc(doc(db, "games", gameId), {
        status: 'finished',
        finishedAt: serverTimestamp(),
        result: {
          winner,
          reason: '用户从主页主动终结',
          diff: 0,
          komi: activeGame.komi || (activeGame.rules === 'chinese' ? 3.75 : 6.5)
        }
      });
    } catch (error) {
      console.error("Resign failed:", error);
    }
  };

  const toggleLanguage = () => {
    setLanguage(language === 'zh' ? 'en' : 'zh');
  };

  if (!hasMounted) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-[url('https://images.unsplash.com/photo-1529697210530-8c4bb1358ce5?q=80&w=2070')] bg-cover bg-center">
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
                <CardFooter className="p-8 pt-0 flex flex-col gap-4">
                  <Button 
                    className="w-full h-16 text-xl font-black bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/30 gap-3"
                    onClick={() => router.push(`/game/online/${activeGame.id}`)}
                  >
                    返回对局页面 <ArrowRight className="h-6 w-6" />
                  </Button>
                  <Button 
                    variant="outline"
                    className="w-full h-12 border-2 border-destructive text-destructive hover:bg-destructive hover:text-white font-bold gap-2 transition-all"
                    onClick={() => handleResignActiveGame(activeGame.id)}
                  >
                    <Flag className="h-4 w-4" /> 认输并终止对局
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
                  </CardHeader>
                  <CardContent className="flex-1 flex items-center justify-center p-6 text-center text-sm text-muted-foreground">
                    {t('home.viewer.info')}
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

          <div className="text-xs text-center text-muted-foreground opacity-50">
            Weiqi Go Hub v1.0.5 · Powered by Firebase Studio
          </div>
        </div>
      </div>
    </div>
  );
}
