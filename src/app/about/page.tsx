
"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ArrowLeft, Github, Globe, Mail, User, Info, Smartphone, Monitor, Database, Zap, Volume2, ShieldCheck, Settings2, Cpu, Lock } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
            <p className="text-xs text-muted-foreground mt-2">v2.2.0 | 本地优先 · 云端同步 · 隐私受控</p>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed">
              <p>
                <strong>WEIQI GO (弈道)</strong> 是一款秉持 **“本地优先 (Local-First)”** 理念设计的现代化围棋博弈平台。
                不同于传统的服务端运算架构，我们将核心物理规则引擎部署在您的浏览器本地，仅利用云端进行状态同步，确保了极致的响应速度与隐私掌控。
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
                  <p className="text-sm text-foreground">核心逻辑本地化，数据云端原子化。</p>
                  <p className="text-[10px] text-muted-foreground">兼容个人 AI 代理 (如 OpenClaw) 的自动化集成愿景。</p>
                </div>
              </div>

              <div className="mt-8 space-y-4">
                <h3 className="text-foreground font-bold flex items-center gap-2">
                  <Info className="h-5 w-5 text-blue-500" /> 如何进行分布式博弈测试？
                </h3>
                <Alert className="bg-blue-500/5 border-blue-500/20">
                  <AlertTitle className="text-blue-600 font-bold">云端同步测试指南</AlertTitle>
                  <AlertDescription className="space-y-2 mt-2">
                    <div className="flex items-start gap-2">
                      <Monitor className="h-4 w-4 mt-1 shrink-0" />
                      <p><strong>设备 A</strong>: 进入竞技大厅，开启“接受邀请”。</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Smartphone className="h-4 w-4 mt-1 shrink-0" />
                      <p><strong>设备 B</strong>: 找到 A 并发起挑战。对局状态通过 <strong>Firestore Cloud Sync</strong> 实现秒级同步。</p>
                    </div>
                    <p className="text-xs pt-2 border-t mt-2">
                      我们采用 Firebase 匿名认证系统，确保每个节点都有唯一标识，同时杜绝了 AI 脚本的非法注入。
                    </p>
                  </AlertDescription>
                </Alert>
              </div>

              <h3 className="text-foreground font-bold mt-6 mb-2">核心技术演进</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li className="flex items-start gap-2">
                  <Lock className="h-4 w-4 text-red-500 mt-1 shrink-0" />
                  <span><strong>AI 盾牌防御</strong>：集成 Firebase Auth 与状态机校验，从物理层阻断 AI 自动化篡改对局结果。</span>
                </li>
                <li className="flex items-start gap-2">
                  <Zap className="h-4 w-4 text-yellow-500 mt-1 shrink-0" />
                  <span><strong>原子化同步引擎</strong>：彻底抛弃不稳定的 P2P 架构，采用 100% 可靠的云端数据中转，支持断线重连。</span>
                </li>
                <li className="flex items-start gap-2">
                  <Volume2 className="h-4 w-4 text-blue-500 mt-1 shrink-0" />
                  <span><strong>触感音效</strong>：内置高品质木质落子撞击声，强化物理交互的真实感。</span>
                </li>
                <li className="flex items-start gap-2">
                  <Settings2 className="h-4 w-4 text-purple-500 mt-1 shrink-0" />
                  <span><strong>规则自适应</strong>：根据竞赛规则（中国/日韩）动态调整 UI 统计，减少信息冗余。</span>
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
                <Github className="h-6 w-6 text-accent mb-2" />
                <span className="text-xs font-bold">安全等级</span>
                <span className="text-sm">加固 (Hardened)</span>
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
