
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { GoBoard } from "@/components/game/GoBoard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Player, BoardState, Move, LevelData } from "@/lib/types";
import { GoLogic, createEmptyBoard } from "@/lib/go-logic";
import { getLevelData } from "@/app/actions/ai";
import { cn } from "@/lib/utils";
import { History, ArrowLeftRight, Loader2 } from "lucide-react";

export default function GameContainerPage() {
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode') || 'mirror';
  const levelId = searchParams.get('levelId') || 'AlphaGo_LeeSedol_G1';
  const initialPlayerColor = (searchParams.get('playerColor') as Player) || 'black';
  const isWaiting = searchParams.get('isWaiting') === 'true';

  const [level, setLevel] = useState<LevelData | null>(null);
  const [board, setBoard] = useState<BoardState>(createEmptyBoard(19));
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hint, setHint] = useState<{r: number, c: number} | null>(null);
  const [playerColor, setPlayerColor] = useState<Player>(initialPlayerColor);
  const [matchStatus, setMatchStatus] = useState<'waiting' | 'ready'>('ready');
  const { toast } = useToast();

  // 处理模式初始化
  useEffect(() => {
    async function init() {
      if (mode === 'mirror') {
        const data = await getLevelData(levelId);
        setLevel(data);
        let initBoard = createEmptyBoard(data.boardSize);
        data.handicaps.forEach(m => { initBoard[m.r][m.c] = m.player; });
        setBoard(initBoard);
      } else if (mode === 'pvp' && isWaiting) {
        setMatchStatus('waiting');
        // 模拟匹配过程
        setTimeout(() => setMatchStatus('ready'), 2500);
      }
      setIsLoading(false);
    }
    init();
  }, [mode, levelId, isWaiting]);

  const handleMove = useCallback((r: number, c: number) => {
    if (mode === 'mirror') {
      if (!level || currentStep >= level.moves.length) return;
      const expectedMove = level.moves[currentStep];
      if (GoLogic.validateMirrorMove({r, c}, expectedMove)) {
        const result = GoLogic.processMove(board, r, c, expectedMove.player);
        if (result.success) {
          setBoard(result.newBoard);
          setHint(null);
          const nextIndex = currentStep + 1;
          if (nextIndex < level.moves.length) {
            const aiMove = level.moves[nextIndex];
            setTimeout(() => {
              const aiResult = GoLogic.processMove(result.newBoard, aiMove.r, aiMove.c, aiMove.player);
              if (aiResult.success) {
                setBoard(aiResult.newBoard);
                setCurrentStep(nextIndex + 1);
              }
            }, 400);
          } else {
            setCurrentStep(nextIndex);
            toast({ title: "关卡完成！", description: "你完美复刻了 AlphaGo 的思路。" });
          }
        }
      } else {
        toast({ title: "路径错误", description: "这里的走法与棋谱不符。", variant: "destructive" });
      }
    } else {
      // 自对弈或PVP逻辑 (简化实现)
      const turn = currentStep % 2 === 0 ? 'black' : 'white';
      if (mode === 'pvp' && turn !== playerColor) return;
      
      const result = GoLogic.processMove(board, r, c, turn);
      if (result.success) {
        setBoard(result.newBoard);
        setCurrentStep(prev => prev + 1);
        
        // 模拟 AI 在自对弈模式下的响应
        if (mode === 'self' && turn === playerColor) {
           setTimeout(() => {
             // 简单的随机落子模拟 AI
             for(let i=0; i<19; i++) {
               for(let j=0; j<19; j++) {
                 if(result.newBoard[i][j] === null) {
                    const aiResult = GoLogic.processMove(result.newBoard, i, j, playerColor === 'black' ? 'white' : 'black');
                    if (aiResult.success) {
                      setBoard(aiResult.newBoard);
                      setCurrentStep(prev => prev + 2);
                      return;
                    }
                 }
               }
             }
           }, 800);
        }
      }
    }
  }, [mode, level, currentStep, board, playerColor, toast]);

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
        <p className="text-muted-foreground font-medium">正在初始化对局环境...</p>
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
          <p className="text-muted-foreground">正在为您寻找全球各地的围棋高手</p>
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
                {mode === 'mirror' ? '镜像复刻' : mode === 'pvp' ? '玩家连线' : '自对弈模式'}
              </Badge>
              {level && <Badge>{level.difficulty}</Badge>}
            </div>
            <CardTitle className="font-headline text-2xl">{level?.title || (mode === 'pvp' ? '在线对局' : '本地对抗')}</CardTitle>
            <CardDescription>{level?.description || '自由落子，磨炼棋艺。'}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {mode === 'mirror' && (
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span>对齐进度</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
                <p className="text-xs text-muted-foreground text-right mt-1">
                  步数: {currentStep} / {level?.totalSteps}
                </p>
              </div>
            )}
            
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border">
              <div className="flex items-center gap-3">
                <div className={cn("h-4 w-4 rounded-full border", currentTurn === 'black' ? "bg-black" : "bg-white")} />
                <span className="text-sm font-medium">{currentTurn === 'black' ? '黑方回合' : '白方回合'}</span>
              </div>
              <Badge variant="secondary">第 {currentStep + 1} 手</Badge>
            </div>

            {mode === 'pvp' && (
              <Alert className="bg-blue-500/5 border-blue-500/20">
                <AlertTitle className="text-blue-500 flex items-center gap-2">
                  <Users className="h-4 w-4" /> 玩家已连线
                </AlertTitle>
                <AlertDescription className="text-xs">
                  你当前执 <span className="font-bold underline">{playerColor === 'black' ? '黑' : '白'}</span> 子。
                </AlertDescription>
              </Alert>
            )}

            <div className="pt-2 space-y-2">
              {mode === 'mirror' && (
                <Button className="w-full" variant="secondary" onClick={() => level && setHint({r: level.moves[currentStep].r, c: level.moves[currentStep].c})}>
                  <Icons.Settings className="mr-2 h-4 w-4" /> 获取提示
                </Button>
              )}
              {mode === 'pvp' && (
                <Button className="w-full" variant="outline" onClick={requestSwap}>
                  <ArrowLeftRight className="mr-2 h-4 w-4" /> 请求换子
                </Button>
              )}
              <Button className="w-full" variant="ghost" onClick={() => window.location.href = '/'}>
                <Icons.Home className="mr-2 h-4 w-4" /> 返回首页
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <GoBoard 
          board={board} 
          onMove={handleMove} 
          disabled={mode === 'mirror' && level ? currentStep >= level.totalSteps : false}
          lastMove={currentStep > 0 && level ? level.moves[currentStep - 1] : null} 
          size={19}
          currentPlayer={currentTurn}
          isAiThinking={false}
        />
        {hint && (
          <div 
            className="absolute h-8 w-8 rounded-full border-4 border-yellow-400 border-dashed animate-pulse pointer-events-none"
            style={{
              top: `${(hint.r / 18) * 100}%`,
              left: `${(hint.c / 18) * 100}%`,
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
              <History className="h-5 w-5" /> 对局序列
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
             <div className="divide-y">
                {mode === 'mirror' && level ? (
                  level.moves.slice(0, currentStep + 10).map((m, i) => (
                    <div key={i} className={cn(
                      "flex items-center gap-3 p-3 text-sm transition-colors",
                      i < currentStep ? "bg-primary/5 opacity-40" : i === currentStep ? "bg-accent/10 font-bold" : "opacity-20"
                    )}>
                      <span className="font-mono text-xs w-6">{i + 1}.</span>
                      <div className={cn("w-3 h-3 rounded-full border", m.player === 'black' ? 'bg-black' : 'bg-white')} />
                      <span>{String.fromCharCode(m.c + 97).toUpperCase()}{19 - m.r}</span>
                      {i < currentStep && <Icons.Play className="ml-auto h-3 w-3 text-green-500" />}
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-20" />
                    <p>自由对弈中，棋谱序列将实时生成。</p>
                  </div>
                )}
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
