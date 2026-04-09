import { create } from "zustand";

import type { Citation } from "./citations";
import type { ChatResponseBody } from "@/app/api/chat/route";

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

interface BKAgentState {
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
}

let msgCounter = 0;
function makeId() {
  return `msg-${++msgCounter}-${Date.now()}`;
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

export const useBKAgent = create<BKAgentState>((set, get) => ({
  prompt: "",
  flow: "idle",
  selectedPlan: null,
  usePlanB: false,
  isEdited: false,
  confidenceScore: 100,
  autoActionEnabled: false,
  redFlags: [],
  reasons: [],
  citations: [],
  toast: null,
  messages: [],
  currentView: "calendar",
  isTyping: false,
  planACourses: [],
  planBCourses: [],
  chatHistory: [],

  setPrompt: (prompt) => set({ prompt }),
  setToast: (toast) => set({ toast }),
  setCurrentView: (view) => set({ currentView: view }),

  generate: async (inputPrompt) => {
    const userMsg: ChatMessage = { id: makeId(), role: "user", text: inputPrompt, timestamp: new Date() };
    set((s) => ({
      messages: [...s.messages, userMsg],
      isTyping: true,
      prompt: "",
    }));

    const currentHistory = get().chatHistory;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: inputPrompt,
          history: currentHistory,
        }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({ error: "Network error" }));
        throw new Error(errBody.error || `HTTP ${res.status}`);
      }

      const data: ChatResponseBody = await res.json();

      const flags: string[] = [];
      if (data.confidenceScore < 70) flags.push("Độ tin cậy dưới 70, chưa đủ điều kiện tự động hành động.");

      const hasHighRisk = data.text.includes("rủi ro") && data.text.includes("hết chỗ");
      if (hasHighRisk) flags.push("Phát hiện rủi ro hết chỗ cao, nên xem Plan B.");

      const needsPlanB = data.flow === "failure" || data.flow === "lowConfidence" || hasHighRisk;

      const allCitIds = data.citations.map((c) => c.id);
      const assistantMsg: ChatMessage = {
        id: makeId(),
        role: "assistant",
        text: data.text,
        citationIds: allCitIds,
        timestamp: new Date(),
      };

      const planA = toCourseSlots(data.planA);
      const planB = toCourseSlots(data.planB);

      set((s) => ({
        messages: [...s.messages, assistantMsg],
        isTyping: false,
        flow: data.flow,
        confidenceScore: data.confidenceScore,
        redFlags: flags,
        reasons: data.citations.map((c) => ({
          text: c.detail,
          citationIds: [c.id],
        })),
        citations: data.citations,
        usePlanB: needsPlanB,
        autoActionEnabled: false,
        toast: null,
        planACourses: planA.length > 0 ? planA : s.planACourses,
        planBCourses: planB.length > 0 ? planB : s.planBCourses,
        chatHistory: [
          ...s.chatHistory,
          { role: "user" as const, text: inputPrompt },
          { role: "model" as const, text: data.text },
        ],
      }));
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Lỗi không xác định";
      const assistantMsg: ChatMessage = {
        id: makeId(),
        role: "assistant",
        text: `Xin lỗi, đã xảy ra lỗi khi xử lý yêu cầu: ${errorMsg}. Vui lòng thử lại.`,
        timestamp: new Date(),
      };
      set((s) => ({
        messages: [...s.messages, assistantMsg],
        isTyping: false,
        flow: "failure",
        toast: { title: "Lỗi", message: errorMsg },
      }));
    }
  },

  acceptPlan: (plan) => {
    const { flow, messages } = get();
    if (flow === "failure" && plan === "A") {
      const msg: ChatMessage = { id: makeId(), role: "assistant", text: "Plan A có rủi ro cao, hệ thống đã tự động chuyển sang Plan B để đảm bảo an toàn.", timestamp: new Date() };
      set({
        messages: [...messages, msg],
        selectedPlan: "B",
        usePlanB: true,
        flow: "recovery",
        toast: { title: "Đã kích hoạt Plan B", message: "Plan A thất bại, hệ thống chuyển sang Plan B." },
      });
      return;
    }
    const msg: ChatMessage = { id: makeId(), role: "assistant", text: `Đã xác nhận Plan ${plan}. Bạn có thể tiến hành đăng ký.`, timestamp: new Date() };
    set({
      messages: [...messages, msg],
      selectedPlan: plan,
      flow: "happy",
      toast: { title: "Sẵn sàng đăng ký", message: `Bạn đã chọn Plan ${plan}.` },
    });
  },

  toggleEdit: () => set((s) => ({
    isEdited: !s.isEdited,
    toast: { title: "Đã cập nhật", message: "Đã chỉnh sửa kế hoạch." },
  })),

  escalate: () => {
    const msg: ChatMessage = { id: makeId(), role: "assistant", text: "Đã tạo bản tóm tắt (Advisor Brief) và chuyển cho cố vấn học vụ. Cố vấn sẽ liên hệ bạn trong vòng 24 giờ.", timestamp: new Date() };
    set((s) => ({
      messages: [...s.messages, msg],
      flow: "escalated",
      toast: { title: "Đã chuyển cố vấn học vụ", message: "Advisor Brief đã tạo kèm bối cảnh phiên." },
    }));
  },

  acknowledgeFlags: () => set({
    redFlags: [],
    confidenceScore: 88,
    toast: { title: "Đã xử lý cảnh báo", message: "Cờ đỏ đã xóa, độ tin cậy đã cập nhật." },
  }),

  toggleAutoAction: () => {
    const { autoActionEnabled, confidenceScore, redFlags } = get();
    const next = !autoActionEnabled;
    if (next && (confidenceScore < 80 || redFlags.length > 0)) {
      set({ toast: { title: "Chặn tự động hành động", message: "Chưa đủ điều kiện an toàn." } });
      return;
    }
    set({
      autoActionEnabled: next,
      toast: { title: "Đã cập nhật", message: next ? "Đã bật tự động hành động." : "Đã tắt tự động hành động." },
    });
  },

  clarify: (choice) => {
    const text = choice === "avoidMorning"
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
}));
