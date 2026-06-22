# SciTrend Web Frontend 💻

Đây là giao diện web khách hàng (client) dành cho **Hệ thống theo dõi xu hướng công bố bài báo khoa học (SciTrend)**. Được phát triển dựa trên các công nghệ web hiện đại, hệ thống tích hợp trực quan hóa dữ liệu nghiên cứu, bảng phân tích xu hướng tương tác và bảng điều khiển dành cho quản trị viên (Admin).

---

## 🛠️ Công nghệ sử dụng

* **Thư viện giao diện chính**: React (v19)
* **Trình đóng gói & Biên dịch**: Vite & TypeScript
* **Định dạng phong cách (CSS)**: TailwindCSS & các biến CSS Glassmorphic tùy biến
* **Bộ thư viện UI**: Shadcn UI (Radix Primitives)
* **Vẽ biểu đồ**: Recharts
* **Thư viện gọi API**: Axios

---

## ✨ Các trang & Tính năng chính

### 1. Bảng điều khiển trực quan (Dashboard)
* Biểu đồ động hiển thị số lượng bài báo khoa học xuất bản qua các năm, tỉ lệ phân phối từ khóa, biểu đồ tăng trưởng chủ đề và thống kê các nhà xuất bản lớn.
* Các bảng danh sách lọc dữ liệu và thanh công cụ tìm kiếm bài báo tiên tiến.

### 2. Trang quản lý Admin (Admin Panel)
* **Trang Người dùng**: Xem danh sách thành viên, khóa/mở khóa tài khoản, phân quyền (`Admin` / `User`) và xóa tài khoản.
* **Trang Chủ đề & Từ khóa**: Thêm chủ đề nghiên cứu mới, loại bỏ từ khóa trùng lặp và cập nhật từ điển hệ thống.
* **Trang Tập san & Tác giả**: Quản lý các nhà xuất bản tạp chí nghiên cứu khoa học, cấu hình chỉ mục phân loại và cập nhật hồ sơ tác giả.
* **Trang Dữ liệu & Xử lý (Corpus)**: Tải lên các file tài liệu định dạng văn bản/PDF, kích hoạt hệ thống trích xuất văn bản tự động và giám sát tiến độ phân tích AI.

### 3. Hội thoại Glassmorphism tùy chỉnh (Custom Dialogs)
* Loại bỏ hoàn toàn các hộp thoại mặc định thô sơ của trình duyệt như `window.confirm()` hay `window.alert()`.
* Thay thế bằng component [ConfirmDialog](file:///e:/WDP301/Scientific-Journal-Publication-Trend-Tracking-System/frontend/src/components/ui/confirm-dialog.tsx) được thiết kế theo phong cách kính mờ (Glassmorphism), đồng bộ hoàn toàn với giao diện Sáng/Tối (Light/Dark Mode).

---

## ⚙️ Cấu hình Proxy và Môi trường

Máy chủ phát triển (Vite Dev Server) sử dụng cấu hình Proxy trong [vite.config.ts](file:///e:/WDP301/Scientific-Journal-Publication-Trend-Tracking-System/frontend/vite.config.ts) để chuyển tiếp yêu cầu đến server backend tương ứng:

* **Mục tiêu Proxy Local**: Chuyển tiếp tới `http://localhost:5000` (hoặc `process.env.VITE_BACKEND_URL` nếu được đặt).
* **Mục tiêu Proxy Railway**: Chuyển tiếp tới `https://scientific-journal-publication-trend-tracking-sy-production.up.railway.app` khi bạn cấu hình biến môi trường `VITE_USE_LOCAL_BACKEND = 'false'`.

---

## ⚡ Hướng dẫn cài đặt & Khởi chạy

### 1. Cài đặt các thư viện liên quan
```bash
npm install
```

### 2. Khởi chạy ở chế độ phát triển
Mặc định, server Vite sẽ kết nối tới backend đang chạy dưới máy cá nhân của bạn ở cổng `localhost:5000`.
```bash
npm run dev
```

### 3. Đóng gói cho Production
Để build và xuất bản các file HTML/JS/CSS tĩnh:
```bash
npm run build
```

Các file sau khi build sẽ được tạo trong thư mục `dist`.
