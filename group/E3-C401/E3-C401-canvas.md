# E3-C401 Canvas — Vietnam Airlines NEO+

## Canvas

|   | VALUE | TRUST | FEASIBILITY |
|---|-------|-------|-------------|
| **Trả lời** | **User:** Hành khách (chưa mua vé / đã có mã đặt chỗ), nhân viên CSKH/đại lý cần tra nhanh policy. **Pain:** Tìm policy khó; câu hỏi nhiều điều kiện; trả lời sai gây hậu quả lớn (ra sân bay mới biết thiếu điều kiện). **Value khi AI đúng:** Trả lời nhanh, nêu rõ điều kiện áp dụng, có link nguồn chính thức, có checklist bước tiếp theo. | **Ưu tiên metric:** Precision cho policy quan trọng (hành lý/hoàn-đổi/giấy tờ). **Khi AI không chắc:** Bắt buộc hỏi làm rõ (route, ngày bay, hạng vé, mã đặt chỗ) + đưa lựa chọn rõ ràng. **Khi AI sai/user phản đối:** Có verify path (link nguồn + tóm tắt điều kiện đã dùng + nút chuyển người). **Trust recovery:** Reasoning ngắn + trích dẫn; phân biệt rõ “quy định chung” và “theo vé của bạn”. | **Mục tiêu cost/latency:** <3 giây cho FAQ đơn giản; <6 giây cho câu cần tra cứu nhiều trang. **Dependency:** Kho policy/FAQ chính thức, cập nhật thường xuyên, search/index ổn định. **Rủi ro chính:** Policy thay đổi, trả lời thiếu điều kiện, hallucination nếu không grounded, lỗi parse mã chuyến/mã đặt chỗ. |

---

## Automation hay augmentation?

☐ Automation — AI làm thay, user không can thiệp  
☑ Augmentation — AI gợi ý, user xác nhận/cung cấp điều kiện; có chuyển tư vấn viên

**Justify:** Sai sót ở policy hàng không có hậu quả cao (mất thời gian, phí phát sinh, trễ chuyến), nên không nên tự động hóa hoàn toàn. Cách phù hợp là AI gợi ý có điều kiện + nguồn, user xác nhận, và luôn có lối thoát sang người thật.

---

## Learning signal

| # | Câu hỏi | Trả lời |
|---|---------|---------|
| 1 | User correction đi vào đâu? | Log đầy đủ: câu hỏi, điều kiện đã dùng, câu trả lời, thao tác sửa của user, kết quả escalation cuối. |
| 2 | Product thu signal gì để biết tốt lên hay tệ đi? | Tỷ lệ resolved không cần chuyển người, tỷ lệ “không đúng”, số vòng chat, CTR vào link nguồn, tỷ lệ quay lại hỏi cùng intent. |
| 3 | Data thuộc loại nào? | Domain-specific (policy Vietnam Airlines), Real-time (lịch/chính sách cập nhật), Human-judgment (nhãn đúng/sai từ CSKH). |

**Có marginal value không?**  
Có. Mapping “câu hỏi mơ hồ -> clarifying question đúng” và “policy mapping theo route/fare” là dữ liệu đặc thù của bài toán, tạo lợi thế vận hành theo thời gian.

---

## 2) Thiết kế “Reasoning + Trích dẫn” để không phản tác dụng

### Output format chuẩn

- **Answer (1-2 câu):** Kết luận ngắn, đi thẳng vào nhu cầu user.
- **Why (2-4 bullet):** Nêu điều kiện đã dùng (hành trình, hạng vé, loại vé, thời điểm).
- **Sources (1-3 nguồn):** Link/đoạn trích có tiêu đề + section, ưu tiên nguồn chính thức.
- **Need to confirm:** Nếu thiếu dữ liệu thì hỏi đúng 1-2 câu + nút lựa chọn.

### Quy tắc bắt buộc (anti-hallucination)

- Nếu không có nguồn phù hợp trong kho: không trả lời chắc chắn; hiển thị “Mình chưa thể xác nhận từ tài liệu chính thức” + nút “Gặp tư vấn viên”.
- Nếu câu hỏi phụ thuộc điều kiện: bắt buộc user chọn/nhập điều kiện trước, không đoán.

---

## 3) UX theo 4 paths

### Path 1 — AI đúng
- Trả lời đúng + CTA rõ (mở trang policy, bước tiếp theo).

### Path 2 — AI không chắc
- Hỏi làm rõ (route/hạng vé/mã đặt chỗ) + cho chọn “quy định chung” hoặc “theo vé”.

### Path 3 — AI sai
- User báo sai -> hiển thị nguồn + “điều kiện đã dùng” + cho sửa điều kiện nhanh tại chỗ.

### Path 4 — Mất tin
- Luôn có “Gặp tư vấn viên/hotline” + “Xem nguồn chính thức” để thoát an toàn.

---

## 4) Failure Modes (bảng mini)

| Failure mode | Trigger | Hậu quả | Mitigation |
|---|---|---|---|
| Thiếu điều kiện nhưng trả lời như chắc chắn | User hỏi mơ hồ, hệ thống không hỏi lại | User hiểu sai, thao tác sai ngoài đời | Bắt buộc clarifying questions trước khi trả lời chắc |
| Nguồn lỗi thời | Policy đã đổi nhưng index chưa cập nhật | Trả lời đúng cú pháp nhưng sai thực tế | Versioning nguồn + ngày cập nhật + cảnh báo “policy có thể thay đổi” |
| Trích dẫn không khớp câu trả lời | Retrieval lệch đoạn, model suy diễn quá tay | Mất niềm tin, khó kiểm chứng | Kiểm tra citation match trước khi hiển thị |
| User nhập mã chuyến/đặt chỗ bot không hiểu | Format không chuẩn, parser yếu | Vòng lặp hỏi lại, tăng ma sát | Chuẩn hóa parser + gợi ý format nhập liệu |

---

## 5) Eval (bộ chỉ số vận hành)

- **Citation accuracy:** % câu trả lời có nguồn và nguồn thực sự support câu trả lời.
- **Policy correctness (precision):** Audit 50-100 câu hỏi trọng yếu (hành lý/đổi vé/giấy tờ).
- **Clarification success rate:** % câu mơ hồ được làm rõ trong <= 2 vòng.
- **Escalation quality:** Khi chuyển người có kèm context đầy đủ để giảm hỏi lại.

---

## 6) Gợi ý triển khai ngắn (để demo)

1. Kho dữ liệu policy chuẩn hóa theo chủ đề (hành lý, hoàn-đổi, check-in, giấy tờ).
2. Router câu hỏi: FAQ đơn giản vs câu cần điều kiện.
3. UI 4 vùng cố định: Answer / Why / Sources / Need to confirm.
4. Bảng log feedback: không đúng, sửa điều kiện, chuyển người, kết quả cuối.

---

## 7) Kết luận

Giải pháp NEO+ không cố “trả lời mọi thứ”, mà ưu tiên trả lời có điều kiện, có nguồn, có cơ chế phục hồi niềm tin. Trọng tâm là giảm sai sót ở tình huống rủi ro cao và tăng khả năng hoàn tất tác vụ cho hành khách ngay trong một phiên chat.
