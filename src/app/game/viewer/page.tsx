
"use client";

import { useState } from 'react';
import { SgfProcessor } from '@/lib/ai/sgf-processor';
import { GibProcessor } from '@/lib/ai/gib-processor';
import { LevelData } from '@/lib/types';
import { GoBoard } from '@/components/game/GoBoard';
import { SgfHeader } from '@/components/game/SgfHeader';
import { NavControls } from '@/components/game/NavControls';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSgfViewer } from '@/hooks/useSgfViewer';
import { FileUp, BookOpen, RotateCcw, ArrowLeft, FileCode, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function SgfViewerPage() {
  const [gameData, setGameData] = useState<LevelData | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();
    
    // 严格安全限制：文件不能超过 64KB (标准 SGF 通常 < 20KB)
    const MAX_SAFE_SIZE = 64 * 1024;
    if (file.size > MAX_SAFE_SIZE) {
      toast({
        variant: "destructive",
        title: "安全拒绝：文件过大",
        description: "为了系统安全，棋谱文件严禁超过 64KB。",
      });
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;

      // 深度防御：检查文件是否包含二进制特征 (防止伪装成 SGF 的木马)
      if (content.includes('\u0000') || /[\x00-\x08\x0B\x0C\x0E-\x1F]/.test(content)) {
        toast({
          variant: "destructive",
          title: "检测到非法内容",
          description: "该文件包含非文本特征，疑似伪装的二进制负载，解析已终止。",
        });
        e.target.value = '';
        return;
      }

      try {
        let data: LevelData;
        if (extension === 'gib') {
          data = GibProcessor.parse("uploaded", content);
        } else {
          data = SgfProcessor.parse("uploaded", content);
        }
        
        setGameData(data);
        toast({
          title: "安全导入成功",
          description: `已通过特征扫描并成功加载 ${extension?.toUpperCase()} 棋谱。`,
        });
      } catch (err: any) {
        console.error("棋谱解析安全异常:", err);
        toast({
          variant: "destructive",
          title: "解析失败",
          description: err.message || "文件结构不符合标准，已被安全引擎拦截。",
        });
      }
    };
    reader.readAsText(file);
  };

  const viewer = useSgfViewer(gameData || { id: '', metadata: {}, boardSize: 19, handicaps: [], moves: [], totalSteps: 0 });

  if (!gameData) {
    return (
      <div className="container mx-auto p-8 flex flex-col items-center justify-center min-h-[80vh] space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold font-headline">棋谱查看器 (SGF/GIB)</h1>
          <p className="text-muted-foreground">上传 .sgf 或 .gib 文件，支持步进查看与多尺寸棋盘自动适配。</p>
          <div className="flex items-center justify-center gap-2 text-[10px] text-green-600 font-bold bg-green-500/5 px-3 py-1 rounded-full border border-green-500/20">
            <ShieldCheck className="h-3 w-3" /> 静态内容特征扫描已启用
          </div>
        </div>
        
        <Card className="w-full max-w-md border-2 border-dashed bg-muted/20 hover:bg-muted/30 transition-colors cursor-pointer relative group">
          <label className="flex flex-col items-center justify-center p-12 cursor-pointer">
            <FileUp className="h-12 w-12 text-accent mb-4 group-hover:scale-110 transition-transform" />
            <span className="text-lg font-bold">点击选择文件</span>
            <span className="text-xs text-muted-foreground mt-1">支持受信任的 .sgf 和 .gib 格式</span>
            <input 
              type="file" 
              accept=".sgf,.gib" 
              className="hidden" 
              onChange={handleFileUpload}
            />
          </label>
        </Card>

        <div className="flex flex-col items-center gap-4">
          <Button variant="ghost" onClick={() => router.push('/')} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> 返回首页
          </Button>
          <div className="flex items-center gap-2 text-[9px] text-muted-foreground opacity-60">
            <AlertTriangle className="h-3 w-3" /> 仅支持解析纯文本格式，包含任何二进制指令的文件将被拒绝。
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setGameData(null)} className="gap-2">
          <RotateCcw className="h-4 w-4" /> 更换棋谱
        </Button>
        <h2 className="text-xl font-bold font-headline text-accent flex items-center gap-2">
          <FileCode className="h-5 w-5" /> 棋谱阅览模式
        </h2>
        <Button variant="ghost" size="sm" onClick={() => router.push('/')}>
          退出阅览
        </Button>
      </div>

      <SgfHeader metadata={viewer.metadata} />

      <div className="grid lg:grid-cols-[1fr_350px] gap-8 items-start">
        <div className="space-y-6 flex flex-col items-center">
          <div className="relative w-full max-w-[80vh]">
            <GoBoard 
              board={viewer.currentBoard} 
              size={gameData.boardSize} 
              readOnly={true}
              lastMove={viewer.lastMove}
            />
          </div>
          <Card className="w-full max-w-[80vh] border-2">
            <CardContent className="p-4">
              <NavControls 
                currentIndex={viewer.currentIndex} 
                totalSteps={viewer.totalSteps} 
                onNext={viewer.nextStep} 
                onPrev={viewer.prevStep}
                onReset={viewer.reset}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-2 h-[600px] flex flex-col">
            <CardHeader className="bg-muted/30 border-b py-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-accent" /> 棋谱详情与注解
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 overflow-hidden">
              <ScrollArea className="h-full p-4">
                <div className="space-y-4">
                   <div className="p-3 bg-accent/5 rounded-md border border-accent/10">
                      <p className="text-xs font-bold text-accent uppercase mb-1">当前进度</p>
                      <p className="text-sm">
                        第 {viewer.currentIndex} / {viewer.totalSteps} 手
                      </p>
                      {viewer.lastMove && (
                        <p className="text-xs text-muted-foreground mt-1">
                          最后落子: {String.fromCharCode(viewer.lastMove.c + 97).toUpperCase()}{gameData.boardSize - viewer.lastMove.r} ({viewer.lastMove.player === 'black' ? '黑' : '白'})
                        </p>
                      )}
                   </div>
                   
                   <div className="space-y-2">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {viewer.metadata.comment || "该棋谱暂无详细注解内容。"}
                      </p>
                   </div>

                   <div className="pt-4 border-t space-y-3">
                      <h4 className="text-xs font-bold uppercase text-muted-foreground">元数据信息</h4>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
                         <div><span className="text-muted-foreground">规则 (RU):</span> {viewer.metadata.rules || "N/A"}</div>
                         <div><span className="text-muted-foreground">贴目 (KM):</span> {viewer.metadata.komi || "N/A"}</div>
                         <div><span className="text-muted-foreground">地点 (PC):</span> {viewer.metadata.place || "N/A"}</div>
                         <div><span className="text-muted-foreground">日期 (DT):</span> {viewer.metadata.date || "N/A"}</div>
                      </div>
                   </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
