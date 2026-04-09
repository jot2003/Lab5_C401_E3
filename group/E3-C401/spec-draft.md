# Product SPEC Draft — BKAgent v2.0

**Team:** E3 (C401)  
**Track:** C - AI cho giáo dục và vận hành trường học  
**Project:** BKAgent — Cố vấn học vụ tự trị và tối ưu hóa đăng ký tín chỉ  
**Deadline Draft:** 23:59 ngày 08/04/2026

**Thành viên nhóm:**
- Hoàng Kim Trí Thành (2A202600372)
- Đặng Đinh Tú Anh (2A202600019)
- Quách Gia Được (2A202600423)
- Phạm Quốc Dũng (2A202600490)
- Nguyễn Thanh Nam (2A202600205)

---

## Tóm tắt dự án

BKAgent là hệ thống Agentic AI đóng vai trò cố vấn học vụ cá nhân cho sinh viên Đại học Bách khoa Hà Nội (HUST), cho phép lên kế hoạch đăng ký tín chỉ qua ngôn ngữ tự nhiên, tự kiểm tra điều kiện tiên quyết, phát hiện xung đột lịch và đề xuất phương án tối ưu.

Phiên bản v2.0 tập trung 5 cải tiến chính:
1. Social Learning Flywheel
2. Scenario Planning (Plan A + Plan B)
3. Advisor Brief tự động khi cần escalate sang cố vấn
4. Demand Forecasting cho phòng đào tạo
5. Hesitation Signals để học từ hành vi do dự

---

## 1) AI Product Canvas (bám sát template)

## Canvas

|   | Value | Trust | Feasibility |
|---|-------|-------|-------------|
| **Câu hỏi guide** | User nào? Pain gì? AI giải quyết gì mà cách hiện tại không giải được? | Khi AI sai thì user bị ảnh hưởng thế nào? User biết AI sai bằng cách nào? User sửa bằng cách nào? | Cost bao nhiêu/request? Latency bao lâu? Risk chính là gì? |
| **Trả lời** | **User:** Sinh viên HUST (đặc biệt năm 1-2), chuyên viên phòng đào tạo. **Pain:** Hệ thống dk-sis quá tải khi mở đăng ký, sập liên tục; các môn đại cương (Quân sự, Thể chất, Triết học Mác-Lênin) hết chỗ trong vài phút; phải kết hợp lớp lý thuyết + bài tập + thí nghiệm (Vật lý, Hóa học) rất phức tạp; mã môn thay đổi theo khóa gây nhầm lẫn. Mất 3-5 giờ/kỳ để đăng ký thành công. **AI giải quyết:** Chat tự nhiên → Agent phân tích điều kiện, tạo kế hoạch tối ưu với Plan A + Plan B, hỗ trợ đăng ký nhanh trong đợt điều chỉnh. | **Ưu tiên:** Precision cao hơn Recall vì đăng ký nhầm môn gây hậu quả trực tiếp (mất học phí, lệch tiến độ). **Khi sai:** Sinh viên đăng ký lỗi, mất slot đợt chính, phải chờ đợt điều chỉnh. **Biết sai:** Thất bại khi submit trên dk-sis, mismatch với SIS, hoặc kế hoạch không phù hợp preference. **Sửa:** Editable Plan, xác nhận bắt buộc trước action quan trọng, nút escalate sang cố vấn + Advisor Brief tự động. | **Cost ước tính:** Gemini 2.5 Flash ~0.0001 USD/query, thêm chi phí hạ tầng Next.js + logging. **Latency mục tiêu:** <3 giây cho đề xuất lịch. **Risk chính:** dk-sis không có API công khai (chỉ crawl được), dữ liệu slot thay đổi liên tục trong giờ cao điểm, hallucination mã môn/prereq, stale cache khi hệ thống quá tải. |

---

## Automation hay augmentation?

☑ Automation — AI thực thi một số thao tác sau khi có xác nhận  
☑ Augmentation — AI gợi ý, user quyết định cuối cùng

**Justify:** BKAgent là mô hình lai. Phần phân tích và đề xuất lịch là augmentation để giữ quyền quyết định cho sinh viên; phần chuẩn bị danh sách đăng ký có thể automation có kiểm soát, bắt buộc qua bước xác nhận (human-in-the-loop) để giảm rủi ro. Do dk-sis không có API, việc submit cuối cùng vẫn do sinh viên thực hiện thủ công.

---

## Learning signal

| # | Câu hỏi | Trả lời |
|---|---------|---------|
| 1 | User correction đi vào đâu? | Correction Log theo từng session: thay đổi môn, đổi khung giờ, rollback plan, lý do chỉnh sửa; dùng để cập nhật policy và re-ranking. |
| 2 | Product thu signal gì để biết tốt lên hay tệ đi? | Implicit (lịch nào được chọn), Explicit (rating + comment), Correction (delta khi edit), Hesitation (hover_time > 8s nhưng không chọn), tỷ lệ kích hoạt Plan B, tỷ lệ đăng ký thành công sau khi dùng BKAgent. |
| 3 | Data thuộc loại nào? | User-specific + Domain-specific + Real-time + Human-judgment (advisor feedback). |

**Có marginal value không?**  
Có. Dữ liệu hành vi đăng ký môn theo ngành tại HUST là dữ liệu đặc thù nội bộ với quy mô lớn (~35,000 sinh viên); càng nhiều kỳ đăng ký, model càng hiểu preference cộng đồng theo từng chương trình đào tạo, làm giảm edit rate theo thời gian.

---

## 2) User Stories — 5-path Experience (v2.0)

### Path 1 — Happy Path
- Trigger: Sinh viên nhập yêu cầu cụ thể (ví dụ: "Lên lịch HK 20252, tránh sáng thứ 2, phải có Giải tích 2 và Vật lý đại cương 1").
- AI action: Parse intent → query DB → CSP scheduling → đề xuất 2 lịch (Plan A + Plan B).
- UI: Visual calendar, badge "Conflict-free", cảnh báo slot gần đầy.
- Outcome: Chọn Plan A và chuẩn bị danh sách đăng ký trên dk-sis.

### Path 2 — Scenario Planning (mới)
- Trigger: AI phát hiện rủi ro lớp gần đầy (đặc biệt môn đại cương năm 1-2).
- AI action: Tạo đồng thời Plan A (tối ưu) + Plan B (dự phòng với slot khác).
- UI: Hai plan hiển thị song song, cảnh báo rõ rủi ro hết chỗ.
- Outcome: Nếu A fail trong đợt chính thì fallback B ngay trong đợt điều chỉnh.

### Path 3 — Low-confidence
- Trigger: Intent mơ hồ hoặc thiếu điều kiện (ví dụ: chưa hoàn thành tiên quyết).
- AI action: Hỏi làm rõ thay vì tự thực thi.
- UI: Clarification cards + xác nhận bắt buộc.
- Outcome: Giảm overconfidence.

### Path 4 — Failure
- Trigger: Submit thất bại do dk-sis quá tải hoặc hết slot.
- AI action: Tự phát hiện lỗi, chuyển sang phương án khả thi nhất tiếp theo.
- UI: Error reason rõ + nút "Dùng Plan B" + gợi ý đợt điều chỉnh.
- Outcome: Graceful failure.

### Path 5 — Trust Recovery
- Trigger: User mất niềm tin sau lỗi.
- AI action: Hiển thị reasoning + nguồn dữ liệu + timestamp + Advisor Brief nếu cần escalate.
- UI: Reasoning panel + Human Escalation button.
- Outcome: Khôi phục niềm tin bằng minh bạch.

---

## 3) Năm cải tiến đột phá (v2.0)

1. **Social Learning Flywheel:** học từ pattern chỉnh sửa của cộng đồng theo chương trình đào tạo (CTTT, Việt-Nhật, Việt-Pháp, chính quy).
2. **Scenario Planning (A/B):** luôn có phương án dự phòng, đặc biệt quan trọng với môn đại cương hết chỗ nhanh.
3. **Advisor Brief:** tự tóm tắt bối cảnh cho cố vấn khi escalate.
4. **Demand Forecasting:** dự báo nhu cầu mở lớp từ draft sessions, hỗ trợ phòng đào tạo lên kế hoạch.
5. **Hesitation Signals:** học từ hành vi do dự, không chỉ từ like/dislike.

---

## 4) Evaluation Metrics (v2.0)

| Chỉ số | Ngưỡng deploy | Red flag | Cách đo |
|---|---|---|---|
| Schedule Precision Rate | >85% | <70% trong 24h liên tiếp | So sánh output AI với CSP validator |
| Manual Edit Rate | <25% | >40% | Theo dõi số lần edit/session |
| Time-to-Register | <10 phút | >30 phút | first_message → register_ready |
| Plan B Activation Rate | <20% sessions | >40% | Đếm session fallback B |
| Hesitation Signal Capture | >2000/kỳ | <200/kỳ | Đếm hover_time >8s không chọn |

---

## 5) Top Failure Modes (v2.0)

| Failure mode | Trigger | Hậu quả | Mitigation |
|---|---|---|---|
| Prerequisite Hallucination | LLM tự suy diễn prereq | Đăng ký sai, bị hủy môn | Bắt buộc tool call get_prerequisites + validator độc lập |
| Stale Schedule Data | Cache cũ giờ cao điểm (dk-sis quá tải) | Plan fail khi submit | TTL 2 phút + timestamp + Plan B |
| Ambiguous Intent Overconfidence | Confidence chưa đủ nhưng auto-run | Sai nguyện vọng | Threshold auto-action = 80%, confirm bắt buộc |
| LT-BT-TN Mismatch | Không ghép đúng lớp lý thuyết + bài tập + thí nghiệm | Lịch xung đột, thiếu thành phần | Ràng buộc cứng trong CSP: cùng nhóm LT-BT-TN |
| Mã môn khóa cũ/mới | Sinh viên khóa cũ đăng ký mã môn khóa mới | Không tìm thấy môn | Mapping table mã môn theo khóa + cảnh báo |

---

## 6) ROI — 3 kịch bản + Strategic ROI

Giả định: ~35,000 sinh viên, 2 kỳ/năm, hiện mất ~4 giờ/sinh viên/kỳ (bao gồm thời gian chờ dk-sis).

| Kịch bản | Adoption/Chất lượng | Giờ tiết kiệm/năm | Tác động |
|---|---|---|---|
| Conservative | 10% SV, Precision ~70%, Edit cao | ~28,000 giờ | Giảm tải cơ bản; đủ dữ liệu cho pilot forecasting |
| Realistic | 30% SV, Precision ~87%, Edit ~22% | ~75,600 giờ | ROI tốt; giảm workload phòng đào tạo; dashboard có giá trị vận hành |
| Optimistic | 60% SV, Precision ~93%, Edit ~10% | ~151,200 giờ | Tạo lợi thế chiến lược: dự báo mở lớp sớm, giảm tải dk-sis |

**Learning Flywheel Effect:** Qua 2-3 kỳ, Edit Rate giảm dần nhờ cộng dồn dữ liệu hành vi và correction; ROI tăng theo thời gian mà không tăng chi phí tuyến tính.

---

## 7) Mini AI Spec (1 trang cho giám khảo)

- **Vấn đề:** Đăng ký tín chỉ tại HUST cực kỳ căng thẳng do dk-sis quá tải, môn đại cương hết chỗ nhanh, phải ghép lớp LT-BT-TN phức tạp.
- **Giải pháp:** BKAgent v2.0 dùng Agentic workflow để đề xuất, xác nhận và chuẩn bị kế hoạch đăng ký tối ưu với Plan A + Plan B.
- **Stack:** Gemini 2.5 Flash + LangGraph StateGraph + Mock SIS data + CSP + Next.js.
- **Trust & safety:** Confidence threshold, confirm bắt buộc, reasoning panel, Plan A/B, escalate + advisor brief.
- **Metric gates:** Precision >85%, Edit <25%, TTR <10 phút.
- **ROI realistic:** tiết kiệm ~75,600 giờ/năm cho sinh viên và giảm tải phòng đào tạo.

---

## 8) Phân công nhiệm vụ (bổ sung)

- **Đặng Đinh Tú Anh (2A202600019) — Team Lead & AI Core**
  - Quản lý backlog, viết spec, thiết kế prompt/LangGraph, triển khai confidence scoring.
  - Phụ trách cải tiến #5 Hesitation Signals.

- **Quách Gia Được (2A202600423) — Backend Engineer**
  - Xây dựng DB mock lớp học HUST, CSP algorithm với ràng buộc LT-BT-TN, API đăng ký + prerequisite validator, TTL cache.
  - Phụ trách cải tiến #4 Demand Forecasting.

- **Phạm Quốc Dũng (2A202600490) — Frontend & UX Engineer**
  - Next.js UI, visual calendar, editable plan, confidence badge, reasoning panel.
  - Phụ trách cải tiến #2 Scenario Planning UI (Plan A/B).

- **Nguyễn Thanh Nam (2A202600205) — ML & Learning Systems**
  - Correction log system, pipeline signal, bộ metrics và cảnh báo red flag.
  - Phụ trách cải tiến #1 Social Learning Flywheel.

- **Hoàng Kim Trí Thành (2A202600372) — Integration & Presentation**
  - Tích hợp end-to-end, human escalation flow, tính ROI 3 kịch bản, chuẩn bị demo.
  - Phụ trách cải tiến #3 Advisor Brief.
