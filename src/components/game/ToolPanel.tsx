"use client";

import { Button } from "@/components/ui/button";
import { Swords, MessageCircle, RefreshCw, Calculator, SkipForward } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ToolPanelProps {
  onAnalysis?: () => void;
  onReset?: () => void;
  onScore?: () => void;
  onPass?: () => void; // 新增：弃权回调
  showChat?: boolean;
}

export function ToolPanel({ onAnalysis, onReset, onScore, onPass, showChat }: ToolPanelProps) {
  return (
    <Card className="border-2">
      <CardHeader className="py-3 bg-muted/30 border-b">
        <CardTitle className="text-sm font-bold">Game Tools</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {onPass && (
          <Button variant="outline" className="w-full justify-start gap-2" onClick={onPass}>
            <SkipForward className="h-4 w-4" /> 弃权 (Pass)
          </Button>
        )}
        {onScore && (
          <Button variant="outline" className="w-full justify-start gap-2 text-blue-600 border-blue-200 hover:bg-blue-50" onClick={onScore}>
            <Calculator className="h-4 w-4" /> 数子结算 (Score)
          </Button>
        )}
        {onAnalysis && (
          <Button variant="outline" className="w-full justify-start gap-2" onClick={onAnalysis}>
            <Swords className="h-4 w-4" /> 形势分析 (Analysis)
          </Button>
        )}
        {onReset && (
          <Button variant="outline" className="w-full justify-start gap-2" onClick={onReset}>
            <RefreshCw className="h-4 w-4" /> 重置 (Reset)
          </Button>
        )}
        {showChat && (
          <Button variant="secondary" className="w-full justify-start gap-2">
            <MessageCircle className="h-4 w-4" /> 聊天 (Chat)
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
