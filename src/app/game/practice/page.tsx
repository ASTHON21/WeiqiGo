
"use client";

import { useSearchParams } from 'next/navigation';
import { usePracticeGame } from '@/hooks/usePracticeGame';
import { GoBoard } from '@/components/game/GoBoard';
import { ToolPanel } from '@/components/game/ToolPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, Swords, Book, Calculator, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useEffect, useState } from 'react';
import { getRulesContent } from '@/app/actions/sgf';
import { GoLogic } from '@/lib/go-logic';
import { MoveSetting } from '@/lib/types';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function PracticePage() {
  const searchParams = useSearchParams();
  const size = parseInt(searchParams.get('size') || '19');
  const practice = usePracticeGame(size);
  const { toast } = useToast();
  
  const [ruleType, setRuleType] = useState<'chinese' | 'territory'>('chinese');
  const [rules, setRules] = useState("");
  const [scoreResult, setScoreResult] = useState<any>(null);
  const [moveSetting, setMoveSetting] = useState<MoveSetting>('direct');

  // 当规则类型改变时加载文档
  useEffect(() => {
    getRulesContent(ruleType).then(setRules);
  }, [ruleType]);

  const handleMove = (r: number, c: number) => {
    const result = practice.makeMove(r, c);
    if (!result.success) {
      toast({
        title: "无效落子",
        description: result.error === 'ko' ? "禁止打劫！" : result.error === 'suicide' ? "禁止自杀！" : "该位置已有棋子。",
        variant: "destructive"
      });
    }
  };

  const handleScore = () => {
    // 目前逻辑主要基于中国规则数子，数目法主要展示文档指引
    const result = GoLogic.calculateScore(practice.board);
    setScoreResult({
      ...result,
      ruleName: ruleType === 'chinese' ? '中国规则' : '日韩规则'
    });
  };

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
         <div className="space-y-1">
           <h1 className="text-2xl font-bold flex items-center gap-2 text-primary">
             <Swords className="h-6 w-6" /> 本地练棋模式
           </h1>
           <p className="text-xs text-muted-foreground italic">当前使用：{ruleType === 'chinese' ? '中国规则 (数子法)' : '日韩规则 (数目法)'}</p>
         </div>
         <div className="flex flex-wrap items-center gap-3">
           <Tabs value={ruleType} onValueChange={(v) => setRuleType(v as any)} className="bg-muted/50 p-1 rounded-lg border">
              <TabsList className="h-8">
                <TabsTrigger value="chinese" className="text-xs gap-1">
                  <ShieldCheck className="h-3 w-3" /> 中国规则
                </TabsTrigger>
                <TabsTrigger value="territory" className="text-xs gap-1">
                  <Book className="h-3 w-3" /> 日韩规则
                </TabsTrigger>
              </TabsList>
           </Tabs>
           <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted/50 border">
             <div className={cn("w-3 h-3 rounded-full border transition-colors", practice.currentTurn === 'black' ? 'bg-black' : 'bg-white')} />
             <span className="text-sm font-bold">{practice.currentTurn === 'black' ? '黑方' : '白方'}</span>
           </div>
           <Badge variant="outline" className="font-mono">{size}x{size}</Badge>
         </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_350px] gap-8 items-start">
        <div className="flex flex-col items-center">
          <GoBoard 
            board={practice.board} 
            size={size} 
            onMove={handleMove}
            currentPlayer={practice.currentTurn}
            lastMove={practice.moveHistory.length > 0 ? practice.moveHistory[practice.moveHistory.length - 1] : null}
            moveSetting={moveSetting}
          />
        </div>

        <div className="space-y-6">
          <ToolPanel 
            onReset={practice.reset} 
            onScore={handleScore}
            onPass={practice.pass}
            moveSetting={moveSetting}
            onMoveSettingChange={setMoveSetting}
          />

          <Sheet>
            <SheetTrigger asChild>
              <Card className="border-2 cursor-pointer hover:bg-muted/50 transition-colors group">
                <CardContent className="p-4 flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <Book className="h-4 w-4 text-accent group-hover:scale-110 transition-transform" />
                      <span className="text-sm font-bold">查看当前规则指南</span>
                   </div>
                   <Badge variant="secondary" className="text-[10px]">
                     {ruleType === 'chinese' ? 'Area Scoring' : 'Territory Based'}
                   </Badge>
                </CardContent>
              </Card>
            </SheetTrigger>
            <SheetContent side="right" className="w-[400px] sm:w-[640px]">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Book className="h-5 w-5 text-accent" /> 
                  {ruleType === 'chinese' ? '中国围棋竞赛规则 (v2.0)' : '日韩规则目数计算法指南'}
                </SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(100vh-100px)] mt-4 pr-4">
                <div className="prose prose-sm dark:prose-invert">
                   <div className="p-4 bg-muted/30 rounded-lg border font-sans text-sm whitespace-pre-wrap leading-relaxed">
                     {rules}
                   </div>
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>

          <Card className="border-2 h-[320px] flex flex-col">
            <CardHeader className="py-3 bg-muted/30 border-b">
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="h-4 w-4 text-primary" /> 棋谱记录
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              <ScrollArea className="h-full p-2">
                <div className="grid grid-cols-2 gap-2">
                  {practice.moveHistory.map((m, i) => (
                    <div key={i} className="flex items-center gap-2 p-1.5 text-xs border rounded bg-muted/10 hover:bg-muted/20 transition-colors">
                      <span className="text-muted-foreground w-4 font-mono">{i + 1}.</span>
                      <div className={cn("w-2 h-2 rounded-full", m.player === 'black' ? 'bg-black' : 'bg-white border')} />
                      <span className="font-mono font-bold">
                        {m.r === -1 ? 'PASS' : `${String.fromCharCode(m.c + 97).toUpperCase()}${size - m.r}`}
                      </span>
                    </div>
                  ))}
                  {practice.moveHistory.length === 0 && (
                    <div className="col-span-2 text-center py-12 text-muted-foreground text-xs italic">
                      暂无落子记录
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={!!scoreResult} onOpenChange={(open) => !open && setScoreResult(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-xl">
              <Calculator className="h-6 w-6 text-blue-500" /> {scoreResult?.ruleName} 结算结果
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-black/5 border text-center space-y-1">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">黑方总得点</p>
                  <p className="text-3xl font-black">{scoreResult?.blackTotal}</p>
                </div>
                <div className="p-4 rounded-lg bg-black/5 border text-center space-y-1">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">白方总得点</p>
                  <p className="text-3xl font-black">{scoreResult?.whiteTotal}</p>
                </div>
              </div>
              <div className="p-4 rounded-lg bg-blue-500/5 border-2 border-blue-500/20 text-center">
                <p className="text-sm font-bold text-blue-600 mb-1">胜负判定 (含贴目 {scoreResult?.komi})</p>
                <h3 className="text-2xl font-black text-blue-700">
                  {scoreResult?.winner === 'black' ? '黑方胜' : '白方胜'} {scoreResult?.diff} 目
                </h3>
              </div>
              <p className="text-[10px] text-muted-foreground text-center italic">
                * 本次结算采用中国数子规则。{ruleType === 'territory' && '数目法请参考侧边栏手动核算。'}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setScoreResult(null)}>确认</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
