
"use client";

import { GoBoard } from '@/components/game/GoBoard';
import { ToolPanel } from '@/components/game/ToolPanel';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Swords, Loader2 } from 'lucide-react';

export default function OnlineGamePage() {
  return (
    <div className="container mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
         <h1 className="text-2xl font-bold flex items-center gap-2 text-blue-500">
           <Swords className="h-6 w-6" /> 在线对局
         </h1>
         <div className="flex items-center gap-3">
           <Badge variant="outline" className="animate-pulse flex items-center gap-1 border-blue-500 text-blue-500">
             <div className="w-2 h-2 rounded-full bg-blue-500" /> 实时同步中
           </Badge>
         </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_350px] gap-8 items-start">
        <div className="flex flex-col items-center">
          <div className="w-full max-w-[80vh] aspect-square bg-muted/20 rounded-lg flex items-center justify-center border-4 border-dashed border-muted">
             <div className="text-center space-y-4">
                <Loader2 className="h-10 w-10 animate-spin text-blue-500 mx-auto" />
                <p className="text-muted-foreground font-medium">正在建立 Socket.io 安全隧道...</p>
             </div>
          </div>
        </div>

        <div className="space-y-6">
          <Card className="border-2">
            <CardHeader className="py-3 bg-blue-500/10 border-b">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" /> 对局选手
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                   <div className="w-8 h-8 rounded-full bg-black border-2 border-white shadow-sm" />
                   <span className="text-sm font-bold">Player 1 (You)</span>
                 </div>
                 <Badge>Black</Badge>
              </div>
              <div className="flex items-center justify-between opacity-50">
                 <div className="flex items-center gap-2">
                   <div className="w-8 h-8 rounded-full bg-white border-2 border-black shadow-sm" />
                   <span className="text-sm font-bold">Waiting...</span>
                 </div>
                 <Badge variant="secondary">White</Badge>
              </div>
            </CardContent>
          </Card>

          <ToolPanel showChat={true} onAnalysis={() => {}} />
        </div>
      </div>
    </div>
  );
}
