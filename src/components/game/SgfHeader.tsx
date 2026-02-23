
"use client";

import { SgfMetadata } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Info, Users, Clock, Trophy } from "lucide-react";

interface SgfHeaderProps {
  metadata: SgfMetadata;
}

export function SgfHeader({ metadata }: SgfHeaderProps) {
  return (
    <Card className="border-2 bg-muted/20">
      <CardContent className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="space-y-1">
          <p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
            <Info className="h-3 w-3" /> Event
          </p>
          <p className="text-sm font-semibold truncate">{metadata.event || "Unknown Game"}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
            <Users className="h-3 w-3" /> Players
          </p>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-black text-white text-[10px]">B</Badge>
            <span className="text-sm font-semibold truncate">{metadata.blackName || "B"}</span>
            <span className="text-xs text-muted-foreground">vs</span>
            <Badge variant="outline" className="bg-white text-black text-[10px]">W</Badge>
            <span className="text-sm font-semibold truncate">{metadata.whiteName || "W"}</span>
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" /> Date/Komi
          </p>
          <p className="text-sm font-semibold">{metadata.date || "N/A"} · {metadata.komi || "7.5"}</p>
        </div>
        <div className="space-y-1">
          <p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
            <Trophy className="h-3 w-3" /> Result
          </p>
          <p className="text-sm font-bold text-accent">{metadata.result || "Ongoing"}</p>
        </div>
      </CardContent>
    </Card>
  );
}
