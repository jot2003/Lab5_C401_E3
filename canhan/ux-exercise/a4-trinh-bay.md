# UX — Vietnam Airlines NEO (1 trang A4)

**[Họ tên] · [Mã HV] · [Ngày]**

**Hình minh họa:** thư mục `Neo_image/` (2 screenshot chat + PDF giới thiệu). Chi tiết xem `analysis.md` mục 2b.

---

## Case test

User hỏi **hành lý chuyến VN205** → bot đưa **bảng nội địa theo hạng** → user: **“không đúng website”** → bot xin thêm hạng / hành trình / mã vé → user gõ **vn205** → bot **lặp** yêu cầu → user nói **Phổ thông** → bot chốt **1 kiện 23kg** (vẫn mang tính chung).

---

## 4 paths (tóm tắt)

| Path | Quan sát |
|------|-----------|
| **1 Đúng** | Bảng hạng + Phổ thông 23kg: rõ cho **tier chung**. |
| **2 Không chắc** | Sau “sai website” có xin thêm info — **đúng hướng**; nhưng **vn205** không được hiểu → **lặp template**, **kẹt**. |
| **3 Failure** | Trả lời **như đã đủ** dù hỏi theo **chuyến**; risk **áp nhận nhầm**; recover kém (không parse mã chuyến). |
| **4 Mất tin** | User báo **không khớp website** nhưng **chưa có** link verify / **tư vấn viên** nổi bật ngay. |

**Path yếu nhất:** **2** (+ rủi ro **3**) — làm rõ **hình thức** nhưng **không tiến** khi user đưa **VN205**.

---

## Gap marketing vs thực tế

**Hứa:** trợ lý, nhanh, tiện, hiểu bối cảnh. **Thực tế:** FAQ/rule + input lệch pattern thì **lặp lệnh**. **Gap:** kỳ vọng “thông minh” vs **thiếu bước cụ thể + verify + human** lúc mất tin.

---

## Sketch (vẽ lại lên giấy — 2 cột)

**As-is**          | **To-be**
-------------------|--------------------------------------------------
① Hỏi VN205        | ① Hỏi VN205
② Bảng chung       | ② Hỏi: **Chung** / **Theo vé**?
③ “Sai website”    | ③ Nhận **VN205** → xin **ngày bay** hoặc **mã đặt chỗ**
④ Xin thêm info    | ④ Nếu mất tin → **Link chính sách** + **Tư vấn viên**
⑤ vn205 → **lặp** **X** | ⑤ Chốt theo vé **hoặc** chuyển người **+**

*(In khổ A4 dọc, cỡ chữ 10–11pt; hoặc chép bảng + 2 cột sketch bằng tay.)*

---

## 1 câu kết

NEO ổn cho câu **chuẩn menu**; với **mã chuyến** cần **nhánh luồng + parse + trust tools** để tránh **vòng lặp** và **lệch ngữ cảnh**.
