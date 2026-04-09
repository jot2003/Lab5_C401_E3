"use client";

import { Group, Panel, Separator } from "react-resizable-panels";
import { ChatPanel } from "@/components/chat-panel";
import { ResultPanel } from "@/components/result-panel";

export default function CreatePlanPage() {
  return (
    <Group
      orientation="horizontal"
      className="flex flex-1 overflow-hidden h-[calc(100dvh-1px)]"
    >
      <Panel defaultSize={38} minSize={28} maxSize={55}>
        <ChatPanel />
      </Panel>
      <Separator className="w-1.5 bg-border hover:bg-primary/60 active:bg-primary/80 transition-colors cursor-col-resize flex-shrink-0" />
      <Panel minSize={35}>
        <ResultPanel />
      </Panel>
    </Group>
  );
}
