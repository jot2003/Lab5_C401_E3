# Individual reflection — Phạm Quốc Dũng (2A202600490)

## 1. Role cụ thể trong nhóm
Frontend + Auth/Data integration engineer cho BKAgent. Mình phụ trách luồng xác thực người dùng theo mã sinh viên, đồng bộ dữ liệu sinh viên mock để phục vụ đăng nhập/lập kế hoạch, và chỉnh UI liên quan để flow demo chạy ổn định.

## 2. Phần phụ trách cụ thể (2-3 đóng góp có output rõ)
- Thiết kế và triển khai lại luồng đăng nhập theo mã sinh viên + mật khẩu cố định, lưu phiên localStorage, xử lý thông báo lỗi/thành công.
  - Commit liên quan: fff2865, e08fbd0, c2b9a9b, 2286b5d, 8a3f520
  - Files chính: vinagent-web/src/lib/auth.ts, vinagent-web/src/app/dang-nhap/page.tsx, vinagent-web/src/lib/auth.test.ts
- Chuẩn hóa và mở rộng dữ liệu sinh viên trong student.json theo dạng students[] để hệ thống lookup linh hoạt hơn theo ID.
  - Commit liên quan: bbba5b7, fd8cd8e
  - Files chính: vinagent-web/src/lib/mock/student.json, vinagent-web/src/lib/student-data.ts
- Điều chỉnh các màn hình/luồng liên quan sau khi đổi auth model (đăng ký, hồ sơ, sidebar) và fix test/lint để demo ổn định.
  - Commit liên quan: 0420fff, 4e6809d, ac59b55
  - Files chính: vinagent-web/src/app/dang-ky/page.tsx, vinagent-web/src/app/nguoi-dung/page.tsx, vinagent-web/src/components/app-sidebar.tsx

## 3. SPEC phần nào mạnh nhất, phần nào yếu nhất? Vì sao?
- Mạnh nhất: phần Trust + Failure modes. Nhóm có nêu rõ risk sai prereq, stale data, overconfidence và đưa cơ chế giảm rủi ro (confirm bắt buộc, validator, Plan B).
- Yếu nhất: phần ROI chưa gắn đủ với số đo kỹ thuật chạy thật tại prototype (ví dụ chưa có dashboard log đủ dài để chứng minh xu hướng theo thời gian).
- Lý do: thời gian tập trung nhiều vào hoàn thiện flow chạy được cho demo nên phần bằng chứng định lượng dài hạn còn mỏng.

## 4. Đóng góp cụ thể khác với mục 2
- Hỗ trợ merge và xử lý xung đột nhánh cá nhân với main để đảm bảo demo không vỡ luồng.
- Hỗ trợ ổn định test/lint để giảm lỗi trước giờ chốt.
- Cập nhật thêm phần UX cá nhân Day 5 (analysis + sketch) để hoàn thiện mốc cá nhân.

## 5. 1 điều học được trong hackathon mà trước đó chưa biết
Điều mình học rõ nhất là: trong AI product, chất lượng trải nghiệm phụ thuộc mạnh vào “độ nhất quán dữ liệu” chứ không chỉ vào model hay UI. Trước đây mình nghĩ login chỉ là bước vào hệ thống, nhưng khi làm thực tế mới thấy nếu contract giữa auth và student data không chặt (ID, schema, session), thì các chức năng phía sau như gợi ý kế hoạch, kiểm tra điều kiện môn, hiển thị hồ sơ đều sai dây chuyền. Bài học này làm mình thay đổi tư duy từ “làm từng màn hình” sang “thiết kế luồng end-to-end có kiểm chứng dữ liệu ở mỗi điểm nối”.

## 6. Nếu làm lại, đổi gì? (cụ thể)
- Mình sẽ chốt auth contract và schema student data sớm hơn ngay từ đầu (ID format, field bắt buộc, session key), sau đó mới build UI để tránh refactor nhiều vòng.
- Mình sẽ thêm test e2e tối thiểu cho 3 case auth chính: đăng nhập đúng, sai mật khẩu, ID không tồn tại để giảm lỗi hồi quy khi merge.
- Mình sẽ chuẩn bị sẵn 1 bảng dữ liệu sinh viên demo đa dạng hơn (năm học, chương trình, môn đã qua khác nhau) để demo thuyết phục hơn.

## 7. AI giúp gì? AI sai/mislead ở đâu?
- AI giúp:
  - Gợi ý nhanh cấu trúc hàm auth và thông điệp lỗi theo từng trạng thái đăng nhập.
  - Hỗ trợ refactor code khi đổi từ login theo tên sang login theo mã sinh viên.
  - Hỗ trợ rà lint/test nhanh trong giai đoạn cuối.
- AI sai/mislead:
  - Có lúc gợi ý thay đổi UI/flow quá rộng so với scope hackathon (dễ scope creep).
  - Một số gợi ý chưa bám chặt dữ liệu hiện có trong student.json, nếu áp dụng ngay sẽ gây mismatch giữa auth và data layer.
- Bài học: dùng AI để tăng tốc implementation, nhưng quyết định cuối phải bám đúng contract dữ liệu và mục tiêu demo.
