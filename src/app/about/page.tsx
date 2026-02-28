
"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ArrowLeft, Github, Globe, Mail, User, Info, Smartphone, Monitor, Database, Zap, Volume2, ShieldCheck } from "lucide-react";
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

        <Card className="border-2 shadow-xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-3xl font-headline text-primary">博弈之间，见天地</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed">
              <p>
                <strong>WEIQI GO (弈道)</strong> 是一款专为围棋爱好者打造的现代化交互平台。
                我们通过云端实时同步技术，结合纯物理规则引擎，为棋手提供极致稳定的博弈体验。
              </p>
              
              <div className="bg-muted/30 p-4 rounded-lg border-l-4 border-accent">
                <h3 className="text-foreground font-bold flex items-center gap-2 mb-1">
                  <User className="h-4 w-4 text-accent" /> 项目管理
                </h3>
                <p className="text-lg font-bold text-foreground">ASTHON SAM JUN AN</p>
                <p className="text-xs">Project Manager</p>
              </div>

              <div className="mt-8 space-y-4">
                <h3 className="text-foreground font-bold flex items-center gap-2">
                  <Info className="h-5 w-5 text-blue-500" /> 如何测试连线功能？
                </h3>
                <Alert className="bg-blue-500/5 border-blue-500/20">
                  <AlertTitle className="text-blue-600 font-bold">云端同步测试指南</AlertTitle>
                  <AlertDescription className="space-y-2 mt-2">
                    <div className="flex items-start gap-2">
                      <Monitor className="h-4 w-4 mt-1 shrink-0" />
                      <p><strong>窗口 A</strong>: 进入竞技大厅，系统将自动分配匿名身份，保持“接受邀请”开启。</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Smartphone className="h-4 w-4 mt-1 shrink-0" />
                      <p><strong>窗口 B (另一设备/无痕)</strong>: 找到对方发送挑战。对局状态将通过 <strong>Firestore Cloud Sync</strong> 实现原子化同步。</p>
                    </div>
                    <p className="text-xs pt-2 border-t mt-2">
                      本系统已彻底抛弃不稳定的 P2P 架构，采用 100% 可靠的云端数据中转，确保永不掉线。
                    </p>
                  </AlertDescription>
                </Alert>
              </div>

              <h3 className="text-foreground font-bold mt-6 mb-2">核心技术特性</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li className="flex items-start gap-2">
                  <Zap className="h-4 w-4 text-yellow-500 mt-1 shrink-0" />
                  <span><strong>云端实时同步</strong>：完全基于 Firestore 监听机制，支持断线重连与全平台对弈。</span>
                </li>
                <li className="flex items-start gap-2">
                  <ShieldCheck className="h-4 w-4 text-green-500 mt-1 shrink-0" />
                  <span><strong>AI 黑客级防御</strong>：集成了 Firebase 匿名身份认证与原子化安全规则，从根源阻断 AI 脚本的非法请求与数据篡改。</span>
                </li>
                <li className="flex items-start gap-2">
                  <Volume2 className="h-4 w-4 text-blue-500 mt-1 shrink-0" />
                  <span><strong>沉浸式音效</strong>：内置高品质木质落子撞击声，提供真实的棋盘交互反馈。</span>
                </li>
                <li className="flex items-start gap-2">
                  <Settings2 className="h-4 w-4 text-purple-500 mt-1 shrink-0" />
                  <span><strong>规则自适应 UI</strong>：根据中国规则或日韩规则自动调整界面，仅在必要时显示提子统计。</span>
                </li>
              </ul>
            </div>

            <div className="pt-6 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col items-center p-4 rounded-lg bg-muted/30">
                <Globe className="h-6 w-6 text-accent mb-2" />
                <span className="text-xs font-bold">版本</span>
                <span className="text-sm">v2.2.0</span>
              </div>
              <div className="flex flex-col items-center p-4 rounded-lg bg-muted/30">
                <Github className="h-6 w-6 text-accent mb-2" />
                <span className="text-xs font-bold">开源协议</span>
                <span className="text-sm">MIT License</span>
              </div>
              <div className="flex flex-col items-center p-4 rounded-lg bg-muted/30">
                <Mail className="h-6 w-6 text-accent mb-2" />
                <span className="text-xs font-bold">联系我们</span>
                <span className="text-sm">pm1my1sv@gmail.com</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground opacity-50">
          Powered by Firebase Studio & Next.js
        </p>
      </div>
    </div>
  );
}
import { Settings2 } from "lucide-react";
