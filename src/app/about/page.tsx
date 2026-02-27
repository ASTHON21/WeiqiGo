"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ArrowLeft, Github, Globe, Mail, User, Info, Smartphone, Monitor, Database, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AboutPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [clickCount, setClickCount] = useState(0);

  const handleAdminTrigger = () => {
    const nextCount = clickCount + 1;
    setClickCount(nextCount);

    if (nextCount === 10) {
      setClickCount(0);
      const password = prompt("请输入项目经理管理员密码：");
      if (password === "ShadowGoAdmin888") {
        localStorage.setItem('tempPlayerId', 'PM-EXCLUSIVE-ID');
        localStorage.setItem('tempDisplayName', 'ASTHON SAM JUN AN (PM)');
        toast({
          title: "专属身份已激活",
          description: "欢迎回来，项目经理。正在重启会话...",
        });
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else if (password !== null) {
        toast({
          variant: "destructive",
          title: "认证失败",
          description: "密码错误，请联系技术支持。",
        });
      }
    }
  };

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
                我们致力于通过简洁、优雅的设计，结合强大的实时交互技术，为棋手提供一个纯粹的博弈空间。
              </p>
              
              <div className="bg-muted/30 p-4 rounded-lg border-l-4 border-accent">
                <h3 className="text-foreground font-bold flex items-center gap-2 mb-1">
                  <User 
                    className="h-4 w-4 text-accent cursor-pointer hover:scale-110 transition-transform" 
                    onClick={handleAdminTrigger}
                  /> 项目管理
                </h3>
                <p className="text-lg font-bold text-foreground">ASTHON SAM JUN AN</p>
                <p className="text-xs">Project Manager</p>
              </div>

              <div className="mt-8 space-y-4">
                <h3 className="text-foreground font-bold flex items-center gap-2">
                  <Info className="h-5 w-5 text-blue-500" /> 如何测试连线功能？
                </h3>
                <Alert className="bg-blue-500/5 border-blue-500/20">
                  <AlertTitle className="text-blue-600 font-bold">多开模拟测试指南</AlertTitle>
                  <AlertDescription className="space-y-2 mt-2">
                    <div className="flex items-start gap-2">
                      <Monitor className="h-4 w-4 mt-1 shrink-0" />
                      <p><strong>窗口 A (正常模式)</strong>: 进入竞技大厅，确保“接受邀请”开启。</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <Smartphone className="h-4 w-4 mt-1 shrink-0" />
                      <p><strong>窗口 B (无痕模式)</strong>: 打开另一个无痕窗口，这会为您分配一个新的独立棋手 ID。</p>
                    </div>
                    <p className="text-xs pt-2 border-t mt-2">
                      在任意窗口的“活跃棋手”列表中找到另一个账号，发送挑战即可。对局采用 <strong>WebRTC P2P</strong> 技术，落子几乎零延迟。
                    </p>
                  </AlertDescription>
                </Alert>
              </div>

              <h3 className="text-foreground font-bold mt-6 mb-2">核心技术特性</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li className="flex items-start gap-2">
                  <Zap className="h-4 w-4 text-yellow-500 mt-1 shrink-0" />
                  <span><strong>WebRTC P2P 对弈</strong>：基于对等网络技术，落子直接点对点传输。Firebase 仅作为信令中继，极大降低了对局延迟和后端开销。</span>
                </li>
                <li className="flex items-start gap-2">
                  <Database className="h-4 w-4 text-blue-500 mt-1 shrink-0" />
                  <span><strong>Cloud Firestore 数据库</strong>：使用 Google Cloud 的 NoSQL 数据库存储棋手档案、对局元数据及存在心跳。</span>
                </li>
                <li><strong>名局阅览</strong>：支持标准的 SGF/GIB 格式导入，线性复刻历史名局。</li>
                <li><strong>双重规则</strong>：全面支持**中国规则**（数子法）与**日韩规则**（数目法）。</li>
                <li><strong>持久身份</strong>：基于设备指纹的本地身份标识，刷新页面亦可延续博弈。</li>
              </ul>
            </div>

            <div className="pt-6 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col items-center p-4 rounded-lg bg-muted/30">
                <Globe className="h-6 w-6 text-accent mb-2" />
                <span className="text-xs font-bold">版本</span>
                <span className="text-sm">v2.1.0</span>
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
