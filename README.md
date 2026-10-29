# Aurora · Bảng chấm công và tính lương

Bản giao diện hiện chỉ triển khai đúng luồng:

**Báo cáo → Bảng chấm công → Lương dưới tên nhân viên**

- Lưới chấm công theo ngày, hiển thị ca và số giờ của từng giáo viên/nhân viên.
- Dòng **Lương** dưới mỗi nhân viên mở bảng lương dạng popup căn giữa.
- Popup hiển thị lớp, số ca, số giờ, mức lương, tổng tiền, thưởng và giảm trừ.
- Sau khi **Submit**, có thể bấm **Gửi Email**; mặc định email bị tắt, và có thể bật Resend/SendGrid bằng cấu hình server.
- Các mục chức năng khác có thể bấm và chỉ hiển thị **Đang update**.
- Chấm công và danh sách nhân viên được đọc từ API FastAPI/SQLite khi backend có dữ liệu; kỳ chưa có dữ liệu sẽ hiển thị dữ liệu mẫu dự phòng.
- Submit bảng lương, thanh toán và phiếu chi được ghi vào SQLite qua các API tương ứng.
- Gửi email thật chỉ chạy khi đã cấu hình provider, API key, sender và email người nhận.

## Bật gửi email thật

Luồng email thật đã có sẵn ở backend nhưng mặc định **tắt**. Chọn Resend hoặc SendGrid, tạo API key và copy [`.env.example`](.env.example) thành `.env`. Không đặt API key trong `static/app.js` hoặc gửi key qua trình duyệt.

```dotenv
AURORA_EMAIL_PROVIDER=resend
AURORA_EMAIL_API_KEY=re_xxx
AURORA_EMAIL_FROM=Payroll <payroll@your-domain.com>
AURORA_STAFF_EMAILS_JSON={"2":"teacher@example.com","3":"staff@example.com"}
```

Sender/domain phải được xác minh ở Resend/SendGrid. `AURORA_STAFF_EMAILS_JSON` gắn email thật cho từng `staff_id`; dữ liệu mẫu không tự bịa email. Sau khi cấu hình, khởi động lại server, Submit bảng lương rồi bấm **Gửi Email**. Backend gửi HTML bảng lương qua provider và lưu trạng thái gửi. Thiếu cấu hình hoặc email người nhận thì hệ thống báo lỗi và không đánh dấu đã gửi.

Đây là thao tác gửi dữ liệu lương thật. Chỉ bật sau khi đã có sự đồng ý của người nhận và bổ sung đăng nhập/phân quyền nếu đưa hệ thống ra ngoài máy local.

## Trạng thái để demo duyệt

Bản này đủ để trình bày **luồng nghiệp vụ và giao diện**: lấy chấm công từ SQLite, mở chi tiết lương, kiểm tra ca/giờ, chọn mức lương, nhập thưởng/giảm trừ, Submit, gửi bảng lương khi provider đã bật, chọn tiền mặt hoặc chuyển khoản, thanh toán và mở phiếu chi tự tạo. Các mục điều hướng ngoài luồng trên vẫn hiện **Đang update** theo yêu cầu.

Đây là bản demo chạy local, chưa phải hệ thống production:

- Email thật cần bật riêng bằng Resend/SendGrid; khi chưa cấu hình, nút gửi sẽ báo chưa bật.
- SQLite và dữ liệu mẫu nằm trên máy chạy server; chưa có đăng nhập, phân quyền, backup hay database cloud.
- Demo hiện chạy local tại `127.0.0.1`; không mở dữ liệu lương ra Internet.
- Khoảng ngày mặc định là kỳ mẫu **01/10/2026 – 31/10/2026**. Database local còn một số bản ghi kiểm thử cũ để phục vụ việc kiểm tra luồng; khi trình bày chỉ dùng kỳ mặc định.

### Kịch bản nói trong buổi duyệt

> “Đây là prototype đã nối backend cho luồng chấm công và tính lương. Dữ liệu chấm công đọc từ SQLite. Người duyệt có thể mở Lương để xem từng mức, thêm thưởng hoặc giảm trừ, Submit và gửi bảng lương. Sang tab Lương, hệ thống chỉ hiện Thanh toán khi bảng lương đã Submit. Chọn phương thức thanh toán, bấm Thanh toán, rồi mở Các khoản đã chi để xem phiếu chi được tạo tự động.”

Nếu người duyệt hỏi “đã sẵn sàng vận hành chưa”, câu trả lời là **chưa**: bản hiện tại sẵn sàng để duyệt UX/UI và workflow; trước khi vận hành cần bổ sung xác thực, phân quyền, email thật, database dùng chung, audit log, backup và kiểm thử nghiệp vụ.

## Chạy local

Cách dễ nhất cho buổi demo: double-click file [`start_demo.bat`](start_demo.bat). File này reset các bản ghi phát sinh, chạy server tại `http://127.0.0.1:8000/` và mở trình duyệt. Khi bấm **F5**, giao diện gọi endpoint reset demo nên các bước Submit, gửi email, thanh toán và phiếu chi sẽ quay lại trạng thái ban đầu. Dữ liệu nền nhân viên, ca và chấm công vẫn giữ nguyên.

Nếu chạy bằng terminal:

```powershell
python -m uvicorn app:app --host 127.0.0.1 --port 8000
```

Mở [http://127.0.0.1:8000](http://127.0.0.1:8000). Khoảng ngày mẫu mặc định là **01/10/2026 – 31/10/2026** để khớp dữ liệu backend mẫu.

Endpoint reset chỉ bật khi `AURORA_DEMO_RESET=1` trong file `.bat`; server chạy bình thường sẽ không tự xóa dữ liệu.

## Kịch bản demo 5 phút

1. Vào **Báo cáo → Bảng chấm công**. Chỉ cho người xem thấy hệ thống đã lấy dữ liệu nhân viên, ca và số giờ từ backend.
2. Chọn **GV Thảo** hoặc **Mgr Hùng** để chạy trọn luồng, bấm **Lương** dưới tên nhân viên. Chọn mức lương, thêm thưởng/giảm trừ rồi bấm **Submit**. Dữ liệu mẫu GV Thảo đã có đủ ca sáng và tối; **GV Minh** và **NV Linh** vẫn có một số ca thiếu chấm công để trình bày trạng thái kiểm tra và khóa Submit.
3. Nếu đã cấu hình provider, bấm **Gửi Email** để gửi thật; nếu chưa, bỏ qua bước này khi demo UX.
4. Vào **Báo cáo → Lương**. Chọn **Tiền mặt** hoặc **Chuyển khoản**, sau đó bấm **Thanh toán**.
5. Mở **Các khoản đã chi** và **Chi tiết** để trình bày phiếu chi được tạo tự động.

Mỗi lần mở demo bằng `.bat` hoặc bấm F5, tất cả bản ghi Submit/thanh toán/phiếu chi được xóa để bạn chạy lại từ đầu.

## Cấu trúc dữ liệu

- `staff`, `staff_shifts`, `staff_attendance`: nhân viên, lịch ca và chấm công.
- `salary_submissions`: bảng lương sau khi Submit.
- `payment_vouchers`: giao dịch thanh toán lương.
- `expense_vouchers`: phiếu chi tự tạo sau thanh toán.
- `email_status`, `email_sent_at`, `email_provider_id`: trạng thái gửi bảng lương thật.
- `static/app.js`: giao diện gọi API, tính tổng và điều khiển popup.
- `app.py`: FastAPI, kiểm tra dữ liệu và ghi SQLite.

File `salary_test.sqlite3` là dữ liệu chạy local/demo và được loại khỏi Git bằng `.gitignore`. Khi deploy thật, cần dùng database có lưu trữ bền vững thay vì đưa file SQLite local lên public.
