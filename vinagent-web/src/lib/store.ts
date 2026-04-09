import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import type { Citation } from "./citations";

export type FlowState = "idle" | "happy" | "lowConfidence" | "failure" | "recovery" | "escalated";
export type ConfidenceLevel = "high" | "medium" | "low";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  citationIds?: number[];
  timestamp: Date;
};

export type CourseSlot = {
  code: string;
  name: string;
  day: "Mon" | "Tue" | "Wed" | "Thu" | "Fri";
  startHour: number;
  endHour: number;
  room?: string;
};

export type RegisterStatus = "idle" | "loading" | "success" | "failed";

export type AgentStep = {
  id: string;
  type: "tool_start" | "tool_end" | "done";
  tool?: string;
  label: string;
  timestamp: Date;
};

export type ChatSession = {
  id: string;
  title: string;
  createdAt: Date;
  messages: ChatMessage[];
  planACourses: CourseSlot[];
  planBCourses: CourseSlot[];
  citations: Citation[];
};

export interface BKAgentState {
  prompt: string;
  flow: FlowState;
  selectedPlan: "A" | "B" | null;
  usePlanB: boolean;
  isEdited: boolean;
  confidenceScore: number;
  autoActionEnabled: boolean;
  redFlags: string[];
  reasons: { text: string; citationIds: number[] }[];
  citations: Citation[];
  toast: { title: string; message: string } | null;
  messages: ChatMessage[];
  currentView: "calendar" | "list";
  isTyping: boolean;
  planACourses: CourseSlot[];
  planBCourses: CourseSlot[];
  chatHistory: { role: "user" | "model"; text: string }[];
  streamingSteps: AgentStep[];

  // Chat session history
  sessions: ChatSession[];
  currentSessionId: string;

  advisorBriefOpen: boolean;
  editPlanOpen: boolean;
  registerDialogOpen: boolean;
  groupInviteOpen: boolean;
  registerStatus: RegisterStatus;

  setPrompt: (prompt: string) => void;
  setToast: (toast: { title: string; message: string } | null) => void;
  setCurrentView: (view: "calendar" | "list") => void;
  generate: (inputPrompt: string) => void;
  acceptPlan: (plan: "A" | "B") => void;
  toggleEdit: () => void;
  escalate: () => void;
  acknowledgeFlags: () => void;
  toggleAutoAction: () => void;
  clarify: (choice: "avoidMorning" | "keepGroup") => void;
  confidenceLevel: () => ConfidenceLevel;
  openEditPlan: () => void;
  closeEditPlan: () => void;
  openRegisterDialog: () => void;
  closeRegisterDialog: () => void;
  openGroupInvite: () => void;
  closeGroupInvite: () => void;
  setRegisterStatus: (status: RegisterStatus) => void;
  newSession: () => void;
  loadSession: (id: string) => void;
  deleteSession: (id: string) => void;
}

let msgCounter = 0;
function makeId() {
  return `msg-${++msgCounter}-${Date.now()}`;
}

let stepCounter = 0;
function makeStepId() {
  return `step-${++stepCounter}-${Date.now()}`;
}

function toCourseSlots(
  plan: { code: string; name: string; day: string; startHour: number; endHour: number; room: string }[] | null
): CourseSlot[] {
  if (!plan) return [];
  return plan.map((s) => ({
    code: s.code,
    name: s.name,
    day: s.day as CourseSlot["day"],
    startHour: s.startHour,
    endHour: s.endHour,
    room: s.room,
  }));
}

function generateSessionId() {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const initialState = {
  prompt: "",
  flow: "idle" as FlowState,
  selectedPlan: null as "A" | "B" | null,
  usePlanB: false,
  isEdited: false,
  confidenceScore: 100,
  autoActionEnabled: false,
  redFlags: [] as string[],
  reasons: [] as { text: string; citationIds: number[] }[],
  citations: [] as Citation[],
  toast: null as { title: string; message: string } | null,
  messages: [] as ChatMessage[],
  currentView: "calendar" as "calendar" | "list",
  isTyping: false,
  planACourses: [] as CourseSlot[],
  planBCourses: [] as CourseSlot[],
  chatHistory: [] as { role: "user" | "model"; text: string }[],
  streamingSteps: [] as AgentStep[],
  advisorBriefOpen: false,
  editPlanOpen: false,
  registerDialogOpen: false,
  groupInviteOpen: false,
  registerStatus: "idle" as RegisterStatus,
};

export const useBKAgent = create<BKAgentState>()(
  persist(
    (set, get) => ({
      ...initialState,
      sessions: [] as ChatSession[],
      currentSessionId: generateSessionId(),

      setPrompt: (prompt) => set({ prompt }),
      setToast: (toast) => set({ toast }),
      setCurrentView: (view) => set({ currentView: view }),

      generate: async (inputPrompt) => {
        const userMsg: ChatMessage = {
          id: makeId(),
          role: "user",
          text: inputPrompt,
          timestamp: new Date(),
        };
        set((s) => ({
          messages: [...s.messages, userMsg],
          isTyping: true,
          streamingSteps: [],
          prompt: "",
        }));

        const currentHistory = get().chatHistory;

        try {
          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: inputPrompt, history: currentHistory }),
          });

          if (!res.ok || !res.body) {
            const errBody = await res.json().catch(() => ({ error: "Network error" }));
            throw new Error(errBody.error || `HTTP ${res.status}`);
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split("\n\n");
            buffer = lines.pop() ?? "";

            for (const line of lines) {
              if (!line.startsWith("data: ")) continue;
              const jsonStr = line.slice(6).trim();
              if (!jsonStr) continue;

              try {
                const event = JSON.parse(jsonStr);

                if (event.type === "tool_start") {
                  const step: AgentStep = {
                    id: makeStepId(),
                    type: "tool_start",
                    tool: event.tool,
                    label: event.label,
                    timestamp: new Date(),
                  };
                  set((s) => ({ streamingSteps: [...s.streamingSteps, step] }));
                }

                if (event.type === "tool_end") {
                  // Update matching tool_start to tool_end
                  set((s) => ({
                    streamingSteps: s.streamingSteps.map((step) =>
                      step.tool === event.tool && step.type === "tool_start"
                        ? { ...step, type: "tool_end" as const, label: event.label }
                        : step
                    ),
                  }));
                }

                if (event.type === "done") {
                  const data = event;
                  const flags: string[] = [];
                  if (data.confidenceScore < 70)
                    flags.push("Độ tin cậy dưới 70, chưa đủ điều kiện tự động hành động.");
                  const hasHighRisk =
                    data.text?.includes("rủi ro") && data.text?.includes("hết chỗ");
                  if (hasHighRisk)
                    flags.push("Phát hiện rủi ro hết chỗ cao, nên xem Plan B.");
                  const needsPlanB =
                    data.flow === "failure" || data.flow === "lowConfidence" || hasHighRisk;

                  const allCitIds = (data.citations ?? []).map(
                    (c: Citation) => c.id
                  );
                  const assistantMsg: ChatMessage = {
                    id: makeId(),
                    role: "assistant",
                    text: data.text ?? "",
                    citationIds: allCitIds,
                    timestamp: new Date(),
                  };

                  const planA = toCourseSlots(data.planA);
                  const planB = toCourseSlots(data.planB);

                  set((s) => {
                    const updatedMessages = [...s.messages, assistantMsg];
                    const updatedPlanA = planA.length > 0 ? planA : s.planACourses;
                    const updatedPlanB = planB.length > 0 ? planB : s.planBCourses;
                    const updatedCitations = data.citations ?? s.citations;

                    // Save/update session
                    const sessionId = s.currentSessionId;
                    const sessionTitle =
                      updatedMessages.find((m) => m.role === "user")?.text.slice(0, 45) ??
                      "Phiên mới";
                    const session: ChatSession = {
                      id: sessionId,
                      title: sessionTitle,
                      createdAt: new Date(),
                      messages: updatedMessages,
                      planACourses: updatedPlanA,
                      planBCourses: updatedPlanB,
                      citations: updatedCitations,
                    };
                    const existingIdx = s.sessions.findIndex((ss) => ss.id === sessionId);
                    const updatedSessions =
                      existingIdx >= 0
                        ? s.sessions.map((ss) => (ss.id === sessionId ? session : ss))
                        : [session, ...s.sessions].slice(0, 10);

                    return {
                      messages: updatedMessages,
                      isTyping: false,
                      streamingSteps: s.streamingSteps,
                      flow: data.flow,
                      confidenceScore: data.confidenceScore,
                      redFlags: flags,
                      reasons: (data.citations ?? []).map((c: Citation) => ({
                        text: c.detail,
                        citationIds: [c.id],
                      })),
                      citations: updatedCitations,
                      usePlanB: needsPlanB,
                      autoActionEnabled: false,
                      toast: null,
                      planACourses: updatedPlanA,
                      planBCourses: updatedPlanB,
                      chatHistory: [
                        ...s.chatHistory,
                        { role: "user" as const, text: inputPrompt },
                        { role: "model" as const, text: data.text ?? "" },
                      ],
                      sessions: updatedSessions,
                    };
                  });
                }

                if (event.type === "error") {
                  throw new Error(event.message);
                }
              } catch {
                // skip malformed events
              }
            }
          }
        } catch (error) {
          const errorMsg =
            error instanceof Error ? error.message : "Lỗi không xác định";
          const assistantMsg: ChatMessage = {
            id: makeId(),
            role: "assistant",
            text: `Xin lỗi, đã xảy ra lỗi khi xử lý yêu cầu: ${errorMsg}. Vui lòng thử lại.`,
            timestamp: new Date(),
          };
          set((s) => ({
            messages: [...s.messages, assistantMsg],
            isTyping: false,
            streamingSteps: [],
            flow: "failure",
            toast: { title: "Lỗi", message: errorMsg },
          }));
        }
      },

      acceptPlan: (plan) => {
        const { flow, messages } = get();
        if (flow === "failure" && plan === "A") {
          const msg: ChatMessage = {
            id: makeId(),
            role: "assistant",
            text: "Plan A có rủi ro cao, hệ thống đã tự động chuyển sang Plan B để đảm bảo an toàn.",
            timestamp: new Date(),
          };
          set({
            messages: [...messages, msg],
            selectedPlan: "B",
            usePlanB: true,
            flow: "recovery",
            toast: {
              title: "Đã kích hoạt Plan B",
              message: "Plan A thất bại, hệ thống chuyển sang Plan B.",
            },
          });
          return;
        }
        const msg: ChatMessage = {
          id: makeId(),
          role: "assistant",
          text: `Đã xác nhận Plan ${plan}. Bạn có thể tiến hành đăng ký.`,
          timestamp: new Date(),
        };
        set({
          messages: [...messages, msg],
          selectedPlan: plan,
          flow: "happy",
          toast: { title: "Sẵn sàng đăng ký", message: `Bạn đã chọn Plan ${plan}.` },
        });
      },

      toggleEdit: () =>
        set((s) => ({
          isEdited: !s.isEdited,
          toast: { title: "Đã cập nhật", message: "Đã chỉnh sửa kế hoạch." },
        })),

      escalate: () => {
        const msg: ChatMessage = {
          id: makeId(),
          role: "assistant",
          text: "Đã tạo bản tóm tắt (Advisor Brief) và chuyển cho cố vấn học vụ. Cố vấn sẽ liên hệ bạn trong vòng 24 giờ.",
          timestamp: new Date(),
        };
        set((s) => ({
          messages: [...s.messages, msg],
          flow: "escalated",
          advisorBriefOpen: true,
          toast: {
            title: "Đã chuyển cố vấn học vụ",
            message: "Advisor Brief đã tạo kèm bối cảnh phiên.",
          },
        }));
      },

      acknowledgeFlags: () =>
        set({
          redFlags: [],
          confidenceScore: 88,
          toast: {
            title: "Đã xử lý cảnh báo",
            message: "Cờ đỏ đã xóa, độ tin cậy đã cập nhật.",
          },
        }),

      toggleAutoAction: () => {
        const { autoActionEnabled, confidenceScore, redFlags } = get();
        const next = !autoActionEnabled;
        if (next && (confidenceScore < 80 || redFlags.length > 0)) {
          set({
            toast: {
              title: "Chặn tự động hành động",
              message: "Chưa đủ điều kiện an toàn.",
            },
          });
          return;
        }
        set({
          autoActionEnabled: next,
          toast: {
            title: "Đã cập nhật",
            message: next ? "Đã bật tự động hành động." : "Đã tắt tự động hành động.",
          },
        });
      },

      clarify: (choice) => {
        const text =
          choice === "avoidMorning"
            ? "Tránh lịch sáng, tôi muốn xếp lịch ưu tiên các lớp sau 9 giờ sáng."
            : "Giữ lớp cùng nhóm bạn, ưu tiên các lớp đông sinh viên.";
        get().generate(text);
      },

      confidenceLevel: () => {
        const { flow } = get();
        if (flow === "lowConfidence") return "low";
        if (flow === "failure") return "medium";
        return "high";
      },

      openEditPlan: () => set({ editPlanOpen: true }),
      closeEditPlan: () => set({ editPlanOpen: false }),
      openRegisterDialog: () => set({ registerDialogOpen: true }),
      closeRegisterDialog: () =>
        set({ registerDialogOpen: false, registerStatus: "idle" }),
      openGroupInvite: () => set({ groupInviteOpen: true }),
      closeGroupInvite: () => set({ groupInviteOpen: false }),
      setRegisterStatus: (status) => set({ registerStatus: status }),

      newSession: () => {
        const s = get();
        // Save current session if it has messages
        if (s.messages.length > 0) {
          const sessionId = s.currentSessionId;
          const sessionTitle =
            s.messages.find((m) => m.role === "user")?.text.slice(0, 45) ?? "Phiên mới";
          const session: ChatSession = {
            id: sessionId,
            title: sessionTitle,
            createdAt: new Date(),
            messages: s.messages,
            planACourses: s.planACourses,
            planBCourses: s.planBCourses,
            citations: s.citations,
          };
          const existingIdx = s.sessions.findIndex((ss) => ss.id === sessionId);
          const updatedSessions =
            existingIdx >= 0
              ? s.sessions.map((ss) => (ss.id === sessionId ? session : ss))
              : [session, ...s.sessions].slice(0, 10);
          set({ sessions: updatedSessions });
        }
        set({
          ...initialState,
          currentSessionId: generateSessionId(),
        });
      },

      loadSession: (id) => {
        const { sessions } = get();
        const session = sessions.find((s) => s.id === id);
        if (!session) return;
        set({
          currentSessionId: session.id,
          messages: session.messages,
          planACourses: session.planACourses,
          planBCourses: session.planBCourses,
          citations: session.citations,
          flow: "happy",
          isTyping: false,
          streamingSteps: [],
          chatHistory: session.messages
            .filter((m) => m.role === "user" || m.role === "assistant")
            .map((m) => ({
              role: m.role === "user" ? ("user" as const) : ("model" as const),
              text: m.text,
            })),
        });
      },

      deleteSession: (id) => {
        set((s) => ({
          sessions: s.sessions.filter((ss) => ss.id !== id),
        }));
      },
    }),
    {
      name: "bkagent-sessions",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sessions: state.sessions,
        currentSessionId: state.currentSessionId,
      }),
    }
  )
);
