"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBKAgent, type ChatMessage } from "@/lib/store";
import { TypingText } from "./typing-text";
import { CitationRef } from "./citation-popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

const SUGGESTIONS = [
  "Lên lịch HK 20252, tránh sáng, phải có Giải tích II và Vật lý II",
  "Đăng ký 5 môn, ưu tiên lớp còn nhiều chỗ",
  "Xếp lịch KTCT Mác-Lênin + GDTC 2 + CTDL&GT, tránh xung đột",
];

function MessageBubble({ message, isLatest }: { message: ChatMessage; isLatest: boolean }) {
  const { citations } = useBKAgent();
  const isUser = message.role === "user";
  const [typingDone, setTypingDone] = useState(false);

  function highlightImportant(text: string) {
    const redTerms = /(\bPlan B\b|rủi ro|thất bại|cảnh báo|Rủi ro|Thất bại|Cảnh báo)/g;
    const blueTerms = /(\bPlan A\b|thành công|Thành công|Độ tin cậy|độ tin cậy|đã tạo|Đã tạo|Đã xác nhận|đã xác nhận)/g;

    return text.split(/(\bPlan [AB]\b|rủi ro|thất bại|cảnh báo|Rủi ro|Thất bại|Cảnh báo|thành công|Thành công|Độ tin cậy|độ tin cậy|đã tạo|Đã tạo|Đã xác nhận|đã xác nhận)/g).map((part, i) => {
      if (redTerms.test(part)) return <span key={i} className="font-semibold text-[#C72127]">{part}</span>;
      if (blueTerms.test(part)) return <span key={i} className="font-semibold text-[#134D8B]">{part}</span>;
      return <span key={i}>{part}</span>;
    });
  }

  function renderTextWithCitations(text: string) {
    const parts = text.split(/\[(\d+(?:,\d+)*)\]/g);
    return parts.map((part, i) => {
      if (i % 2 === 1) {
        const ids = part.split(",").map(Number);
        return ids.map((id) => {
          const cit = citations.find((c) => c.id === id);
          return <CitationRef key={`${message.id}-cit-${id}`} id={id} citation={cit} />;
        });
      }
      return <span key={`${message.id}-text-${i}`}>{highlightImportant(part)}</span>;
    });
  }

  return (
    <div className={cn("flex gap-2.5", isUser ? "flex-row-reverse" : "flex-row")}>
      {!isUser && (
        <Avatar className="size-7 shrink-0">
          <AvatarFallback className="bg-foreground text-background text-[10px] font-bold">
            BK
          </AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          "max-w-[85%] rounded-lg px-3 py-2.5 text-sm leading-relaxed whitespace-pre-line",
          isUser
            ? "bg-[#134D8B] dark:bg-zinc-800 text-white border-0 rounded-tr-sm"
            : "border border-border/50 rounded-tl-sm",
        )}
      >
        {!isUser && isLatest && !typingDone ? (
          <TypingText text={message.text} speed={12} onComplete={() => setTypingDone(true)} />
        ) : (
          renderTextWithCitations(message.text)
        )}
      </div>
    </div>
  );
}

export function ChatPanel() {
  const { messages, prompt, setPrompt, generate, isTyping, flow, clarify } = useBKAgent();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el && typeof el.scrollTo === "function") {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages.length, isTyping]);

  const isEmpty = messages.length === 0;

  return (
    <div className="flex h-full flex-col">
      <ScrollArea className="flex-1" ref={scrollRef}>
        <div className="px-4 py-4 space-y-3">
          {isEmpty && (
            <div className="flex h-full min-h-[60vh] flex-col items-center justify-center text-center">
              <Avatar className="size-10 mb-3">
                <AvatarFallback className="bg-foreground text-background text-sm font-bold">
                  BK
                </AvatarFallback>
              </Avatar>
              <h3 className="text-sm font-medium leading-normal">Xin chào! Mình là BKAgent</h3>
              <p className="mt-1 max-w-xs text-xs text-muted-foreground leading-relaxed">
                Mô tả yêu cầu đăng ký học phần bằng ngôn ngữ tự nhiên, mình sẽ tạo kế hoạch tối ưu cho bạn.
              </p>
              <div className="mt-4 flex flex-col gap-1.5 w-full max-w-xs">
                {SUGGESTIONS.map((s) => (
                  <Button
                    key={s}
                    variant="ghost"
                    size="sm"
                    className="h-auto justify-start whitespace-normal text-left text-xs text-muted-foreground px-3 py-2 leading-relaxed"
                    onClick={() => { setPrompt(s); generate(s); }}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <MessageBubble key={msg.id} message={msg} isLatest={idx === messages.length - 1 && msg.role === "assistant"} />
          ))}

          {isTyping && (
            <div className="flex gap-2.5">
              <Avatar className="size-7 shrink-0">
                <AvatarFallback className="bg-foreground text-background text-[10px] font-bold">
                  BK
                </AvatarFallback>
              </Avatar>
              <div className="rounded-lg rounded-tl-sm border border-border/50 px-3 py-2.5">
                <span className="flex gap-1">
                  <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="size-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
              </div>
            </div>
          )}

          {(flow === "lowConfidence" || flow === "idle") && messages.length > 0 && !isTyping && (
            <div className="flex gap-1.5 pl-9">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => clarify("avoidMorning")}
              >
                Tránh lịch sáng
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => clarify("keepGroup")}
              >
                Giữ lớp cùng nhóm
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>

      <form
        className="border-t border-border/50 px-4 py-3"
        onSubmit={(e) => { e.preventDefault(); if (prompt.trim()) generate(prompt.trim()); }}
      >
        <div className="flex gap-2">
          <Input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Nhập yêu cầu đăng ký học phần..."
            disabled={isTyping}
            className="flex-1 bg-transparent"
          />
          <Button
            type="submit"
            size="default"
            disabled={!prompt.trim() || isTyping}
          >
            <Send className="size-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
