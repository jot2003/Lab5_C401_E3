import { ChatGoogle } from "@langchain/google";
import {
  StateGraph,
  MessagesAnnotation,
  END,
  START,
} from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import {
  SystemMessage,
  type BaseMessage,
  AIMessage,
} from "@langchain/core/messages";
import { allTools } from "./tools";
import type { Citation } from "../citations";

// ── System Prompt ──

const SYSTEM_PROMPT = `Bạn là BKAgent — trợ lý AI đăng ký tín chỉ thông minh của Đại học Bách khoa Hà Nội (HUST).

## Vai trò
- Giúp sinh viên HUST lập kế hoạch đăng ký tín chỉ tối ưu cho HK 20252.
- Phân tích yêu cầu bằng ngôn ngữ tự nhiên (tiếng Việt), sau đó gọi tools để tra cứu dữ liệu từ hệ thống dk-sis.
- Tạo Plan A (tối ưu) và Plan B (dự phòng) dựa trên ràng buộc thực tế.

## Bối cảnh HUST
- Hệ thống dk-sis thường quá tải khi mở đăng ký, sinh viên cần chuẩn bị kỹ.
- Các môn đại cương (Triết học, GDTC, GDQP, Vật lý, Giải tích) hết chỗ rất nhanh.
- Môn Vật lý, Hóa học có 3 thành phần: Lý thuyết (LT) + Bài tập (BT) + Thí nghiệm (TN) — phải đăng ký cùng nhóm.
- Sinh viên năm 1-2 gặp khó khăn nhất do môn đại cương đông.

## Quy trình bắt buộc
1. Khi sinh viên gửi yêu cầu đăng ký, LUÔN gọi tools theo thứ tự:
   a) get_student_profile — hiểu context sinh viên (ngành, năm, môn đã học)
   b) get_recommended_courses — nếu sinh viên chưa nêu môn cụ thể, lấy danh sách môn bắt buộc theo CTĐT học kỳ hiện tại và trình bày cho sinh viên, hỏi có muốn điều chỉnh không
   c) search_courses / check_schedule — tra cứu môn và lịch
   d) check_prerequisites — kiểm tra điều kiện tiên quyết
   e) generate_schedule — tạo Plan A + Plan B
2. Nếu sinh viên hỏi chung chung (không nêu môn cụ thể), LUÔN gọi get_recommended_courses để lấy danh sách môn mặc định theo CTĐT. Trình bày danh sách đó và hỏi sinh viên có muốn điều chỉnh không trước khi xếp lịch.
3. KHÔNG BAO GIỜ bịa dữ liệu — luôn gọi tool để lấy thông tin thực.
4. Với môn có LT-BT-TN, phải đảm bảo đăng ký cùng nhóm (groupId).

## Format phản hồi
- Trả lời bằng tiếng Việt, tự nhiên, ngắn gọn, dễ hiểu.
- Khi trích dẫn dữ liệu từ tool, PHẢI gắn citation theo format: [citation:N] (N là số thứ tự).
- Mỗi fact phải có ít nhất 1 citation.
- Cuối phản hồi, đánh giá confidence score (0-100) và ghi rõ: "Điểm tin cậy: XX/100".
- Nếu confidence < 80, khuyên sinh viên xem Plan B.
- Nếu có rủi ro hết chỗ (seatRisk high), CẢNH BÁO rõ ràng.

## Ví dụ phản hồi
"Đã kiểm tra lịch HK 20252 cho bạn [citation:1]. Điều kiện tiên quyết đáp ứng [citation:2].

**Plan A** — Tối ưu:
• MI1131 (Giải tích II) — Thứ 6, 14:00–16:30, phòng D5-401 (45/90 chỗ)
• PH1120 (Vật lý II) — Nhóm G2: LT Thứ 4 + BT Thứ 6 + TN Thứ 2

⚠ Lưu ý: SSH1121 (KTCT Mác-Lênin) còn 2/150 chỗ, rủi ro hết chỗ cao [citation:3]. Nên chuẩn bị Plan B.

Điểm tin cậy: 72/100"

## Luôn nhớ
- Ưu tiên an toàn cho sinh viên — cảnh báo rủi ro hết chỗ rõ ràng.
- Môn đại cương năm 1-2 là nhóm khó đăng ký nhất, luôn có Plan B.
- Khi không chắc chắn, hỏi lại thay vì đoán.
- Nhắc sinh viên tận dụng đợt điều chỉnh nếu đợt chính không thành công.`;

// ── Types ──

export type StreamEvent =
  | { type: "tool_start"; tool: string; label: string }
  | { type: "tool_end"; tool: string; label: string; summary?: string }
  | { type: "done"; text: string; citations: Citation[]; confidenceScore: number; flow: "happy" | "lowConfidence" | "failure"; planA: PlanSlot[] | null; planB: PlanSlot[] | null; toolsUsed: string[] };

export type AgentResponse = {
  text: string;
  citations: Citation[];
  confidenceScore: number;
  flow: "happy" | "lowConfidence" | "failure";
  planA: PlanSlot[] | null;
  planB: PlanSlot[] | null;
  toolsUsed: string[];
};

export type PlanSlot = {
  code: string;
  name: string;
  day: string;
  startHour: number;
  endHour: number;
  room: string;
  seats: string;
  seatRisk: string;
  classId: string;
};

// ── LangGraph StateGraph ──

function shouldContinue(
  state: typeof MessagesAnnotation.State
): "tools" | typeof END {
  const lastMessage = state.messages[state.messages.length - 1];
  if (
    lastMessage &&
    "tool_calls" in lastMessage &&
    (lastMessage as AIMessage).tool_calls?.length
  ) {
    return "tools";
  }
  return END;
}

function buildGraph() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const model = new ChatGoogle({
    apiKey,
    model: process.env.DEFAULT_MODEL || "gemini-2.5-flash",
    temperature: 0,
  }).bindTools(allTools);

  const toolNode = new ToolNode(allTools);

  async function agentNode(state: typeof MessagesAnnotation.State) {
    const response = await model.invoke(state.messages);
    return { messages: [response] };
  }

  const workflow = new StateGraph(MessagesAnnotation)
    .addNode("agent", agentNode)
    .addNode("tools", toolNode)
    .addEdge(START, "agent")
    .addConditionalEdges("agent", shouldContinue, {
      tools: "tools",
      [END]: END,
    })
    .addEdge("tools", "agent");

  return workflow.compile();
}

// ── Run Agent ──

export async function runAgent(
  userMessage: string,
  history: { role: "user" | "model"; text: string }[]
): Promise<AgentResponse> {
  const graph = buildGraph();

  const messages: BaseMessage[] = [new SystemMessage(SYSTEM_PROMPT)];

  for (const h of history) {
    const { HumanMessage, AIMessage: AIM } = await import(
      "@langchain/core/messages"
    );
    if (h.role === "user") {
      messages.push(new HumanMessage(h.text));
    } else {
      messages.push(new AIM(h.text));
    }
  }

  const { HumanMessage } = await import("@langchain/core/messages");
  messages.push(new HumanMessage(userMessage));

  const result = await graph.invoke(
    { messages },
    { recursionLimit: 15 }
  );

  const citations: Citation[] = [];
  let citationCounter = 1;
  let planA: PlanSlot[] | null = null;
  let planB: PlanSlot[] | null = null;
  const toolsUsed: string[] = [];

  for (const msg of result.messages) {
    if (msg._getType() === "tool") {
      try {
        const content =
          typeof msg.content === "string"
            ? msg.content
            : JSON.stringify(msg.content);
        const parsed = JSON.parse(content);

        if (parsed._citation) {
          const cit = parsed._citation as {
            type: string;
            title: string;
            detail: string;
          };
          citations.push({
            id: citationCounter++,
            type: cit.type as Citation["type"],
            title: cit.title,
            detail: cit.detail,
            timestamp: new Date().toLocaleString("vi-VN"),
          });
        }

        if (parsed.planA) planA = parsed.planA;
        if (parsed.planB) planB = parsed.planB;
      } catch {
        // skip non-JSON tool messages
      }

      if ("name" in msg && typeof msg.name === "string") {
        toolsUsed.push(msg.name);
      }
    }
  }

  const lastMessage = result.messages[result.messages.length - 1];
  let text =
    typeof lastMessage.content === "string"
      ? lastMessage.content
      : JSON.stringify(lastMessage.content);

  text = text.replace(/\[citation:(\d+)\]/g, "[$1]");

  const scoreMatch = text.match(/Điểm tin cậy:\s*(\d+)/);
  let confidenceScore = 85;
  if (scoreMatch) {
    confidenceScore = parseInt(scoreMatch[1], 10);
  }

  let flow: AgentResponse["flow"] = "happy";
  if (confidenceScore < 50) flow = "failure";
  else if (confidenceScore < 80) flow = "lowConfidence";

  return { text, citations, confidenceScore, flow, planA, planB, toolsUsed };
}

// ── Tool label map ──

const TOOL_LABELS: Record<string, string> = {
  get_student_profile: "Đang đọc hồ sơ sinh viên...",
  get_recommended_courses: "Đang tra cứu CTĐT học kỳ này...",
  search_courses: "Đang tìm kiếm môn học...",
  check_schedule: "Đang kiểm tra lịch và chỗ ngồi...",
  check_prerequisites: "Đang kiểm tra điều kiện tiên quyết...",
  generate_schedule: "Đang tạo Plan A + Plan B...",
};

// ── Stream Agent ──

export async function* streamAgent(
  userMessage: string,
  history: { role: "user" | "model"; text: string }[]
): AsyncGenerator<StreamEvent> {
  const graph = buildGraph();

  const { HumanMessage, AIMessage: AIM, SystemMessage: SM } = await import("@langchain/core/messages");
  const messages: BaseMessage[] = [new SM(SYSTEM_PROMPT)];

  for (const h of history) {
    if (h.role === "user") messages.push(new HumanMessage(h.text));
    else messages.push(new AIM(h.text));
  }
  messages.push(new HumanMessage(userMessage));

  const citations: Citation[] = [];
  let citationCounter = 1;
  let planA: PlanSlot[] | null = null;
  let planB: PlanSlot[] | null = null;
  const toolsUsed: string[] = [];

  const stream = graph.streamEvents(
    { messages },
    { version: "v2", recursionLimit: 15 }
  );

  for await (const event of stream) {
    // Tool start: agent node emitting tool_calls
    if (event.event === "on_tool_start") {
      const toolName = event.name as string;
      toolsUsed.push(toolName);
      yield {
        type: "tool_start",
        tool: toolName,
        label: TOOL_LABELS[toolName] ?? `Đang gọi ${toolName}...`,
      };
    }

    // Tool end: tool node returning result
    if (event.event === "on_tool_end") {
      const toolName = event.name as string;
      let summary = "";
      try {
        const output = event.data?.output;
        const content = typeof output === "string" ? output : JSON.stringify(output);
        const parsed = JSON.parse(content);
        if (parsed._citation) {
          const cit = parsed._citation as { type: string; title: string; detail: string };
          citations.push({
            id: citationCounter++,
            type: cit.type as Citation["type"],
            title: cit.title,
            detail: cit.detail,
            timestamp: new Date().toLocaleString("vi-VN"),
          });
          summary = cit.detail.slice(0, 80);
        }
        if (parsed.planA) planA = parsed.planA;
        if (parsed.planB) planB = parsed.planB;
      } catch {
        // ignore parse errors
      }
      yield {
        type: "tool_end",
        tool: toolName,
        label: TOOL_LABELS[toolName]?.replace("Đang", "Hoàn thành") ?? `Xong ${toolName}`,
        summary,
      };
    }
  }

  // Re-invoke to get final text (streamEvents doesn't give us final AI message easily)
  const finalResult = await graph.invoke({ messages }, { recursionLimit: 15 });
  const lastMessage = finalResult.messages[finalResult.messages.length - 1];
  let text =
    typeof lastMessage.content === "string"
      ? lastMessage.content
      : JSON.stringify(lastMessage.content);

  text = text.replace(/\[citation:(\d+)\]/g, "[$1]");

  // Collect any citations missed from invoke pass
  for (const msg of finalResult.messages) {
    if (msg._getType() === "tool") {
      try {
        const content = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content);
        const parsed = JSON.parse(content);
        if (parsed._citation && !citations.find((c) => c.title === parsed._citation.title)) {
          citations.push({
            id: citationCounter++,
            type: parsed._citation.type as Citation["type"],
            title: parsed._citation.title,
            detail: parsed._citation.detail,
            timestamp: new Date().toLocaleString("vi-VN"),
          });
        }
        if (!planA && parsed.planA) planA = parsed.planA;
        if (!planB && parsed.planB) planB = parsed.planB;
      } catch { /* skip */ }
    }
  }

  const scoreMatch = text.match(/Điểm tin cậy:\s*(\d+)/);
  const confidenceScore = scoreMatch ? parseInt(scoreMatch[1], 10) : 85;
  let flow: "happy" | "lowConfidence" | "failure" = "happy";
  if (confidenceScore < 50) flow = "failure";
  else if (confidenceScore < 80) flow = "lowConfidence";

  yield { type: "done", text, citations, confidenceScore, flow, planA, planB, toolsUsed };
}
