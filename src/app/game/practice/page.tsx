
"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { usePracticeGame } from '@/hooks/usePracticeGame';
import { GoBoard } from '@/components/game/GoBoard';
import { ToolPanel } from '@/components/game/ToolPanel';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { History, Swords, Book, Calculator, ShieldCheck, Trophy, Info, Lock, Save, Home, RefreshCw, Cpu, BrainCircuit } from 'lucide-react';
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
import { useEffect, useState, useMemo } from 'react';
import { getRulesContent } from '@/app/actions/sgf';
import { GoLogic } from '@/lib/go-logic';
import { MoveSetting, GameHistoryEntry, Player } from '@/lib/types';
import { useLanguage } from '@/context/language-context';
import { GoAiEngine, SearchNode } from '@/lib/ai/go-ai-engine';
import { AiSearchTree } from '@/components/game/AiSearchTree';

export default function PracticePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const size = parseInt(searchParams.get('size') || '19');
  const initialRule = (searchParams.get('rule') as 'chinese' | 'territory') || 'chinese';
  
  const practice = usePracticeGame(size);
  const { toast } = useToast();
  const { language } = useLanguage();
  
  const [ruleType] = useState<'chinese' | 'territory'>(initialRule);
  const [rules, setRules] = useState("");
  const [scoreResult, setScoreResult] = useState<any>(null);
  const [moveSetting, setMoveSetting] = useState<MoveSetting>('direct');
  const [isGameOver, setIsGameOver] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // AI 状态
  const [aiOpponent, setAiOpponent] = useState<Player | 'none'>('none');
  const [isThinking, setIsThinking] = useState(false);
  const [searchTree, setSearchTree] = useState<SearchNode | null>(null);
  const [evaluation, setEvaluation] = useState(0);

  const aiEngine = useMemo(() => new GoAiEngine(size), [size]);

  useEffect(() => {
    getRulesContent(ruleType, language).then(setRules);
  }, [ruleType, language]);

  // AI 回合监听
  useEffect(() => {
    if (!isGameOver && aiOpponent === practice.currentTurn && !isThinking) {
      setIsThinking(true);
      // 模拟思考延迟
      setTimeout(() => {
        const result = aiEngine.findBestMove(practice.board, practice.currentTurn, practice.moveHistory);
        setSearchTree(result.tree || null);
        setEvaluation(result.evaluation);
        
        if (result.r === -1) {
          handlePass();
        } else {
          practice.makeMove(result.r, result.c);
        }
        setIsThinking(false);
      }, 1000);
    }
  }, [practice.currentTurn, aiOpponent, isGameOver, practice.board, practice.moveHistory]);

  const handleMove = (r: number, c: number) => {
    if (isGameOver || isThinking) return;
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
    let result;
    if (ruleType === 'chinese') {
      result = GoLogic.calculateChineseScore(practice.board);
    } else {
      result = GoLogic.calculateJapaneseScore(practice.board, practice.prisoners.black, practice.prisoners.white);
    }
    
    setScoreResult({
      ...result,
      ruleName: ruleType === 'chinese' ? '中国规则' : '日韩规则'
    });
  };

  const handlePass = () => {
    if (isGameOver) return;
    const isConsecutivePass = practice.pass();
    if (isConsecutivePass) {
      setIsGameOver(true);
      toast({
        title: "对局结束",
        description: "双方连续弃权，对局已锁定并进入结算。",
      });
      handleScore();
    } else {
      toast({
        title: "已弃权",
        description: `${practice.currentTurn === 'black' ? '黑方' : '白方'}选择了弃权`,
      });
    }
  };

  const handleReset = () => {
    practice.reset();
    setIsGameOver(false);
    setScoreResult(null);
    setIsSaved(false);
    setSearchTree(null);
    setEvaluation(0);
  };

  const saveToLocalHistory = () => {
    if (!scoreResult || isSaved) return;

    const entry: GameHistoryEntry = {
      id: `practice-${Date.now()}`,
      date: new Date().toISOString(),
      mode: 'practice',
      boardSize: size,
      moveHistory: practice.moveHistory,
      result: {
        winner: scoreResult.winner,
        reason: '双方连续弃权',
        blackScore: scoreResult.blackScore,
        whiteScore: scoreResult.whiteScore,
        details: scoreResult.details,
        komi: scoreResult.komi,
        diff: scoreResult.diff
      }
    };

    try {
      const existing = JSON.parse(localStorage.getItem('goMasterHistory') || '[]');
      localStorage.setItem('goMasterHistory', JSON.stringify([entry, ...existing]));
      setIsSaved(true);
      toast({
        title: "保存成功",
        description: "本局记录已存入本地历史记录。",
      });
    } catch (e) {
      toast({
        title: "保存失败",
        description: "本地存储空间不足或其他错误。",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
         <div className="space-y-1">
           <h1 className="text-2xl font-bold flex items-center gap-2 text-primary">
             <Swords className="h-6 w-6" /> 本地练棋模式
             {isGameOver && <Badge variant="destructive" className="gap-1"><Lock className="h-3 w-3" /> 已锁定</Badge>}
           </h1>
           <p className="text-xs text-muted-foreground italic">当前规则：{ruleType === 'chinese' ? '中国规则 (数子法)' : '日韩规则 (数目法)'}</p>
         </div>
         <div className="flex flex-wrap items-center gap-3">
           {!isGameOver && (
             <div className={cn(
               "flex items-center gap-2 px-3 py-1 rounded-full border transition-all",
               isThinking ? "bg-accent/10 border-accent animate-pulse" : "bg-muted/50 border-transparent"
             )}>
               <div className={cn("w-3 h-3 rounded-full border transition-colors", practice.currentTurn === 'black' ? 'bg-black' : 'bg-white')} />
               <span className="text-sm font-bold">
                 {isThinking ? "AI 思考中..." : (practice.currentTurn === 'black' ? '黑方' : '白方')}
               </span>
             </div>
           )}
           <Badge variant="outline" className="font-mono">{size}x{size}</Badge>
           <Badge variant="secondary" className="gap-1">
              {ruleType === 'chinese' ? <ShieldCheck className="h-3 w-3" /> : <Book className="h-3 w-3" />}
              {ruleType === 'chinese' ? '中国规则' : '日韩规则'}
           </Badge>
         </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_350px] gap-8 items-start">
        <div className="flex flex-col items-center">
          <GoBoard 
            board={practice.board} 
            size={size} 
            onMove={handleMove}
            currentPlayer={practice.currentTurn}
            readOnly={isGameOver || isThinking}
            lastMove={practice.moveHistory.length > 0 ? practice.moveHistory[practice.moveHistory.length - 1] : null}
            moveSetting={moveSetting}
          />
        </div>

        <div className="space-y-6">
          <Card className="border-2 bg-muted/20">
            <CardHeader className="py-3 border-b bg-muted/30">
              <CardTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
                <BrainCircuit className="h-4 w-4 text-accent" /> AI 对手设定
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-3 gap-2">
               <Button 
                variant={aiOpponent === 'none' ? 'default' : 'outline'} 
                size="sm" 
                className="text-[10px]"
                onClick={() => setAiOpponent('none')}
                disabled={isThinking || isGameOver}
               >
                 无 AI
               </Button>
               <Button 
                variant={aiOpponent === 'white' ? 'default' : 'outline'} 
                size="sm" 
                className="text-[10px]"
                onClick={() => setAiOpponent('white')}
                disabled={isThinking || isGameOver}
               >
                 AI 执白
               </Button>
               <Button 
                variant={aiOpponent === 'black' ? 'default' : 'outline'} 
                size="sm" 
                className="text-[10px]"
                onClick={() => setAiOpponent('black')}
                disabled={isThinking || isGameOver}
               >
                 AI 执黑
               </Button>
            </CardContent>
          </Card>

          <AiSearchTree tree={searchTree} thinking={isThinking} evaluation={evaluation} />

          <ToolPanel 
            onReset={handleReset} 
            onPass={isGameOver || isThinking ? undefined : handlePass}
            moveSetting={isGameOver || isThinking ? undefined : moveSetting}
            onMoveSettingChange={setMoveSetting}
          />

          <Card className="border-2 h-[150px] flex flex-col">
            <CardHeader className="py-2 bg-muted/30 border-b">
              <CardTitle className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                <History className="h-3 w-3 text-primary" /> 棋谱步进
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              <ScrollArea className="h-full p-2">
                <div className="grid grid-cols-2 gap-2">
                  {practice.moveHistory.map((m, i) => (
                    <div key={i} className="flex items-center gap-2 p-1 text-[10px] border rounded bg-muted/10">
                      <span className="text-muted-foreground w-4 font-mono">{i + 1}.</span>
                      <div className={cn("w-1.5 h-1.5 rounded-full", m.player === 'black' ? 'bg-black' : 'bg-white border')} />
                      <span className="font-mono font-bold">
                        {m.r === -1 ? 'PASS' : `${String.fromCharCode(m.c + 97).toUpperCase()}${size - m.r}`}
                      </span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={!!scoreResult} onOpenChange={(open) => !open && setScoreResult(null)}>
        <AlertDialogContent className="max-w-md border-4 border-primary p-0 overflow-y-auto max-h-[95vh] shadow-2xl">
          <AlertDialogHeader className="bg-primary text-primary-foreground p-6 sticky top-0 z-10">
            <AlertDialogTitle className="flex items-center justify-center gap-2 text-xl font-headline uppercase tracking-tight">
              <Calculator className="h-6 w-6" /> {scoreResult?.ruleName} 结算报告
            </AlertDialogTitle>
          </AlertDialogHeader>
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-black/5 border-2 border-primary/10 text-center space-y-1">
                <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">黑方点数</p>
                <p className="text-4xl font-black text-foreground font-headline leading-none">{scoreResult?.blackScore?.toFixed(1)}</p>
              </div>
              <div className="p-4 rounded-xl bg-black/5 border-2 border-primary/10 text-center space-y-1">
                <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">白方点数</p>
                <p className="text-4xl font-black text-foreground font-headline leading-none">{scoreResult?.whiteScore?.toFixed(1)}</p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-blue-600/10 border-4 border-blue-600/20 text-center space-y-2">
              <p className="text-[11px] font-black text-blue-600 uppercase tracking-[0.2em]">最终胜负判定 (Komi: {scoreResult?.komi})</p>
              <h3 className="text-4xl font-black text-blue-800 font-headline">
                {scoreResult?.winner === 'black' ? '黑方胜' : '白方胜'} {ruleType === 'chinese' ? (scoreResult?.diff * 2).toFixed(1) : scoreResult?.diff.toFixed(1)} 目
              </h3>
            </div>
          </div>
          
          <AlertDialogFooter className="p-6 bg-muted/30 border-t flex-col sm:flex-row gap-3 sticky bottom-0 z-10">
            <div className="grid grid-cols-2 w-full gap-3">
              <Button variant="ghost" className="h-12 font-bold gap-2 border-2 hover:bg-background" onClick={() => router.push('/')}>
                <Home className="h-4 w-4" /> 主页
              </Button>
              <AlertDialogCancel className="h-12 font-bold border-2 m-0 bg-background" onClick={() => setScoreResult(null)}>
                返回棋盘
              </AlertDialogCancel>
            </div>
            <div className="grid grid-cols-2 w-full gap-3">
              <Button variant="outline" className="h-12 font-bold gap-2 border-2 border-blue-600 text-blue-700 hover:bg-blue-50" onClick={saveToLocalHistory} disabled={isSaved}>
                <Save className="h-4 w-4" /> {isSaved ? '已保存' : '保存记录'}
              </Button>
              <AlertDialogAction className="h-12 font-bold bg-primary hover:bg-primary/90 gap-2" onClick={handleReset}>
                <RefreshCw className="h-4 w-4" /> 重新开始
              </AlertDialogAction>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
