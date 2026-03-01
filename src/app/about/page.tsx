
"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ArrowLeft, Github, Globe, Mail, User, Info, Database, Zap, Volume2, Settings2, Cpu } from "lucide-react";

export default function AboutPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background p-6 flex flex-col items-center justify-center">
      <div className="max-w-3xl w-full space-y-8">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.push('/')} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> 返回首页
          </Button>
          <h1 className="text-2xl font-bold font-headline">关于 WEIQI GO</h1>
        </div>

        <Card className="border-2 shadow-xl overflow-hidden">
          <CardHeader className="text-center pb-2 bg-muted/20 border-b">
            <CardTitle className="text-3xl font-headline text-primary">博弈之间，见天地</CardTitle>
            <p className="text-xs text-muted-foreground mt-2">v2.2.0 | 本地优先 · 极速同步 · 沉浸体验</p>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed">
              <p>
                <strong>WEIQI GO (弈道)</strong> 是一款秉持 **“本地优先 (Local-First)”** 理念设计的现代化围棋博弈平台。
                不同于传统的全服务端运算架构，我们将核心规则引擎部署于浏览器本地，确保了极致的响应速度与交互流畅度。
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-muted/30 p-4 rounded-lg border-l-4 border-accent">
                  <h3 className="text-foreground font-bold flex items-center gap-2 mb-1">
                    <User className="h-4 w-4 text-accent" /> 项目管理
                  </h3>
                  <p className="text-lg font-bold text-foreground">ASTHON SAM JUN AN</p>
                  <p className="text-[10px] uppercase tracking-wider">Project Manager & Architect</p>
                </div>
                <div className="bg-blue-500/5 p-4 rounded-lg border-l-4 border-blue-500">
                   <h3 className="text-blue-600 font-bold flex items-center gap-2 mb-1">
                    <Cpu className="h-4 w-4" /> 架构理念
                  </h3>
                  <p className="text-sm text-foreground">核心逻辑本地化，状态数据原子化。</p>
                  <p className="text-[10px] text-muted-foreground">旨在为用户提供独立、私密的博弈环境，并支持未来智能体集成。</p>
                </div>
              </div>

              <h3 className="text-foreground font-bold mt-8 mb-4 flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-blue-500" /> 核心功能演进
              </h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3 p-3 rounded-md bg-muted/20 border">
                  <Zap className="h-5 w-5 text-yellow-500 mt-1 shrink-0" />
                  <div>
                    <p className="font-bold text-foreground">原子化同步引擎</p>
                    <p className="text-xs text-muted-foreground">基于实时云端数据中转，支持断线重连与跨设备状态一致性。</p>
                  </div>
                </li>
                <li className="flex items-start gap-3 p-3 rounded-md bg-muted/20 border">
                  <Volume2 className="h-5 w-5 text-blue-500 mt-1 shrink-0" />
                  <div>
                    <p className="font-bold text-foreground">触感声学交互</p>
                    <p className="text-xs text-muted-foreground">内置高采样率木质落子撞击音效，还原棋石敲击棋盘的真实质感。</p>
                  </div>
                </li>
                <li className="flex items-start gap-3 p-3 rounded-md bg-muted/20 border">
                  <Database className="h-5 w-5 text-purple-500 mt-1 shrink-0" />
                  <div>
                    <p className="font-bold text-foreground">规则自适应引擎</p>
                    <p className="text-xs text-muted-foreground">动态识别中国与日韩竞赛规则，自动切换统计视图与胜负判定逻辑。</p>
                  </div>
                </li>
              </ul>
            </div>

            <div className="pt-6 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col items-center p-4 rounded-lg bg-muted/30">
                <Globe className="h-6 w-6 text-accent mb-2" />
                <span className="text-xs font-bold">当前状态</span>
                <span className="text-sm">稳定运行</span>
              </div>
              <div className="flex flex-col items-center p-4 rounded-lg bg-muted/30">
                <Info className="h-6 w-6 text-accent mb-2" />
                <span className="text-xs font-bold">规则集</span>
                <span className="text-sm">AS / TBC 适配</span>
              </div>
              <div className="flex flex-col items-center p-4 rounded-lg bg-muted/30">
                <Mail className="h-6 w-6 text-accent mb-2" />
                <span className="text-xs font-bold">联系反馈</span>
                <span className="text-sm">pm1my1sv@gmail.com</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground opacity-50">
          Built with Love & Geeks Spirit · Powered by Firebase Studio
        </p>
      </div>
    </div>
  );
}
