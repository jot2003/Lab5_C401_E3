# Reflection — BKAgent v2.0 | Lab 5 C401-E3

**Họ tên:** Đặng Đinh Tú Anh  
**MSSV:** 2A202600019
**Ngày:** 09/04/2026

---

## 1. Role cụ thể trong nhóm

**AI/Backend Lead — chịu trách nhiệm kiến trúc agentic system và system prompt engineering.**
quyết định toàn bộ tech stack AI (LangChain/LangGraph + Gemini 2.5 Flash), thiết kế luồng StateGraph (user message → tool decision → tool execution → loop → final response), viết system prompt cho agent, và định nghĩa schema dữ liệu trung gian giữa backend tool và frontend store.

---

## 2. Phần phụ trách cụ thể (output rõ ràng)

**2.1. LangGraph StateGraph Agent (`/src/lib/ai/agent.ts`)**  
Xây dựng agentic loop: agent node gọi LLM, tool node điều phối 6 công cụ, edge logic để loop lại sau mỗi tool call, và hàm `runAgent()` xuất SSE events về cho `/api/chat`. Output cụ thể: file agent.ts 398 dòng, hỗ trợ cả Gemini và OpenAI với cùng interface.

**2.2. System Prompt + Confidence Scoring**  
Viết system prompt enforce thứ tự gọi tool bắt buộc (student profile → recommended courses → search → schedule → prerequisites → generate), bắt buộc trích dẫn theo format `[citation:N]`, và yêu cầu 3 gợi ý follow-up. Song song đó, thiết kế thuật toán tính điểm tin cậy (weighted: 60% seat pressure, 25% schedule feasibility, 15% distribution comfort) và trạng thái flow machine (`idle → happy / lowConfidence / failure / recovery / escalated`).

**2.3. Đặc tả kỹ thuật (spec-draft.md + spec-final.md)**  
Viết và duy trì 2 phiên bản spec: spec-draft (yêu cầu ban đầu, failure modes, ROI 3 kịch bản) và spec-final (đánh giá metrics, acceptance criteria). Đây là tài liệu nền để cả nhóm căn chỉnh scope và tránh scope creep.

---

## 3. SPEC phần nào mạnh nhất, phần nào yếu nhất?

**Mạnh nhất: Failure Mode Analysis và Safety Constraints**  
Spec xác định rõ 3 failure mode chính (prerequisite hallucination, stale schedule data, LT-BT-TN mismatch) và giải pháp kỹ thuật tương ứng ngay từ đầu. Điều này giúp team không bị bất ngờ khi implement — ví dụ, constraint LT-BT-TN groupId được enforce trong CSP solver từ ngày đầu, không phải patch sau.

**Yếu nhất: Evaluation Metrics không đo được trong hackathon**  
Spec đặt ra các chỉ số như "Schedule Precision Rate ≥ 85%", "Manual Edit Rate < 25%", "Time-to-Register-Ready < 10 min" — nhưng không có cơ chế thu thập dữ liệu thực tế nào. Toàn bộ metrics này là giả định trên giấy, không có A/B test hay user study. Nếu reviewer hỏi "dựa vào đâu con số 85%?" thì không có câu trả lời thuyết phục.

---

## 4. Đóng góp cụ thể khác

**Debug streaming không nhận đủ event:**  
Khi triển khai SSE streaming từ `/api/chat`, client bị miss event `tool_end` vì Zustand store parse sai format. Cụ thể: server gửi `data: {...}\n\n` nhưng client split bằng `\n` thay vì `\n\n`, khiến nhiều events bị merge lại. Mất khoảng 2 giờ trace qua DevTools Network tab để tìm ra root cause, sau đó fix bằng cách split theo `\n\n` và filter dòng rỗng.

**Test prompt engineering với edge cases:**  
Chạy thủ công ~30 test cases để kiểm tra agent: sinh viên năm 1 chưa học môn nào, yêu cầu môn có prerequisite chưa đủ, lịch conflict khi chọn 5 môn cùng buổi sáng. Phát hiện agent hay bỏ qua bước `check_prerequisites` khi user không nhắc rõ — fix bằng cách thêm dòng enforce vào system prompt: "PHẢI gọi check_prerequisites trước generate_schedule dù user không yêu cầu."

**Hỗ trợ integrate group invite vào nguoi-dung page:**  
Khi Phạm Quốc Dũng implement UI group invite bị lỗi localStorage key collision giữa session của user A và B, tôi đề xuất namespace key theo `bkagent.invite.{mssv}` thay vì key chung — fix được bug mà không cần refactor toàn bộ store.

---

## 5. 1 điều học được trong hackathon mà trước đó chưa biết

**LangGraph không phải chỉ là "LangChain có graph" — nó thay đổi cách thiết kế agent.**

Trước hackathon, tôi nghĩ agentic AI chỉ cần prompt tốt + function calling là đủ. Nhưng khi implement với LangGraph, tôi mới thấy: việc tách biệt `agent node` (LLM ra quyết định) và `tool node` (thực thi tool) thành hai node riêng trong StateGraph cho phép kiểm soát được số vòng lặp (recursion limit = 15), interrupt giữa chừng nếu cần human confirmation, và trace từng bước trong graph để debug. Đây là khác biệt kiến trúc căn bản, không phải chỉ là syntax khác — và nó quyết định trực tiếp khả năng mở rộng sau này (ví dụ: thêm parallel tool calls hoặc human-in-the-loop node).

---

## 6. Nếu làm lại, đổi gì?

**Tách mock data ra khỏi tool implementation ngay từ ngày đầu.**

Hiện tại, dữ liệu mock (student.json, schedule.json, curriculum-cttt.json) được import trực tiếp trong `/src/lib/ai/tools.ts`. Điều này có nghĩa là để test một tool với dữ liệu khác, phải sửa file tools.ts. Nếu làm lại, tôi sẽ define interface `DataProvider` với method như `getStudent(mssv)`, `getCourses(semester)`, và inject vào tool qua dependency injection — mock data chỉ là một implementation của interface đó. Lợi ích cụ thể: team member khác có thể viết `RealSISProvider` trỏ vào API thật mà không đụng logic tool, và viết unit test cho từng tool bằng cách inject `MockProvider` có controllable behavior. Hackathon mất ~3 giờ để debug vì tool behavior thay đổi khi team thay đổi mock data file, lỗi này có thể tránh hoàn toàn.

---

## 7. AI giúp gì? AI sai/mislead ở đâu?

**AI giúp được:**  
- Tạo boilerplate LangGraph StateGraph nhanh: thay vì đọc docs 2 giờ, dùng Claude để generate cấu trúc ban đầu rồi customize — tiết kiệm khoảng 4 giờ setup.  
- Gợi ý thuật toán CSP cho bài toán đăng ký môn học (backtracking với constraint propagation), sau đó nhóm implement theo hướng đơn giản hơn (greedy với priority queue theo seat risk) — vẫn hữu ích vì AI đặt ra đúng khung bài toán.  
- Generate mock data JSON có cấu trúc nhất quán (30+ course sections, schedule slots, prerequisites) — tiết kiệm ~2 giờ tạo test data thủ công.

**AI sai/mislead:**  
- Claude ban đầu gợi ý dùng `createReactAgent` của LangChain thay vì `StateGraph` — cách này đơn giản hơn nhưng không hỗ trợ streaming tool events theo format chúng tôi cần (không expose `tool_start`/`tool_end` events riêng lẻ). Mất 1.5 giờ implement theo hướng đó rồi mới phát hiện limitation, phải refactor sang StateGraph.  
- Khi hỏi về SSE streaming trong Next.js App Router, AI đưa ra code dùng `res.write()` theo kiểu Pages Router — không work với App Router vì phải dùng `ReadableStream` và `TransformStream`. Lỗi này mất thêm 1 giờ debug vì error message không rõ ràng.  
- AI tự tin suggest cách parse `[citation:N]` bằng regex đơn giản — nhưng regex đó bị break khi agent output chứa code block có dấu ngoặc vuông. Phải tự viết parser có state machine để handle nested brackets đúng.
