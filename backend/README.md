# SciTrend Backend Server 🚀

Đây là server backend dành cho **Hệ thống theo dõi xu hướng công bố bài báo khoa học (SciTrend)**. Server cung cấp các API endpoint cho việc xác thực người dùng, các mô-đun quản trị của Admin, xử lý tệp dữ liệu nghiên cứu (corpus), giám sát AI và tính toán số liệu thống kê xu hướng.

---

## 🛠️ Công nghệ sử dụng

* **Môi trường chạy**: Node.js
* **Framework**: Express.js
* **Cơ sở dữ liệu**: MongoDB (quản lý qua Mongoose ODM)
* **Xác thực**: JSON Web Tokens (JWT) & mã hóa bcryptjs
* **Tài liệu API**: Swagger API Documentation (truy cập qua `/api-docs`)
* **Kiến trúc**: RESTful API

---

## ✨ Các tính năng chính

### 1. Xác thực & Bảo mật (`authController.js`)
* **Đăng ký & Đăng nhập**: Xác thực phiên làm việc bằng mã JWT token.
* **Mã xác thực OTP**: Gửi mã OTP xác thực qua email để khôi phục mật khẩu.
* **Quản lý tài khoản**: Xem thông tin cá nhân và thay đổi mật khẩu.

### 2. Quản trị người dùng (`userController.js`)
* **Phân quyền người dùng**: Thay đổi vai trò người dùng (Ví dụ: chuyển giữa `Admin` và `User`).
* **Khóa/mở khóa tài khoản**: Tạm thời vô hiệu hóa hoặc kích hoạt lại tài khoản.
* **Xóa tài khoản**: Xóa hoàn toàn bản ghi người dùng khỏi hệ thống.

### 3. Quản lý thực thể nghiên cứu (CRUD)
* **Chủ đề & Từ khóa (`topicController.js`, `keywordController.js`)**: Thêm, sửa, tìm kiếm và xóa các chủ đề khoa học và từ khóa.
* **Tập san & Tác giả (`journalController.js`, `authorController.js`)**: Quản lý thông tin nhà xuất bản, trạng thái hoạt động và các tác giả nghiên cứu.

### 4. Xử lý tập dữ liệu & Trích xuất AI
* **Tải tệp nghiên cứu (`corpusController.js`)**: Upload các tệp PDF/text nghiên cứu khoa học.
* **Phân tích metadata bài báo (`paperController.js`)**: Trích xuất tiêu đề, năm xuất bản, tóm tắt bài báo và danh sách tác giả từ file upload.
* **Tiến trình xử lý AI (`aiController.js`)**: Giám sát tiến độ trích xuất văn bản khoa học, quản lý hàng đợi phân loại và kiểm tra sức khỏe hệ thống AI.

### 5. Công cụ tính toán xu hướng (`trendController.js`)
* Tính toán tỷ lệ tăng trưởng xuất bản, biểu đồ phân phối từ khóa, và sự thay đổi chủ đề theo từng năm.

---

## 📂 Cấu trúc thư mục

```
backend/
├── src/
│   ├── config/          # Kết nối CSDL & cấu hình server
│   ├── controllers/     # Tầng điều khiển xử lý logic Request-Response
│   ├── middlewares/     # Middleware xác thực, phân quyền và tải file
│   ├── models/          # Khai báo cấu trúc các bảng MongoDB (Mongoose Schema)
│   ├── routes/          # Định tuyến các endpoint API
│   ├── services/        # Xử lý logic nghiệp vụ (AI, tính toán xu hướng...)
│   ├── swagger/         # Cấu hình tài liệu Swagger API
│   └── server.js        # Điểm khởi chạy Server
├── uploads/             # Thư mục lưu trữ tệp nghiên cứu tải lên
├── .env.example         # File mẫu cấu hình biến môi trường
└── package.json         # Cấu hình dự án & kịch bản lệnh chạy
```

---

## ⚡ Hướng dẫn cài đặt & Chạy ứng dụng

### 1. Yêu cầu hệ thống
Đảm bảo máy tính đã cài đặt [Node.js](https://nodejs.org/) (phiên bản 16+) và [MongoDB](https://www.mongodb.com/) đang hoạt động.

### 2. Cài đặt các thư viện cần thiết
```bash
npm install
```

### 3. Cấu hình biến môi trường
Sao chép file `.env.example` thành `.env` và điền đầy đủ các thông tin:
```bash
PORT=5000
MONGO_URI=mongodb://localhost:27017/scitrend
JWT_SECRET=ma_khoa_jwt_bao_mat_cua_ban
```

### 4. Khởi chạy Server
* **Chế độ phát triển (Tự động tải lại khi sửa code)**:
  ```bash
  npm run dev
  ```
* **Chế độ production**:
  ```bash
  npm start
  ```

Sau khi khởi chạy thành công, các API backend sẽ hoạt động tại địa chỉ `http://localhost:5000/api/v1` và trang tài liệu tương tác Swagger sẽ có tại `http://localhost:5000/api-docs`.
