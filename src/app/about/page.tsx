"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ArrowLeft, Github, Globe, Mail } from "lucide-react";

export default function AboutPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background p-6 flex flex-col items-center justify-center">
      <div className="max-w-3xl w-full space-y-8">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => router.push('/')} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> 返回首页
          </Button>
          <h1 className="text-2xl font-bold font-headline">关于 SHADOW GO</h1>
        </div>

        <Card className="border-2 shadow-xl">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-3xl font-headline text-primary">博弈之间，见天地</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground leading-relaxed">
              <p>
                <strong>SHADOW GO (影中弈)</strong> 是一款专为围棋爱好者打造的现代化交互平台。
                我们致力于通过简洁、优雅的设计，结合强大的实时交互技术，为棋手提供一个纯粹的博弈空间。
              </p>
              
              <h3 className="text-foreground font-bold mt-6 mb-2">项目初衷</h3>
              <p>
                在快节奏的数字化时代，我们希望回归棋盘本身的宁静。无论是本地的潜心研磨，还是跨越网络的实时博弈，
                SHADOW GO 都旨在提供最流畅、最符合直觉的操作体验。
              </p>

              <h3 className="text-foreground font-bold mt-6 mb-2">核心特性</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>名局阅览</strong>：支持标准的 SGF 格式导入，线性复刻历史名局。</li>
                <li><strong>中国规则</strong>：严格遵循《中国围棋竞赛规则 (v2.0)》，支持自动数子结算。</li>
                <li><strong>会话身份</strong>：无需注册，基于 SessionStorage 的一次性身份，即开即弈。</li>
                <li><strong>竞技大厅</strong>：实时在线匹配与观战系统。</li>
              </ul>
            </div>

            <div className="pt-6 border-t grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col items-center p-4 rounded-lg bg-muted/30">
                <Globe className="h-6 w-6 text-accent mb-2" />
                <span className="text-xs font-bold">版本</span>
                <span className="text-sm">v2.0.0</span>
              </div>
              <div className="flex flex-col items-center p-4 rounded-lg bg-muted/30">
                <Github className="h-6 w-6 text-accent mb-2" />
                <span className="text-xs font-bold">开源协议</span>
                <span className="text-sm">MIT License</span>
              </div>
              <div className="flex flex-col items-center p-4 rounded-lg bg-muted/30">
                <Mail className="h-6 w-6 text-accent mb-2" />
                <span className="text-xs font-bold">联系我们</span>
                <span className="text-sm">support@shadowgo.io</span>
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
