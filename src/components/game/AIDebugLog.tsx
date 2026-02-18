'use client';

import { Terminal } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface AIDebugLogProps {
  log: any;
  className?: string;
}

export function AIDebugLog({ log, className }: AIDebugLogProps) {
  if (!log) {
    return null;
  }

  const instinctStatus = log.instinct?.status || "Skipped";
  const hasRationalData = !!log.rational;

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="font-headline text-xl flex items-center gap-2">
            <Terminal className="text-accent" />
            AI Debug Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="instinct-layer">
            <AccordionTrigger>Instinct Layer (SGF Match)</AccordionTrigger>
            <AccordionContent>
                <div className="space-y-2">
                  <p className="text-sm">Status: <span className={cn("font-bold", instinctStatus === "Hit" ? "text-green-500" : "text-muted-foreground")}>{instinctStatus}</span></p>
                  {log.instinct?.match && (
                    <ScrollArea className="h-24 rounded-md border bg-muted/50 p-2">
                        <pre className="text-xs">{JSON.stringify(log.instinct.match, null, 2)}</pre>
                    </ScrollArea>
                  )}
                </div>
            </AccordionContent>
          </AccordionItem>
          {hasRationalData && (
            <AccordionItem value="rational-layer">
              <AccordionTrigger>Rational Layer (Alpha-Beta)</AccordionTrigger>
              <AccordionContent>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2 border rounded-md bg-muted/30">
                        <p className="text-muted-foreground">Nodes Checked</p>
                        <p className="font-bold">{log.rational.nodesEvaluated}</p>
                      </div>
                      <div className="p-2 border rounded-md bg-muted/30">
                        <p className="text-muted-foreground">Eval Score</p>
                        <p className="font-bold">{log.rational.bestValue.toFixed(1)}</p>
                      </div>
                    </div>
                    <ScrollArea className="h-32 rounded-md border bg-muted/50 p-2">
                        <pre className="text-xs">{JSON.stringify(log.rational, null, 2)}</pre>
                    </ScrollArea>
                  </div>
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </CardContent>
    </Card>
  );
}
