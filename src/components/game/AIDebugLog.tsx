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

  const hasPhaseData = log.phaseInput && log.phaseResult;
  const hasMoveData = log.moveInput && log.moveResult;

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="font-headline text-xl flex items-center gap-2">
            <Terminal className="text-accent" />
            AI Debug Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full" defaultValue={log.error ? "error" : undefined}>
          {hasPhaseData && (
            <AccordionItem value="phase-strategist">
              <AccordionTrigger>Game Phase Strategist</AccordionTrigger>
              <AccordionContent>
                  <h4 className="font-semibold text-sm mb-1">Input</h4>
                  <ScrollArea className="h-32 rounded-md border bg-muted/50 p-2">
                      <pre className="text-xs">{JSON.stringify(log.phaseInput, null, 2)}</pre>
                  </ScrollArea>
                  <h4 className="font-semibold text-sm mt-3 mb-1">Output</h4>
                  <ScrollArea className="h-24 rounded-md border bg-muted/50 p-2">
                      <pre className="text-xs">{JSON.stringify(log.phaseResult, null, 2)}</pre>
                  </ScrollArea>
              </AccordionContent>
            </AccordionItem>
          )}
          {hasMoveData && (
            <AccordionItem value="move-suggester">
              <AccordionTrigger>Move Suggester</AccordionTrigger>
              <AccordionContent>
                  <h4 className="font-semibold text-sm mb-1">Input</h4>
                  <ScrollArea className="h-48 rounded-md border bg-muted/50 p-2">
                      <pre className="text-xs">{JSON.stringify(log.moveInput, null, 2)}</pre>
                  </ScrollArea>
                  <h4 className="font-semibold text-sm mt-3 mb-1">Output</h4>
                  <ScrollArea className="h-32 rounded-md border bg-muted/50 p-2">
                      <pre className="text-xs">{JSON.stringify(log.moveResult, null, 2)}</pre>
                  </ScrollArea>
              </AccordionContent>
            </AccordionItem>
          )}
          {log.error && (
            <AccordionItem value="error">
                <AccordionTrigger className="text-destructive">Error</AccordionTrigger>
                <AccordionContent>
                    <pre className="text-xs text-destructive">{JSON.stringify(log.error, null, 2)}</pre>
                </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      </CardContent>
    </Card>
  );
}
