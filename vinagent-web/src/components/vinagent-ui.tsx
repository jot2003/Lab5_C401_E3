import { cn } from "@/lib/cn";

export type ConfidenceLevel = "high" | "medium" | "low";

export function ConflictBadge({ hasConflict }: { hasConflict: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold",
        hasConflict
          ? "border-danger/40 bg-danger/10 text-danger"
          : "border-success/40 bg-success/10 text-success",
      )}
    >
      {hasConflict ? "Conflict detected" : "Conflict-free"}
    </span>
  );
}

export function ConfidenceBadge({ level }: { level: ConfidenceLevel }) {
  const labels = {
    high: "High confidence",
    medium: "Needs confirmation",
    low: "Low confidence",
  };
  const classes = {
    high: "border-trust-high/40 bg-trust-high/10 text-trust-high",
    medium: "border-trust-mid/40 bg-trust-mid/10 text-trust-mid",
    low: "border-trust-low/40 bg-trust-low/10 text-trust-low",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold",
        classes[level],
      )}
    >
      {labels[level]}
    </span>
  );
}

export function SourceChip({ source }: { source: string }) {
  return (
    <button
      type="button"
      className="focus-ring rounded-full border border-border/80 bg-surface px-3 py-1 text-xs font-medium text-muted transition hover:bg-primary/5 hover:text-foreground"
    >
      Source: {source}
    </button>
  );
}

export function PromptInput({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      className="card-surface flex w-full flex-col gap-3 rounded-2xl border p-4 md:flex-row"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <label htmlFor="prompt" className="sr-only">
        Ask VinAgent
      </label>
      <input
        id="prompt"
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Ví dụ: Lên lịch HK Xuân 2026, tránh sáng, phải có Giải tích 2"
        className="focus-ring w-full rounded-xl border bg-background px-4 py-3 text-sm"
      />
      <button
        type="submit"
        className="focus-ring rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
      >
        Generate plans
      </button>
    </form>
  );
}

export function PlanCard({
  title,
  courses,
  confidence,
  hasConflict = false,
  selected = false,
  onAccept,
  onEdit,
  onEscalate,
}: {
  title: string;
  courses: string[];
  confidence: ConfidenceLevel;
  hasConflict?: boolean;
  selected?: boolean;
  onAccept?: () => void;
  onEdit?: () => void;
  onEscalate?: () => void;
}) {
  return (
    <article
      className={cn(
        "card-surface rounded-2xl border p-4",
        selected && "ring-2 ring-primary/60",
      )}
    >
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold">{title}</h3>
        <div className="flex items-center gap-2">
          <ConflictBadge hasConflict={hasConflict} />
          <ConfidenceBadge level={confidence} />
        </div>
      </header>
      <ul className="mb-4 space-y-2 text-sm text-muted">
        {courses.map((course) => (
          <li key={course} className="rounded-lg bg-background px-3 py-2">
            {course}
          </li>
        ))}
      </ul>
      <ActionBar onAccept={onAccept} onEdit={onEdit} onEscalate={onEscalate} />
    </article>
  );
}

export function ReasoningPanel({ reasons }: { reasons: string[] }) {
  return (
    <section className="card-surface rounded-2xl border p-4">
      <h3 className="mb-2 text-sm font-semibold">Showing work</h3>
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
        {reasons.map((reason) => (
          <li key={reason}>{reason}</li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <SourceChip source="SIS Snapshot 10:32" />
        <SourceChip source="Course Policy CECS" />
      </div>
    </section>
  );
}

export function ClarificationCard({
  onChoose,
}: {
  onChoose: (choice: "avoidMorning" | "keepGroup") => void;
}) {
  return (
    <section className="card-surface rounded-2xl border p-4">
      <h3 className="mb-2 text-sm font-semibold">Need clarification</h3>
      <p className="mb-3 text-sm text-muted">
        Bạn ưu tiên tránh lịch sáng hay giữ lớp cùng nhóm bạn?
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onChoose("avoidMorning")}
          className="focus-ring rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium"
        >
          Tránh lịch sáng
        </button>
        <button
          type="button"
          onClick={() => onChoose("keepGroup")}
          className="focus-ring rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium"
        >
          Giữ lớp cùng nhóm
        </button>
      </div>
    </section>
  );
}

export function ActionBar({
  onAccept,
  onEdit,
  onEscalate,
}: {
  onAccept?: () => void;
  onEdit?: () => void;
  onEscalate?: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={onAccept}
        className="focus-ring rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
      >
        Xác nhận Plan
      </button>
      <button
        type="button"
        onClick={onEdit}
        className="focus-ring rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold"
      >
        Editable Plan
      </button>
      <button
        type="button"
        onClick={onEscalate}
        className="focus-ring rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold"
      >
        Escalate to Advisor
      </button>
    </div>
  );
}

export function Toast({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <aside className="card-surface rounded-xl border border-success/50 bg-success/5 p-3">
      <p className="text-sm font-semibold text-success">{title}</p>
      <p className="text-xs text-muted">{message}</p>
    </aside>
  );
}

export type MetricCardItem = {
  label: string;
  value: string;
  status: "good" | "warning" | "danger";
  target: string;
};

export function MetricsPanel({ metrics }: { metrics: MetricCardItem[] }) {
  return (
    <section className="card-surface rounded-2xl border p-4">
      <h3 className="mb-3 text-sm font-semibold">Metrics dashboard</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        {metrics.map((metric) => (
          <article key={metric.label} className="rounded-xl border bg-background p-3">
            <p className="text-xs text-muted">{metric.label}</p>
            <p className="mt-1 text-lg font-semibold">{metric.value}</p>
            <p className="mt-1 text-xs text-muted">Target: {metric.target}</p>
            <p
              className={cn(
                "mt-2 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                metric.status === "good" &&
                  "border-success/40 bg-success/10 text-success",
                metric.status === "warning" &&
                  "border-trust-mid/40 bg-trust-mid/10 text-trust-mid",
                metric.status === "danger" &&
                  "border-danger/40 bg-danger/10 text-danger",
              )}
            >
              {metric.status === "good"
                ? "On track"
                : metric.status === "warning"
                  ? "Watch"
                  : "Red flag"}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function RedFlagPanel({
  flags,
  onAcknowledge,
}: {
  flags: string[];
  onAcknowledge: () => void;
}) {
  return (
    <section className="card-surface rounded-2xl border border-danger/30 p-4">
      <h3 className="mb-2 text-sm font-semibold text-danger">Red flags</h3>
      {flags.length === 0 ? (
        <p className="text-sm text-muted">Khong co red flag dang mo.</p>
      ) : (
        <>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
            {flags.map((flag) => (
              <li key={flag}>{flag}</li>
            ))}
          </ul>
          <button
            type="button"
            onClick={onAcknowledge}
            className="focus-ring mt-3 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs font-semibold text-danger"
          >
            Acknowledge flags
          </button>
        </>
      )}
    </section>
  );
}

export function TrustControlPanel({
  autoActionEnabled,
  onToggleAutoAction,
}: {
  autoActionEnabled: boolean;
  onToggleAutoAction: () => void;
}) {
  return (
    <section className="card-surface rounded-2xl border p-4">
      <h3 className="mb-2 text-sm font-semibold">Trust controls</h3>
      <p className="mb-3 text-sm text-muted">
        Auto-action chi duoc phep khi confidence {"\u003e="} 80 va khong co red
        flag.
      </p>
      <button
        type="button"
        onClick={onToggleAutoAction}
        className={cn(
          "focus-ring rounded-lg px-3 py-2 text-xs font-semibold",
          autoActionEnabled
            ? "bg-success/15 text-success"
            : "bg-background text-foreground border border-border",
        )}
      >
        {autoActionEnabled ? "Auto-action: ON" : "Auto-action: OFF"}
      </button>
    </section>
  );
}

export function ScenarioPresetBar({
  presets,
  onPick,
}: {
  presets: Array<{ id: string; label: string; prompt: string }>;
  onPick: (prompt: string) => void;
}) {
  return (
    <section className="card-surface rounded-2xl border p-4">
      <h3 className="mb-2 text-sm font-semibold">Demo presets</h3>
      <div className="flex flex-wrap gap-2">
        {presets.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onPick(preset.prompt)}
            className="focus-ring rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium"
          >
            {preset.label}
          </button>
        ))}
      </div>
    </section>
  );
}

export function SessionSummaryCard({
  summary,
  onCopy,
}: {
  summary: string;
  onCopy: () => void;
}) {
  return (
    <section className="card-surface rounded-2xl border p-4">
      <h3 className="mb-2 text-sm font-semibold">Session summary</h3>
      <p className="rounded-lg bg-background px-3 py-2 text-xs text-muted">
        {summary}
      </p>
      <button
        type="button"
        onClick={onCopy}
        className="focus-ring mt-3 rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold"
      >
        Copy summary
      </button>
    </section>
  );
}
