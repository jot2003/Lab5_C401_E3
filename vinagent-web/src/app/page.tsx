import {
  ClarificationCard,
  PlanCard,
  PromptInput,
  ReasoningPanel,
  Toast,
} from "@/components/vinagent-ui";

export default function Home() {
  const planACourses = [
    "CECS101 - Giai tich 2 (Mon/Wed 09:00)",
    "CECS203 - Data Structures (Tue 13:00)",
    "CECS204 - OOP Lab (Thu 15:00)",
  ];
  const planBCourses = [
    "CECS101 - Giai tich 2 (Mon/Wed 14:00)",
    "CECS203 - Data Structures (Tue 15:00)",
    "CECS204 - OOP Lab (Fri 09:00)",
  ];

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-8 md:px-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
          VinAgent UI Foundation — Phase 1
        </h1>
        <p className="text-sm text-muted">
          Design system baseline for clarity-first planning, trust recovery, and
          human-friendly scheduling decisions.
        </p>
      </header>

      <PromptInput />

      <main className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Scenario Planning
          </h2>
          <PlanCard
            title="Plan A — Optimized"
            courses={planACourses}
            confidence="high"
          />
          <PlanCard
            title="Plan B — Backup"
            courses={planBCourses}
            confidence="medium"
            hasConflict
          />
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Trust & Recovery
          </h2>
          <ReasoningPanel
            reasons={[
              "Ban yeu cau tranh lich sang va giu CECS101 trong hoc ky nay.",
              "SIS snapshot cho thay lop CECS101 sang chi con 2 cho.",
              "Plan B du phong de tranh submit that bai vao gio cao diem.",
            ]}
          />
          <ClarificationCard />
          <Toast
            title="Plan B was activated"
            message="Plan A khong thanh cong do het cho; he thong da chuyen sang Plan B va giu du dieu kien tien quyet."
          />
        </section>
      </main>

      <footer className="border-t pt-4 text-xs text-muted">
        Phase 1 focus: design tokens, component consistency, accessibility
        baseline, and responsive UX.
      </footer>
    </div>
  );
}
