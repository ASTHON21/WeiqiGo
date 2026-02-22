"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { GoBoard } from "@/components/game/GoBoard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { Player, BoardState, LevelData, GameResult } from "@/lib/types";
import { GoLogic, createEmptyBoard } from "@/lib/go-logic";
import { getLevelData, getRulesContent } from "@/app/actions/ai";
import { cn } from "@/lib/utils";
import { History, ArrowLeftRight, Loader2, Users, LayoutGrid, BookOpen, Info, Flag, Swords } from "lucide-react";

export default function GameContainerPage() {
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode') || 'mirror';
  const levelId = searchParams.get('levelId') || 'AlphaGo_LeeSedol_G1';
  const initialPlayerColor = (searchParams.get('playerColor') as Player) || 'black';
  const isWaiting = searchParams.get('isWaiting') === 'true';
  const requestedBoardSize = parseInt(searchParams.get('boardSize') || '19');

  const [level, setLevel] = useState<LevelData | null>(null);
  const [boardSize, setBoardSize] = useState(requestedBoardSize);
  const [board, setBoard] = useState<BoardState>(createEmptyBoard(requestedBoardSize));
  const [boardHistory, setBoardHistory] = useState<BoardState[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hint, setHint] = useState<{r: number, c: number} | null>(null);
  const [playerColor, setPlayerColor] = useState<Player>(initialPlayerColor);
  const [matchStatus, setMatchStatus] = useState<'waiting' | 'ready'>('ready');
  const [rules, setRules] = useState<string>("");
  const [consecutivePasses, setConsecutivePasses] = useState(0);
  const [gameResult, setGameResult] = useState<GameResult | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    async function init() {
      const rulesContent = await getRulesContent();
      setRules(rulesContent);

      if (mode === 'mirror') {
        const data = await getLevelData(levelId);
        setLevel(data);
        setBoardSize(data.boardSize);
        let initBoard = createEmptyBoard(data.boardSize);
        data.handicaps.forEach(m => { initBoard[m.r][m.c] = m.player; });
        setBoard(initBoard);
      } else {
        setBoardSize(requestedBoardSize);
        setBoard(createEmptyBoard(requestedBoardSize));
        
        if (mode === 'pvp' && isWaiting) {
          setMatchStatus('waiting');
          setTimeout(() => setMatchStatus('ready'), 2500);
        }
      }
      setIsLoading(false);
    }
    init();
  }, [mode, levelId, isWaiting, initialPlayerColor, requestedBoardSize]);

  const handleEndGame = useCallback(() => {
    const score = GoLogic.calculateScore(board);
    setGameResult({
      winner: score.winner,
      reason: "双方弃权，终局数子",
      blackScore: score.blackTotal,
      whiteScore: score.whiteTotal
    });
    toast({
      title: "对局结束",
      description: `黑方 ${score.blackTotal} 子，白方 ${score.whiteTotal} 子（含贴目）。${score.winner === 'black' ? '黑胜' : '白胜'} ${score.diff.toFixed(1)} 目。`,
    });
  }, [board, toast]);

  const handlePass = useCallback(() => {
    const nextPasses = consecutivePasses + 1;
    setConsecutivePasses(nextPasses);
    setCurrentStep(prev => prev + 1);
    
    toast({ title: "弃权", description: `${currentStep % 2 === 0 ? '黑方' : '白方'}选择了弃权。` });

    if (nextPasses >= 2) {
      handleEndGame();
    }
  }, [consecutivePasses, currentStep, handleEndGame, toast]);

  const handleMove = useCallback((r: number, c: number) => {
    if (gameResult) return;
    const currentTurn = currentStep % 2 === 0 ? 'black' : 'white';

    if (mode === 'mirror') {
      if (!level || currentStep >= level.moves.length) return;
      const expectedMove = level.moves[currentStep];
      if (GoLogic.validateMirrorMove({r, c}, expectedMove)) {
        const result = GoLogic.processMove(board, r, c, expectedMove.player, boardHistory);
        if (result.success) {
          setBoardHistory(prev => [...prev, board]);
          setBoard(result.newBoard);
          setHint(null);
          setConsecutivePasses(0);
          const nextIndex = currentStep + 1;
          if (nextIndex < level.moves.length) {
            const aiMove = level.moves[nextIndex];
            setTimeout(() => {
              const aiResult = GoLogic.processMove(result.newBoard, aiMove.r, aiMove.c, aiMove.player, [...boardHistory, board, result.newBoard]);
              if (aiResult.success) {
                setBoardHistory(prev => [...prev, result.newBoard]);
                setBoard(aiResult.newBoard);
                setCurrentStep(nextIndex + 1);
              }
            }, 400);
          } else {
            setCurrentStep(nextIndex);
            toast({ title: "关卡完成！", description: "你完美复刻了 AlphaGo 的思路。" });
          }
        } else {
           toast({ title: "无效落子", description: result.error === 'ko' ? "打劫！请先在别处落子。" : "该位置无法落子。", variant: "destructive" });
        }
      } else {
        toast({ title: "路径错误", description: "这里的走法与棋谱不符。", variant: "destructive" });
      }
    } else {
      const result = GoLogic.processMove(board, r, c, currentTurn, boardHistory);
      if (result.success) {
        setBoardHistory(prev => [...prev, board]);
        setBoard(result.newBoard);
        setCurrentStep(prev => prev + 1);
        setConsecutivePasses(0);
      } else {
        toast({ title: "无效落子", description: result.error === 'ko' ? "打劫！请先在别处落子。" : result.error === 'suicide' ? "禁止自杀！此子落入后己方无气。" : "该位置无法落子。", variant: "destructive" });
      }
    }
  }, [mode, level, currentStep, board, boardHistory, toast, gameResult]);

  const requestSwap = () => {
    toast({ title: "换子请求已发送", description: "等待对方确认..." });
    setTimeout(() => {
      setPlayerColor(prev => prev === 'black' ? 'white' : 'black');
      toast({ title: "换子成功", description: `你现在执${playerColor === 'black' ? '白' : '黑'}子。` });
    }, 1500);
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">正在初始化棋局环境...</p>
      </div>
    );
  }

  if (mode === 'pvp' && matchStatus === 'waiting') {
    return (
      <div className="flex h-screen items-center justify-center flex-col gap-6 p-6">
        <div className="relative">
          <div className="h-24 w-24 rounded-full border-4 border-primary border-t-transparent animate-spin" />
          <Users className="absolute inset-0 m-auto h-8 w-8 text-primary" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">正在匹配对手...</h2>
          <p className="text-muted-foreground">正在寻找 {boardSize}x{boardSize} 棋局的对手</p>
        </div>
        <Button variant="ghost" onClick={() => window.history.back()}>取消匹配</Button>
      </div>
    );
  }

  const progress = level ? (currentStep / level.totalSteps) * 100 : 0;
  const currentTurn = currentStep % 2 === 0 ? 'black' : 'white';

  return (
    <div className="container mx-auto p-4 flex flex-col lg:flex-row gap-8 items-start justify-center">
      <div className="w-full lg:w-1/4 flex flex-col gap-4">
        <Card className="overflow-hidden border-2">
          <div className={cn("h-1.5 w-full", mode === 'mirror' ? "bg-accent" : mode === 'pvp' ? "bg-blue-500" : "bg-primary")} />
          <CardHeader>
            <div className="flex justify-between items-start">
              <Badge variant="outline" className="mb-2">
                {mode === 'mirror' ? '镜像复刻' : mode === 'pvp' ? '玩家连线' : '本地练棋'}
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                <LayoutGrid className="h-3 w-3" /> {boardSize}x{boardSize}
              </Badge>
            </div>
            <CardTitle className="font-headline text-2xl">{level?.title || (mode === 'pvp' ? '在线对局' : '本地练棋')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {gameResult ? (
              <div className="p-4 rounded-lg bg-accent/10 border border-accent text-center space-y-2">
                <Swords className="h-8 w-8 mx-auto text-accent" />
                <h3 className="font-bold text-lg">对局已终局</h3>
                <p className="text-sm">胜负已分：{gameResult.winner === 'black' ? '黑中盘胜' : '白中盘胜'}</p>
                <div className="flex justify-center gap-4 text-xs font-mono">
                  <span>黑: {gameResult.blackScore}</span>
                  <span>白: {gameResult.whiteScore}</span>
                </div>
              </div>
            ) : (
              <>
                {mode === 'mirror' && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>对齐进度</span>
                      <span>{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>
                )}
                
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
                  <div className="flex items-center gap-3">
                    <div className={cn("h-4 w-4 rounded-full border", currentTurn === 'black' ? "bg-black" : "bg-white", "animate-pulse")} />
                    <span className="text-sm font-medium">{currentTurn === 'black' ? '黑方落子' : '白方落子'}</span>
                  </div>
                  <Badge variant="secondary">第 {currentStep + 1} 手</Badge>
                </div>
              </>
            )}

            <div className="pt-2 space-y-2">
              {mode === 'mirror' && !gameResult && (
                <Button className="w-full" variant="secondary" onClick={() => level && setHint({r: level.moves[currentStep].r, c: level.moves[currentStep].c})}>
                  <Icons.Settings className="mr-2 h-4 w-4" /> 获取名局提示
                </Button>
              )}
              
              {!gameResult && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="w-full" variant="outline">
                      <Flag className="mr-2 h-4 w-4" /> 弃权 (Pass)
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>确认弃权？</AlertDialogTitle>
                      <AlertDialogDescription>
                        如果你认为当前局面已经无处可下，可以选择弃权。如果双方连续弃权，对局将结束并进入数子结算。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction onClick={handlePass}>确认弃权</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}

              {mode === 'pvp' && !gameResult && (
                <Button className="w-full" variant="outline" onClick={requestSwap}>
                  <ArrowLeftRight className="mr-2 h-4 w-4" /> 请求换子
                </Button>
              )}

              <Sheet>
                <SheetTrigger asChild>
                  <Button className="w-full" variant="secondary">
                    <BookOpen className="mr-2 h-4 w-4" /> 查阅竞赛规则
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[400px] sm:w-[540px]">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <Info className="h-5 w-5 text-accent" /> 中国围棋竞赛规则
                    </SheetTitle>
                    <SheetDescription>
                      版本：v2.0 | 适用范围：世界级赛事
                    </SheetDescription>
                  </SheetHeader>
                  <ScrollArea className="h-[calc(100vh-120px)] mt-6 pr-4">
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                        {rules}
                      </pre>
                    </div>
                  </ScrollArea>
                </SheetContent>
              </Sheet>

              <Button className="w-full" variant="ghost" onClick={() => window.location.href = '/'}>
                <Icons.Home className="mr-2 h-4 w-4" /> 返回主菜单
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <GoBoard 
          board={board} 
          onMove={handleMove} 
          disabled={!!gameResult || (mode === 'mirror' && level ? currentStep >= level.totalSteps : false)}
          lastMove={null} 
          size={boardSize}
          currentPlayer={currentTurn}
          isAiThinking={false}
        />
        {hint && (
          <div 
            className="absolute h-8 w-8 rounded-full border-4 border-yellow-400 border-dashed animate-pulse pointer-events-none"
            style={{
              top: `${(hint.r / (boardSize - 1)) * 100}%`,
              left: `${(hint.c / (boardSize - 1)) * 100}%`,
              transform: 'translate(-50%, -50%)',
              marginTop: '16px',
              marginLeft: '16px'
            }}
          />
        )}
      </div>

      <div className="w-full lg:w-1/4">
        <Card className="h-[600px] flex flex-col border-2">
          <CardHeader className="border-b bg-muted/20">
            <CardTitle className="text-xl flex items-center gap-2">
              <History className="h-5 w-5" /> 对局动态
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4">
             <div className="space-y-3">
                {mode === 'mirror' && level ? (
                  level.moves.slice(0, currentStep + 10).map((m, i) => (
                    <div key={i} className={cn(
                      "flex items-center gap-3 p-2 text-sm rounded transition-colors",
                      i < currentStep ? "bg-primary/5 opacity-40" : i === currentStep ? "bg-accent/10 font-bold border-l-4 border-accent" : "opacity-20"
                    )}>
                      <span className="font-mono text-xs w-6">{i + 1}.</span>
                      <div className={cn("w-3 h-3 rounded-full border", m.player === 'black' ? 'bg-black' : 'bg-white')} />
                      <span>{String.fromCharCode(m.c + 97).toUpperCase()}{boardSize - m.r}</span>
                      {i < currentStep && <Icons.Play className="ml-auto h-3 w-3 text-green-500" />}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-10 opacity-50">
                    <History className="h-10 w-10 mx-auto mb-2" />
                    <p className="text-xs">等待对局记录...</p>
                  </div>
                )}
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
