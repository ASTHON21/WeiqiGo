
"use client";

import { Button } from "@/components/ui/button";
import { Undo2, Swords, MessageCircle, RefreshCw, Calculator } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ToolPanelProps {
  onUndo?: () => void;
  onAnalysis?: () => void;
  onReset?: () => void;
  onScore?: () => void; // 新增：数子功能回调
  showChat?: boolean;
}

export function ToolPanel({ onUndo, onAnalysis, onReset, onScore, showChat }: ToolPanelProps) {
  return (
    <Card className="border-2">
      <CardHeader className="py-3 bg-muted/30 border-b">
        <CardTitle className="text-sm font-bold">Game Tools</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {onUndo && (
          <Button variant="outline" className="w-full justify-start gap-2" onClick={onUndo}>
            <Undo2 className="h-4 w-4" /> 悔棋 (Undo)
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
