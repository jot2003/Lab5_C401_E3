"use client";

import { useEffect } from "react";
import { AlertTriangle, Pencil, UserRound } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useBKAgent } from "@/lib/store";
import { VisualCalendar } from "./visual-calendar";
import { CitationList } from "./citation-popover";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

function ConfidenceBar({ score }: { score: number }) {
  const label = score >= 80 ? "An toàn" : score >= 60 ? "Cần kiểm tra" : "Rủi ro";
  const indicatorClass = score >= 80
    ? "[&>div]:bg-success"
    : score >= 60
      ? "[&>div]:bg-warning"
      : "[&>div]:bg-danger";

  return (
    <Card className="border-border/50 bg-card">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">Độ tin cậy</span>
          <span className="font-mono text-lg font-semibold">
            {score}
            <span className="text-xs text-muted-foreground font-normal">/100</span>
          </span>
        </div>
        <Progress value={score} className={cn("h-1.5", indicatorClass)} />
        <p className="mt-1.5 text-[11px] text-muted-foreground leading-normal">{label}</p>
      </CardContent>
    </Card>
  );
}

function RedFlagBanner({ flags, onAcknowledge }: { flags: string[]; onAcknowledge: () => void }) {
  if (flags.length === 0) return null;
  return (
    <Alert variant="destructive" className="border-danger/20 bg-danger/5">
      <AlertTriangle className="size-4" />
      <AlertTitle className="text-xs font-semibold leading-normal">
        Cảnh báo ({flags.length})
      </AlertTitle>
      <AlertDescription>
        <ul className="mt-1 space-y-1">
          {flags.map((f) => (
            <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
              <span className="mt-1.5 size-1 shrink-0 rounded-full bg-danger" />
              {f}
            </li>
          ))}
        </ul>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 text-[11px] border-danger/30 text-danger hover:bg-danger/10"
          onClick={onAcknowledge}
        >
          Đánh dấu đã xử lý
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function PlanListView({ courses, plan }: { courses: { code: string; name: string; day: string; startHour: number; endHour: number; room?: string }[]; plan: "A" | "B" }) {
  return (
    <div className="space-y-1.5">
      {courses.map((c, idx) => (
        <div key={`${plan}-${c.code}-${c.day}-${idx}`} className="flex items-center gap-3 rounded-lg border border-border/50 bg-card p-3">
          <span className={cn(
            "flex size-7 shrink-0 items-center justify-center rounded-md text-[10px] font-bold",
            plan === "A" ? "bg-foreground text-background" : "bg-secondary text-foreground",
          )}>
            {c.code.slice(-3)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium leading-normal">{c.code} — {c.name}</p>
            <p className="text-[11px] text-muted-foreground leading-normal">
              {c.day} {c.startHour}:00–{c.endHour > Math.floor(c.endHour) ? `${Math.floor(c.endHour)}:30` : `${c.endHour}:00`} · {c.room}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ResultPanel() {
  const store = useBKAgent();
  const hasResult = store.flow !== "idle";

  useEffect(() => {
    if (store.toast) {
      toast(store.toast.title, { description: store.toast.message });
    }
  }, [store.toast]);

  if (!hasResult) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center px-8">
        <div className="rounded-lg border-2 border-dashed border-border/40 p-8">
          <p className="text-sm font-medium text-muted-foreground">Lịch học sẽ hiển thị ở đây</p>
          <p className="mt-1 text-xs text-muted-foreground">Nhập yêu cầu ở khung chat bên trái để bắt đầu</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-2.5">
        <Tabs value={store.currentView} onValueChange={(v) => store.setCurrentView(v as "calendar" | "list")}>
          <TabsList className="h-7">
            <TabsTrigger value="calendar" className="text-xs px-2.5">
              Lịch học
            </TabsTrigger>
            <TabsTrigger value="list" className="text-xs px-2.5">
              Danh sách
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex gap-1">
          <Button
            variant={store.selectedPlan === "A" ? "default" : "ghost"}
            size="sm"
            className="text-xs h-7"
            disabled={store.selectedPlan === "A"}
            onClick={() => store.acceptPlan("A")}
          >
            Plan A
          </Button>
          <Button
            variant={store.selectedPlan === "B" ? "secondary" : "ghost"}
            size="sm"
            className="text-xs h-7"
            disabled={store.selectedPlan === "B"}
            onClick={() => store.acceptPlan("B")}
          >
            Plan B
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="space-y-4 p-4">
          {store.planACourses.length === 0 && store.planBCourses.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
              Agent đang tạo kế hoạch...
            </div>
          ) : store.currentView === "calendar" ? (
            <VisualCalendar
              planA={store.planACourses}
              planB={store.planBCourses}
              showPlanB={store.usePlanB || store.flow === "failure" || store.flow === "recovery"}
              selectedPlan={store.selectedPlan}
            />
          ) : (
            <div className="space-y-4">
              {store.planACourses.length > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Plan A — Tối ưu
                  </h4>
                  <PlanListView courses={store.planACourses} plan="A" />
                </div>
              )}
              {store.planBCourses.length > 0 && (store.usePlanB || store.flow === "failure" || store.flow === "recovery") && (
                <div>
                  <h4 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Plan B — Dự phòng
                  </h4>
                  <PlanListView courses={store.planBCourses} plan="B" />
                </div>
              )}
            </div>
          )}

          <ConfidenceBar score={store.confidenceScore} />

          <RedFlagBanner flags={store.redFlags} onAcknowledge={store.acknowledgeFlags} />

          {store.citations.length > 0 && <CitationList citations={store.citations} />}

          <Separator className="opacity-30" />

          <div className="flex flex-wrap gap-2 pb-4">
            {store.selectedPlan && (
              <Button variant="outline" size="sm" className="text-xs gap-1.5" onClick={store.toggleEdit}>
                <Pencil className="size-3" />
                Chỉnh sửa kế hoạch
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-danger gap-1.5"
              onClick={store.escalate}
            >
              <UserRound className="size-3" />
              Chuyển cố vấn học vụ
            </Button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
