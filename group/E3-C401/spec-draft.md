# Product SPEC Draft — VinUni StudyFlow AI

**Team:** E3 (C401)  
**Track:** C - VinUni (AI cho giáo dục và vận hành trường học)  
**Project:** VinUni StudyFlow AI - Trợ lý tối ưu lịch ôn thi theo năng lượng cá nhân  
**Deadline Draft:** 23:59 ngày 08/04/2026

---

## Problem Statement

Trong mùa thi, sinh viên VinUni thường lập lịch ôn tập theo deadline hoặc cảm tính, không tính đúng mức năng lượng theo ngày và độ khó môn học. Kết quả là học dồn, burnout, giảm hiệu quả và bỏ dở kế hoạch giữa chừng.  
VinUni StudyFlow AI giúp sinh viên tạo lịch ôn thi linh hoạt theo mức năng lượng cá nhân, độ khó môn và mục tiêu điểm số, đồng thời cho phép chỉnh sửa nhanh khi AI chưa phù hợp.

---

## 1) AI Product Canvas (3 cột + Learning Signal)

|   | VALUE | TRUST | FEASIBILITY |
|---|-------|-------|-------------|
| **Trả lời** | **User:** sinh viên VinUni trong mùa thi (đặc biệt tuần 2-4 trước finals). **Pain:** lịch thi dày, nhiều môn chồng nhau, không biết ưu tiên môn nào trước, dễ học quá sức. **Auto/Aug:** **Augmentation** - AI đề xuất lịch, sinh viên duyệt/sửa. **Value khi AI đúng:** có lịch học thực tế theo nhịp năng lượng cá nhân, giảm burnout và tăng khả năng bám kế hoạch. | **Precision vs Recall:** ưu tiên **Precision** (đừng gợi ý lịch vô lý hoặc quá tải). **Khi AI sai:** user bỏ app, mất niềm tin, quay lại lập lịch thủ công. **Trust recovery:** bật "Showing Work" giải thích tại sao AI phân bổ thời gian; cho phép "Editable Plan" kéo-thả ngay; có follow-up hỏi lại sau 1 ngày để hiệu chỉnh. | **Cost:** 0.004-0.015 USD/lượt gợi ý (LLM + scoring), có thể giảm bằng cache. **Latency:** mục tiêu <3 giây cho lần tạo lịch, <2 giây cho lần chỉnh sửa nhỏ. **Rủi ro chính:** AI hiểu sai độ khó môn, user khai báo năng lượng sai, lịch thi thay đổi đột xuất. |

### Learning Signal (để model học theo cá nhân)

| Signal type | Thu thập như thế nào | Dùng để cải thiện gì |
|-------------|-----------------------|----------------------|
| **Implicit** | user bỏ qua block học, đổi giờ học, tỉ lệ bám lịch theo ngày | học thói quen thực tế của từng người (sáng/tối, khả năng tập trung) |
| **Explicit** | user đánh giá "Lịch hợp lý/không hợp lý", rating stress 1-5 | điều chỉnh trọng số workload và nghỉ ngơi |
| **Correction** | user kéo-thả block, đổi môn, giảm/tăng thời lượng | fine-tune bộ quy tắc phân bổ thời gian theo profile cá nhân |

**Flywheel:** càng nhiều correction theo từng user, lịch càng khớp nhịp sinh học của user đó; càng khớp thì adherence càng cao; adherence cao tạo thêm data chất lượng.

---

## 2) User Stories với 4-path Experience (trọng tâm)

### Core feature
Tạo lịch ôn thi 7 ngày dựa trên: lịch thi, độ khó môn, năng lượng theo khung giờ, mục tiêu điểm.

### Path 1 - Happy path

**Story:** Là sinh viên, tôi muốn nhận lịch ôn thi hợp lý để chỉ cần bấm "Chấp nhận" và học theo.

**Flow:**
1. User nhập lịch thi + mục tiêu GPA.
2. AI tạo StudyFlow Plan theo môn khó/dễ + mức năng lượng trong ngày.
3. UI hiển thị kế hoạch tuần: block học, block nghỉ, block review.
4. User bấm **Accept Plan**.
5. App gửi nhắc việc và check-in cuối ngày.

**UI dùng:** Prompt -> Plan Card -> Accept -> Follow-up.

### Path 2 - Low-confidence (<60%)

**Story:** Là sinh viên, khi AI không chắc môn nào khó với tôi, tôi muốn hệ thống hỏi lại thay vì đoán.

**Flow:**
1. AI thấy thiếu dữ liệu cá nhân (vd chưa có lịch học cũ).
2. Confidence <0.6 cho thứ tự ưu tiên môn.
3. Hệ thống hỏi xác nhận:  
   - "Môn Triết học hay môn Python khiến bạn tốn nhiều năng lượng hơn?"  
   - "Bạn tập trung tốt nhất vào khung giờ nào?"
4. User trả lời nhanh bằng chips.
5. AI cập nhật lịch mới theo câu trả lời.

**UI dùng:** Prompt clarifier + quick options + Follow-up confirm.

### Path 3 - Failure/Wrong

**Story:** Là sinh viên, khi AI xếp lịch quá nặng (vd 8 tiếng liên tục), tôi muốn sửa ngay không cần làm lại từ đầu.

**Flow:**
1. AI đề xuất lịch có block 8h liên tục (không nghỉ đủ).
2. User bấm **Not realistic**.
3. Mở **Editable Plan**:
   - kéo-thả block
   - giảm thời lượng
   - thêm break
4. AI tự cân bằng lại phần còn lại trong tuần.
5. User lưu bản chỉnh sửa.

**UI dùng:** Editable Plan (drag-and-drop), instant recalculation.

### Path 4 - Loss of trust / Recovery

**Story:** Là sinh viên, khi thấy lịch quá nặng và muốn bỏ app, tôi cần hiểu "vì sao AI đề xuất như vậy" để cân nhắc tiếp tục dùng.

**Flow:**
1. User bấm "Lịch này quá nặng".
2. Hệ thống bật **Showing Work**:
   - "Bạn còn 6 ngày đến thi môn X"
   - "Điểm quiz gần nhất của bạn cho môn X là thấp"
   - "Bạn đặt mục tiêu A nên cần thêm 2 giờ review"
3. Hệ thống đưa 2 lựa chọn:
   - "Giảm mục tiêu điểm để giảm tải"
   - "Giữ mục tiêu, chia nhỏ thành 2 phiên/ngày"
4. User chọn một phương án và cập nhật plan.

**UI dùng:** Showing Work + recovery options + Follow-up sau 24h.

---

## 3) Evaluation Metrics

### 3 chỉ số chính

1. **Plan Adherence Rate**  
   - Tỷ lệ user hoàn thành >=70% block học theo lịch mỗi tuần  
   - Target: **>70%**

2. **Correction Rate**  
   - % block do AI đề xuất bị user sửa/xóa trong 24h đầu  
   - Target: **<25%** sau tuần pilot thứ 2

3. **Post-exam Satisfaction**  
   - Điểm hài lòng sau mùa thi (thang 1-5)  
   - Target: **>=4.0/5**

### Threshold deploy

- Độ chính xác dự báo thời gian học cần thiết cho từng môn: **>80%**
- Nếu chưa đạt threshold thì chỉ triển khai dạng "beta opt-in" cho nhóm nhỏ.

### Red flags (dừng/bảo trì)

- Tỷ lệ user xóa lịch AI lập >30%
- Correction rate tăng liên tiếp 3 ngày
- User report "burnout tăng" >15% trong tuần
- Latency >3 giây với thao tác chỉnh sửa đơn giản

---

## 4) Top 3 Failure Modes (Thư viện lỗi)

| # | Trigger | Hậu quả | Mitigation |
|---|---------|---------|------------|
| 1 | User khai báo mức năng lượng sai (hoặc quá lạc quan) | Lịch học quá tải, dễ bỏ cuộc sau 1-2 ngày | Cho phép chỉnh năng lượng realtime theo ngày; check-in đầu ngày "hôm nay năng lượng thế nào?" để auto-replan |
| 2 | Trường thay đổi lịch thi đột xuất | Plan cũ vô dụng, user mất tin | Đồng bộ dữ liệu lịch thi định kỳ qua API/file import; nếu phát hiện thay đổi thì auto notify + replan một chạm |
| 3 | Hallucination về độ khó môn hoặc ước lượng sai effort | Gợi ý học quá ít cho môn khó, ảnh hưởng điểm thi | Cho user tự gán độ khó môn (1-5), ưu tiên dữ liệu thật (điểm quiz, lịch sử học), và bắt buộc hiển thị "confidence + lý do" |

---

## 5) ROI trong 3 kịch bản

### Giả định

- 1 user lập lịch ôn thi trung bình 2-3 lần/tuần
- Thời gian lập lịch thủ công hiện tại: ~90 phút/tuần
- Tỷ lệ stress cao trong mùa thi ảnh hưởng trực tiếp tới hiệu suất học

| Kịch bản | Chất lượng AI | Tác động chính | ROI định tính |
|----------|----------------|----------------|---------------|
| **Conservative** | AI như lịch điện tử thông minh, cá nhân hóa thấp | Tiết kiệm ~1 giờ/tuần cho mỗi sinh viên | ROI dương nhẹ, chủ yếu giảm thời gian lập kế hoạch |
| **Realistic** | AI cá nhân hóa khá, correction vừa phải | Giảm ~20% mức stress tự báo cáo; tăng ~5% điểm trung bình môn | ROI tốt: cải thiện cả wellbeing lẫn kết quả học |
| **Optimistic** | Flywheel hoạt động mạnh, dự báo effort rất chuẩn | Dự báo chính xác ~95% thời gian cần để đạt mục tiêu A theo môn | ROI rất cao: nền tảng có thể mở rộng thành trợ lý học tập cá nhân toàn trường |

---

## 6) Mini AI Spec (1 trang nộp giám khảo)

### VinUni StudyFlow AI - Mini Spec

**Bài toán:** Sinh viên mùa thi bị quá tải do lập lịch theo deadline, không theo năng lượng thực tế.  
**Giải pháp:** Trợ lý AI dạng augmentation tạo lịch ôn thi theo độ khó môn + mức năng lượng cá nhân, cho phép chỉnh sửa nhanh và giải thích quyết định.

**Điểm khác biệt:**
- Tối ưu theo "năng lượng cá nhân" thay vì chỉ deadline
- Có Editable Plan (kéo-thả sửa lịch tức thì)
- Có Showing Work để khôi phục trust khi user nghi ngờ

**4-path UX:**
- Happy: tạo lịch chuẩn, user accept ngay
- Low-confidence: hỏi làm rõ môn nào tốn năng lượng hơn
- Failure: lịch quá nặng -> user sửa trực tiếp
- Loss of trust: AI giải thích lý do + đưa phương án nhẹ hơn

**Eval gates:**
- Adherence >70%
- Effort prediction accuracy >80%
- Nếu xóa lịch >30% -> dừng, tune lại model

**Failure control:**
- Realtime energy check-in
- Auto replan khi lịch thi đổi
- User-defined difficulty + confidence transparency

**Success definition:**
- Sinh viên bám lịch tốt hơn, stress thấp hơn, điểm thi cải thiện.

---

## Phân công đề xuất

- Thành viên A: Canvas + Learning signal
- Thành viên B: 4-path UX + prototype flow
- Thành viên C: Metrics + threshold + dashboard
- Thành viên D: Failure modes + mitigation
- Thành viên E: ROI + Mini spec + pitch

