
"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";

interface NavControlsProps {
  currentIndex: number;
  totalSteps: number;
  onNext: () => void;
  onPrev: () => void;
  onReset: () => void;
}

export function NavControls({ currentIndex, totalSteps, onNext, onPrev, onReset }: NavControlsProps) {
  return (
    <div className="flex items-center justify-between w-full gap-4">
      <Button variant="outline" size="icon" onClick={onPrev} disabled={currentIndex === 0}>
        <ChevronLeft className="h-5 w-5" />
      </Button>
      
      <div className="flex-1 flex flex-col items-center gap-1">
        <span className="text-xs font-mono font-bold text-muted-foreground">
          STEP {currentIndex} / {totalSteps}
        </span>
        <div className="w-full bg-secondary h-1 rounded-full overflow-hidden">
          <div 
            className="bg-accent h-full transition-all duration-300" 
            style={{ width: `${(currentIndex / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      <Button variant="outline" size="icon" onClick={onNext} disabled={currentIndex === totalSteps}>
        <ChevronRight className="h-5 w-5" />
      </Button>

      <Button variant="ghost" size="icon" onClick={onReset}>
        <RotateCcw className="h-4 w-4" />
      </Button>
    </div>
  );
}
