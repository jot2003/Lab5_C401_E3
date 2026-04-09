"use client";

import type { Citation } from "@/lib/citations";
import { getCitationLabel, getCitationColor } from "@/lib/citations";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export function CitationRef({
  id,
  citation,
}: {
  id: number;
  citation?: Citation;
}) {
  if (!citation) {
    return (
      <span className="inline-flex size-4 items-center justify-center rounded bg-secondary px-1 text-[10px] font-bold text-muted-foreground align-super">
        {id}
      </span>
    );
  }

  return (
    <Popover>
      <PopoverTrigger
        className="inline-flex h-4 min-w-4 items-center justify-center rounded bg-secondary px-1 text-[10px] font-bold text-white transition-colors hover:bg-accent align-super"
      >
        {id}
      </PopoverTrigger>
      <PopoverContent className="w-64 max-w-[calc(100vw-2rem)] p-3" side="top" align="start">
        <div className="mb-2 flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn("text-[10px] leading-normal", getCitationColor(citation.type))}
          >
            {getCitationLabel(citation.type)}
          </Badge>
          <span className="font-mono text-[10px] text-muted-foreground">
            {citation.timestamp}
          </span>
        </div>
        <p className="text-xs font-medium leading-normal">{citation.title}</p>
        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
          {citation.detail}
        </p>
      </PopoverContent>
    </Popover>
  );
}

export function CitationList({ citations }: { citations: Citation[] }) {
  if (citations.length === 0) return null;
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-medium uppercase tracking-wider text-[#B72025]">
        Nguồn tham khảo
      </h4>
      {citations.map((c) => (
        <div
          key={c.id}
          className="flex items-start gap-2 rounded-lg border border-border/50 bg-card p-3"
        >
          <span className="flex size-5 shrink-0 items-center justify-center rounded bg-[#B72025] text-[10px] font-bold text-white">
            {c.id}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Badge
                variant="outline"
                className={cn("text-[9px] leading-normal", getCitationColor(c.type))}
              >
                {getCitationLabel(c.type)}
              </Badge>
              <span className="font-mono text-[10px] text-muted-foreground">
                {c.timestamp}
              </span>
            </div>
            <p className="mt-1 text-xs font-medium leading-normal text-[#B72025]">{c.title}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">
              {c.detail}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
