
"use client";

import { Button } from "@/components/ui/button";
import { Swords, MessageCircle, RefreshCw, Calculator, SkipForward, Settings2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MoveSetting } from "@/lib/types";

interface ToolPanelProps {
  onAnalysis?: () => void;
  onReset?: () => void;
  onScore?: () => void;
  onPass?: () => void;
  showChat?: boolean;
  moveSetting?: MoveSetting;
  onMoveSettingChange?: (setting: MoveSetting) => void;
}

export function ToolPanel({ 
  onAnalysis, 
  onReset, 
  onScore, 
  onPass, 
  showChat,
  moveSetting = 'direct',
  onMoveSettingChange
}: ToolPanelProps) {
  return (
    <Card className="border-2">
      <CardHeader className="py-3 bg-muted/30 border-b">
        <CardTitle className="text-sm font-bold">Game Tools</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {onMoveSettingChange && (
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase text-muted-foreground flex items-center gap-1">
              <Settings2 className="h-3 w-3" /> 落子设定
            </p>
            <Select value={moveSetting} onValueChange={(v) => onMoveSettingChange(v as MoveSetting)}>
              <SelectTrigger className="w-full h-9 text-xs">
                <SelectValue placeholder="选择落子方式" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="direct">直接落子</SelectItem>
                <SelectItem value="confirm">确认落子 (弹窗)</SelectItem>
                <SelectItem value="double-click">双击落子</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="space-y-2">
          {onPass && (
            <Button variant="outline" className="w-full justify-start gap-2 h-9 text-xs" onClick={onPass}>
              <SkipForward className="h-4 w-4" /> 弃权 (Pass)
            </Button>
          )}
          {onScore && (
            <Button variant="outline" className="w-full justify-start gap-2 text-blue-600 border-blue-200 hover:bg-blue-50 h-9 text-xs" onClick={onScore}>
              <Calculator className="h-4 w-4" /> 数子结算 (Score)
            </Button>
          )}
          {onAnalysis && (
            <Button variant="outline" className="w-full justify-start gap-2 h-9 text-xs" onClick={onAnalysis}>
              <Swords className="h-4 w-4" /> 形势分析 (Analysis)
            </Button>
          )}
          {onReset && (
            <Button variant="outline" className="w-full justify-start gap-2 h-9 text-xs" onClick={onReset}>
              <RefreshCw className="h-4 w-4" /> 重置 (Reset)
            </Button>
          )}
          {showChat && (
            <Button variant="secondary" className="w-full justify-start gap-2 h-9 text-xs">
              <MessageCircle className="h-4 w-4" /> 聊天 (Chat)
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
