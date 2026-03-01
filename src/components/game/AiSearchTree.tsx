
"use client";

import { SearchNode } from "@/lib/ai/go-ai-engine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Cpu, ChevronRight, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AiSearchTreeProps {
  tree: SearchNode | null;
  thinking: boolean;
  evaluation: number;
}

export function AiSearchTree({ tree, thinking, evaluation }: AiSearchTreeProps) {
  return (
    <Card className="border-2 border-accent/20 bg-accent/5 overflow-hidden">
      <CardHeader className="py-2 bg-accent/10 border-b flex flex-row items-center justify-between">
        <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
          <Cpu className="h-3 w-3" /> AI 思考中枢
        </CardTitle>
        <div className="flex items-center gap-2">
           <AnimatePresence>
             {thinking && (
               <motion.div 
                 initial={{ opacity: 0 }} 
                 animate={{ opacity: 1 }} 
                 exit={{ opacity: 0 }}
                 className="flex items-center gap-1"
               >
                 <Activity className="h-3 w-3 text-accent animate-pulse" />
                 <span className="text-[9px] font-bold text-accent">ANALYZING...</span>
               </motion.div>
             )}
           </AnimatePresence>
           <Badge variant="outline" className="text-[9px] font-mono border-accent/30">
             Eval: {evaluation.toFixed(1)}
           </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[200px]">
          <div className="p-3 space-y-1">
            {!tree?.children.length && !thinking && (
              <p className="text-[10px] text-muted-foreground italic text-center py-8">
                等待 AI 回合开启搜索树视图
              </p>
            )}
            {tree?.children.map((node, i) => (
              <motion.div 
                key={i}
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-center justify-between text-[10px] p-1 rounded hover:bg-accent/10 transition-colors border-l-2 border-transparent hover:border-accent"
              >
                <div className="flex items-center gap-2">
                  <ChevronRight className="h-3 w-3 text-accent" />
                  <span className="font-mono font-bold">{node.move}</span>
                </div>
                <div className="flex items-center gap-3 font-mono">
                   <span className={node.score >= 0 ? "text-green-600" : "text-red-600"}>
                     {node.score.toFixed(1)}
                   </span>
                   <div className="w-12 h-1 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="bg-accent h-full" 
                        style={{ width: `${Math.min(100, Math.abs(node.score) / 2)}%` }} 
                      />
                   </div>
                </div>
              </motion.div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
