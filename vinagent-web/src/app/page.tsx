"use client";

import { useMemo, useState } from "react";

import {
  ClarificationCard,
  type ConfidenceLevel,
  MetricsPanel,
  PlanCard,
  PromptInput,
  RedFlagPanel,
  ReasoningPanel,
  ScenarioPresetBar,
  SessionSummaryCard,
  Toast,
  TrustControlPanel,
} from "@/components/vinagent-ui";
import { evaluatePlannerDecision } from "@/lib/planner";

type FlowState =
  | "idle"
  | "happy"
  | "lowConfidence"
  | "failure"
  | "recovery"
  | "escalated";

const BASE_PLAN_A = [
  "CECS101 - Giai tich 2 (Mon/Wed 09:00)",
  "CECS203 - Data Structures (Tue 13:00)",
  "CECS204 - OOP Lab (Thu 15:00)",
];

const BASE_PLAN_B = [
  "CECS101 - Giai tich 2 (Mon/Wed 14:00)",
  "CECS203 - Data Structures (Tue 15:00)",
  "CECS204 - OOP Lab (Fri 09:00)",
];

export default function Home() {
  const presets = [
    {
      id: "happy",
      label: "Happy path",
      prompt: "len lich hk xuan 2026 tranh sang va co giai tich 2",
    },
    {
      id: "low",
      label: "Low confidence",
      prompt: "help",
    },
    {
      id: "fail",
      label: "Failure fallback",
      prompt: "high risk stale near full",
    },
  ];

  const [prompt, setPrompt] = useState("");
  const [flow, setFlow] = useState<FlowState>("idle");
  const [selectedPlan, setSelectedPlan] = useState<"A" | "B" | null>(null);
  const [usePlanB, setUsePlanB] = useState(false);
  const [isEdited, setIsEdited] = useState(false);
  const [lastConfidenceScore, setLastConfidenceScore] = useState(100);
  const [autoActionEnabled, setAutoActionEnabled] = useState(false);
  const [redFlags, setRedFlags] = useState<string[]>([]);
  const [reasonList, setReasonList] = useState<string[]>([
    "Ban yeu cau tranh lich sang va giu CECS101 trong hoc ky nay.",
    "SIS snapshot cho thay lop CECS101 sang chi con 2 cho.",
    "Confidence va fallback duoc danh dau de tranh overconfidence.",
  ]);
  const [toast, setToast] = useState<{ title: string; message: string } | null>(
    null,
  );

  const confidence: ConfidenceLevel = useMemo(() => {
    if (flow === "lowConfidence") return "low";
    if (flow === "failure") return "medium";
    return "high";
  }, [flow]);

  const planACourses = useMemo(() => {
    if (!isEdited) return BASE_PLAN_A;
    return [
      "CECS101 - Giai tich 2 (Mon/Wed 09:00)",
      "Break block - 30m recovery",
      "CECS203 - Data Structures (Tue 13:30)",
      "CECS204 - OOP Lab (Thu 15:00)",
    ];
  }, [isEdited]);

  const planBCourses = useMemo(() => {
    if (!isEdited) return BASE_PLAN_B;
    return [
      "CECS101 - Giai tich 2 (Mon/Wed 14:00)",
      "Break block - 30m recovery",
      "CECS203 - Data Structures (Tue 15:30)",
      "CECS204 - OOP Lab (Fri 09:00)",
    ];
  }, [isEdited]);

  function handleGenerate() {
    const decision = evaluatePlannerDecision(prompt);
    setLastConfidenceScore(decision.confidenceScore);
    const nextFlags: string[] = [];
    if (!decision.toolSnapshot.dataFresh) {
      nextFlags.push("Stale SIS data (>5m), can refresh truoc khi submit.");
    }
    if (decision.confidenceScore < 70) {
      nextFlags.push("Confidence duoi 70, khong du dieu kien auto-action.");
    }
    if (decision.toolSnapshot.seatRisk === "high") {
      nextFlags.push("Seat risk cao, uu tien Plan B de tranh fail.");
    }
    setRedFlags(nextFlags);
    setReasonList([
      ...decision.reasons,
      `Tool snapshot: ${decision.toolSnapshot.sourceTimestamp}, data ${
        decision.toolSnapshot.dataFresh ? "fresh" : "stale"
      }.`,
    ]);

    if (decision.flow === "failure") {
      setFlow("failure");
      setUsePlanB(decision.needsPlanBFallback);
      setToast({
        title: "High risk scenario",
        message: "Plan A co the that bai do du lieu stale. Plan B da san sang.",
      });
      return;
    }

    if (decision.flow === "lowConfidence") {
      setFlow("lowConfidence");
      setUsePlanB(decision.needsPlanBFallback);
      setToast({
        title: "Low confidence detected",
        message: "Can xac nhan them preference truoc khi de xuat plan cuoi.",
      });
      return;
    }

    setFlow("happy");
    setUsePlanB(decision.needsPlanBFallback);
    setToast({
      title: "Plans generated",
      message: `Da tao 2 phuong an. Confidence score: ${decision.confidenceScore}/100.`,
    });
  }

  function handleAccept(plan: "A" | "B") {
    setSelectedPlan(plan);
    if (flow === "failure" && plan === "A") {
      setUsePlanB(true);
      setSelectedPlan("B");
      setFlow("recovery");
      setToast({
        title: "Plan B was activated",
        message:
          "Plan A that bai do het cho; he thong chuyen sang Plan B va giu dieu kien tien quyet.",
      });
      return;
    }

    setFlow("happy");
    setToast({
      title: "Registration ready",
      message: `Ban da chon Plan ${plan}. He thong san sang buoc xac nhan cuoi.`,
    });
  }

  function handleEdit() {
    setIsEdited((prev) => !prev);
    setToast({
      title: "Editable plan updated",
      message:
        "Da cap nhat lich voi break block de giam tai va tang kha nang bam lich.",
    });
  }

  function handleEscalate() {
    setFlow("escalated");
    setToast({
      title: "Escalated to advisor",
      message:
        "Advisor brief da duoc tao voi context session de co van tiep nhan nhanh hon.",
    });
  }

  const metrics = useMemo(
    () => [
      {
        label: "Schedule Precision Rate",
        value: `${Math.max(60, Math.round(lastConfidenceScore * 0.95))}%`,
        target: "> 85%",
        status:
          lastConfidenceScore >= 90
            ? ("good" as const)
            : lastConfidenceScore >= 75
              ? ("warning" as const)
              : ("danger" as const),
      },
      {
        label: "Manual Edit Rate",
        value: isEdited ? "31%" : "18%",
        target: "< 25%",
        status: isEdited ? ("warning" as const) : ("good" as const),
      },
      {
        label: "Plan B Activation",
        value: usePlanB ? "22%" : "9%",
        target: "< 15%",
        status: usePlanB ? ("warning" as const) : ("good" as const),
      },
      {
        label: "Red Flags Open",
        value: `${redFlags.length}`,
        target: "0",
        status:
          redFlags.length === 0
            ? ("good" as const)
            : redFlags.length < 3
              ? ("warning" as const)
              : ("danger" as const),
      },
    ],
    [isEdited, lastConfidenceScore, redFlags.length, usePlanB],
  );

  const sessionSummary = useMemo(
    () =>
      [
        `flow=${flow}`,
        `confidence=${lastConfidenceScore}`,
        `selectedPlan=${selectedPlan ?? "none"}`,
        `autoAction=${autoActionEnabled ? "on" : "off"}`,
        `redFlags=${redFlags.length}`,
      ].join(" | "),
    [autoActionEnabled, flow, lastConfidenceScore, redFlags.length, selectedPlan],
  );

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          VinAgent Frontend MVP — Phase 5
        </h1>
        <p className="text-sm text-muted">
          Interactive flows with confidence-aware planner, metrics dashboard, red
          flags, and trust control guardrails.
        </p>
      </header>

      <PromptInput
        value={prompt}
        onChange={setPrompt}
        onSubmit={handleGenerate}
      />
      <section className="grid gap-4 lg:grid-cols-2">
        <ScenarioPresetBar
          presets={presets}
          onPick={(presetPrompt) => {
            setPrompt(presetPrompt);
            const decision = evaluatePlannerDecision(presetPrompt);
            setLastConfidenceScore(decision.confidenceScore);
            const nextFlags: string[] = [];
            if (!decision.toolSnapshot.dataFresh) {
              nextFlags.push("Stale SIS data (>5m), can refresh truoc khi submit.");
            }
            if (decision.confidenceScore < 70) {
              nextFlags.push("Confidence duoi 70, khong du dieu kien auto-action.");
            }
            if (decision.toolSnapshot.seatRisk === "high") {
              nextFlags.push("Seat risk cao, uu tien Plan B de tranh fail.");
            }
            setRedFlags(nextFlags);
            setReasonList([
              ...decision.reasons,
              `Tool snapshot: ${decision.toolSnapshot.sourceTimestamp}, data ${
                decision.toolSnapshot.dataFresh ? "fresh" : "stale"
              }.`,
            ]);
            if (decision.flow === "failure") {
              setFlow("failure");
              setUsePlanB(decision.needsPlanBFallback);
              setToast({
                title: "Preset executed",
                message: "Scenario failure da duoc kich hoat de demo fallback.",
              });
              return;
            }
            if (decision.flow === "lowConfidence") {
              setFlow("lowConfidence");
              setUsePlanB(decision.needsPlanBFallback);
              setToast({
                title: "Preset executed",
                message: "Scenario low-confidence da duoc kich hoat de demo trust UX.",
              });
              return;
            }
            setFlow("happy");
            setUsePlanB(decision.needsPlanBFallback);
            setToast({
              title: "Preset executed",
              message: "Scenario happy path san sang cho demo.",
            });
          }}
        />
        <MetricsPanel metrics={metrics} />
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        <TrustControlPanel
          autoActionEnabled={autoActionEnabled}
          onToggleAutoAction={() => {
            const nextValue = !autoActionEnabled;
            if (nextValue && (lastConfidenceScore < 80 || redFlags.length > 0)) {
              setToast({
                title: "Auto-action blocked",
                message:
                  "Khong the bat auto-action khi confidence thap hoac con red flags.",
              });
              return;
            }
            setAutoActionEnabled(nextValue);
            setToast({
              title: "Trust control updated",
              message: nextValue
                ? "Auto-action da bat voi dieu kien an toan."
                : "Auto-action da tat, can xac nhan thu cong.",
            });
          }}
        />
        <SessionSummaryCard
          summary={sessionSummary}
          onCopy={async () => {
            try {
              await navigator.clipboard.writeText(sessionSummary);
              setToast({
                title: "Summary copied",
                message: "Da copy session summary de bo sung vao advisor brief.",
              });
            } catch {
              setToast({
                title: "Copy failed",
                message: "Khong the truy cap clipboard trong moi truong hien tai.",
              });
            }
          }}
        />
      </section>

      <main className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Scenario Planning
          </h2>
          <PlanCard
            title="Plan A — Optimized"
            courses={planACourses}
            confidence={confidence}
            selected={selectedPlan === "A" && !usePlanB}
            onAccept={() => handleAccept("A")}
            onEdit={handleEdit}
            onEscalate={handleEscalate}
          />
          <PlanCard
            title="Plan B — Backup"
            courses={planBCourses}
            confidence={usePlanB ? "high" : "medium"}
            hasConflict={!usePlanB}
            selected={selectedPlan === "B"}
            onAccept={() => handleAccept("B")}
            onEdit={handleEdit}
            onEscalate={handleEscalate}
          />
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Trust & Recovery
          </h2>
          <ReasoningPanel
            reasons={reasonList}
          />
          <RedFlagPanel
            flags={redFlags}
            onAcknowledge={() => {
              setRedFlags([]);
              setToast({
                title: "Flags acknowledged",
                message: "Da danh dau red flags va reset trang thai canh bao.",
              });
            }}
          />
          {(flow === "lowConfidence" || flow === "idle") && (
            <ClarificationCard
              onChoose={(choice) => {
                setFlow("happy");
                setToast({
                  title: "Preference captured",
                  message:
                    choice === "avoidMorning"
                      ? "He thong uu tien cac lop sau 9h00."
                      : "He thong uu tien giu lich hoc cung nhom ban.",
                });
              }}
            />
          )}
          {toast && <Toast title={toast.title} message={toast.message} />}
        </section>
      </main>

      <footer className="border-t pt-4 text-xs text-muted">
        Phase 5 focus: UX polish, demo presets, and handoff-friendly session
        summary.
      </footer>
    </div>
  );
}
