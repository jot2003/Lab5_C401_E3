import { cn } from "@/lib/cn";

type ConfidenceLevel = "high" | "medium" | "low";

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

export function PromptInput() {
  return (
    <form className="card-surface flex w-full flex-col gap-3 rounded-2xl border p-4 md:flex-row">
      <label htmlFor="prompt" className="sr-only">
        Ask VinAgent
      </label>
      <input
        id="prompt"
        type="text"
        placeholder="Ví dụ: Lên lịch HK Xuân 2026, tránh sáng, phải có Giải tích 2"
        className="focus-ring w-full rounded-xl border bg-background px-4 py-3 text-sm"
      />
      <button
        type="button"
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
}: {
  title: string;
  courses: string[];
  confidence: ConfidenceLevel;
  hasConflict?: boolean;
}) {
  return (
    <article className="card-surface rounded-2xl border p-4">
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
      <ActionBar />
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

export function ClarificationCard() {
  return (
    <section className="card-surface rounded-2xl border p-4">
      <h3 className="mb-2 text-sm font-semibold">Need clarification</h3>
      <p className="mb-3 text-sm text-muted">
        Bạn ưu tiên tránh lịch sáng hay giữ lớp cùng nhóm bạn?
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="focus-ring rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium"
        >
          Tránh lịch sáng
        </button>
        <button
          type="button"
          className="focus-ring rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium"
        >
          Giữ lớp cùng nhóm
        </button>
      </div>
    </section>
  );
}

export function ActionBar() {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className="focus-ring rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
      >
        Xác nhận Plan
      </button>
      <button
        type="button"
        className="focus-ring rounded-lg border border-border bg-background px-3 py-2 text-xs font-semibold"
      >
        Editable Plan
      </button>
      <button
        type="button"
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
