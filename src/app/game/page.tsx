"use client";

import { useState, useEffect, useCallback } from "react";
import { GoBoard } from "@/components/game/GoBoard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { Player, BoardState, Move, LevelData } from "@/lib/types";
import { GoLogic, createEmptyBoard } from "@/lib/go-logic";
import { getLevelData } from "@/app/actions/ai";
import { cn } from "@/lib/utils";

export default function MirrorGamePage() {
  const [level, setLevel] = useState<LevelData | null>(null);
  const [board, setBoard] = useState<BoardState>(createEmptyBoard(19));
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hint, setHint] = useState<{r: number, c: number} | null>(null);
  const { toast } = useToast();

  // 初始化加载关卡
  useEffect(() => {
    async function load() {
      const data = await getLevelData("AlphaGo_Classic_01");
      setLevel(data);
      
      // 处理预摆棋子
      let initBoard = createEmptyBoard(data.boardSize);
      data.handicaps.forEach(m => {
        initBoard[m.r][m.c] = m.player;
      });
      setBoard(initBoard);
      setIsLoading(false);
    }
    load();
  }, []);

  const handleMove = useCallback((r: number, c: number) => {
    if (!level || currentStep >= level.moves.length) return;

    const expectedMove = level.moves[currentStep];
    
    // 校验落子
    if (GoLogic.validateMirrorMove({r, c}, expectedMove)) {
      // 玩家落子成功
      const result = GoLogic.processMove(board, r, c, expectedMove.player);
      if (result.success) {
        setBoard(result.newBoard);
        setHint(null);
        
        // 如果还有下一步且是 AI 的回合 (简化逻辑：玩家走一步 AI 跟一步)
        const nextIndex = currentStep + 1;
        if (nextIndex < level.moves.length) {
          const aiMove = level.moves[nextIndex];
          setTimeout(() => {
            const aiResult = GoLogic.processMove(result.newBoard, aiMove.r, aiMove.c, aiMove.player);
            if (aiResult.success) {
              setBoard(aiResult.newBoard);
              setCurrentStep(nextIndex + 1);
            }
          }, 300);
        } else {
          setCurrentStep(nextIndex);
          toast({ title: "关卡完成！", description: "你完美复刻了 AlphaGo 的思路。" });
        }
      }
    } else {
      toast({ 
        title: "路径错误", 
        description: "这里的走法与 AlphaGo 的棋谱不符，请重新思考。", 
        variant: "destructive" 
      });
    }
  }, [level, currentStep, board, toast]);

  const showHint = () => {
    if (!level || currentStep >= level.moves.length) return;
    const target = level.moves[currentStep];
    setHint({ r: target.r, c: target.c });
  };

  if (isLoading || !level) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Icons.Logo className="animate-spin h-10 w-10 text-primary" />
      </div>
    );
  }

  const progress = (currentStep / level.totalSteps) * 100;

  return (
    <div className="container mx-auto p-4 flex flex-col lg:flex-row gap-8 items-start justify-center">
      <div className="w-full lg:w-1/4 flex flex-col gap-4">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <Badge variant="outline" className="mb-2">镜像关卡</Badge>
              <Badge>{level.difficulty}</Badge>
            </div>
            <CardTitle className="font-headline text-2xl">{level.title}</CardTitle>
            <CardDescription>{level.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>对齐进度</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground text-right mt-1">
                步数: {currentStep} / {level.totalSteps}
              </p>
            </div>
            
            <div className="pt-4 space-y-2">
              <Button className="w-full" variant="secondary" onClick={showHint}>
                <Icons.Settings className="mr-2 h-4 w-4" /> 获取提示
              </Button>
              <Button className="w-full" variant="outline" onClick={() => window.location.reload()}>
                <Icons.Undo className="mr-2 h-4 w-4" /> 重置关卡
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">导师评语</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm italic text-muted-foreground">
              {currentStep === 0 ? "观察局面，黑棋应该如何占领要点？" : "很好，这一步完全符合 AlphaGo 的计算。"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="relative">
        <GoBoard 
          board={board} 
          onMove={handleMove} 
          disabled={currentStep >= level.totalSteps}
          lastMove={currentStep > 0 ? level.moves[currentStep - 1] : null} 
          size={level.boardSize}
          currentPlayer={currentStep < level.moves.length ? level.moves[currentStep].player : 'black'}
          isAiThinking={false}
        />
        {hint && (
          <div 
            className="absolute h-8 w-8 rounded-full border-4 border-yellow-400 border-dashed animate-pulse pointer-events-none"
            style={{
              top: `${(hint.r / (level.boardSize - 1)) * 100}%`,
              left: `${(hint.c / (level.boardSize - 1)) * 100}%`,
              transform: 'translate(-50%, -50%)',
              marginTop: '16px', // 补偿 GoBoard 的 p-4
              marginLeft: '16px'
            }}
          />
        )}
      </div>

      <div className="w-full lg:w-1/4">
        <Card className="h-[600px] flex flex-col">
          <CardHeader>
            <CardTitle className="text-xl">对局序列</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto">
             <div className="space-y-2">
                {level.moves.slice(0, currentStep + 5).map((m, i) => (
                  <div key={i} className={cn(
                    "flex items-center gap-2 p-2 rounded-md text-sm",
                    i < currentStep ? "bg-primary/10 opacity-60" : i === currentStep ? "bg-accent/20 ring-1 ring-accent" : "opacity-30"
                  )}>
                    <span className="font-mono text-xs w-6">{i + 1}.</span>
                    <div className={cn("w-3 h-3 rounded-full border", m.player === 'black' ? 'bg-black' : 'bg-white')} />
                    <span>落子于 ({m.r}, {m.c})</span>
                    {i < currentStep && <Icons.Play className="ml-auto h-3 w-3 text-green-500" />}
                  </div>
                ))}
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
