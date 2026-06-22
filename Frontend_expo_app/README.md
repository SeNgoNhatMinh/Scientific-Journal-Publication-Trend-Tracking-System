# SciTrend Expo Mobile App 📱

Đây là ứng dụng di động (mobile app) dành cho **Hệ thống theo dõi xu hướng công bộ bài báo khoa học (SciTrend)**. Được xây dựng dựa trên nền tảng Expo và React Native, ứng dụng di động này đồng bộ đầy đủ các tác vụ quản trị, xem biểu đồ xu hướng và các chức năng tải lên tài liệu nghiên cứu, tối ưu để hoạt động mượt mà trên cả Android, iOS và môi trường Web di động.

---

## 🛠️ Công nghệ sử dụng

* **Nền tảng chính**: React Native & Expo (v54 SDK)
* **Định tuyến & Điều hướng**: Expo Router (điều hướng tự động dựa trên cấu trúc thư mục)
* **Kết nối mạng**: Axios (cấu hình sẵn các interceptors bảo mật)
* **Bộ Icon**: Lucide React Native & Expo Vector Icons
* **Lưu trữ dữ liệu cục bộ**: AsyncStorage

---

## ✨ Tính năng nổi bật & Cải tiến di động

### 1. Đồng bộ hóa Trang quản lý Admin
* Các màn hình thao tác nhanh phục vụ quản trị hệ thống: **Quản lý Người dùng (Users), Chủ đề (Topics), Từ khóa (Keywords), Tập san (Journals), Tác giả (Authors) và Tệp dữ liệu nghiên cứu (Corpus)**.
* Các hiệu ứng chuyển trạng thái hoạt động và các hành động xóa thực thể thời gian thực.

### 2. Các hộp thoại ghi đè hệ điều hành di động (Custom Modals)
* Thay thế hoàn toàn các hộp thoại mặc định thô sơ của Android/iOS (`Alert.alert`) bằng component [ConfirmModal](file:///e:/WDP301/Scientific-Journal-Publication-Trend-Tracking-System/Frontend_expo_app/components/ui/ConfirmModal.tsx) tự phát triển.
* Hỗ trợ giao diện kép tùy biến dạng "Alert" (Hộp thông báo) và "Confirm" (Xác nhận hành động xóa/sửa), tự động tương thích với giao diện Sáng/Tối (Light/Dark Mode) hệ thống (`useColorScheme`).
* **Hộp thoại phân quyền thành viên (Custom Role Selection Modal)**: Thiết kế menu chọn trực quan dạng radio button thay thế hoàn toàn cho menu kéo từ dưới lên (action sheet) mặc định của hệ điều hành.

### 3. Cấu hình mạng động & API linh hoạt
Tương tự như cơ chế của client web, file [Config.ts](file:///e:/WDP301/Scientific-Journal-Publication-Trend-Tracking-System/Frontend_expo_app/constants/Config.ts) sẽ phân giải địa chỉ API backend:
* Đọc các biến từ file `.env` lúc đóng gói mã nguồn (Metro build time):
  * **`EXPO_PUBLIC_USE_LOCAL_BACKEND`**: Đặt là `true` (mặc định) nếu bạn muốn dùng database localhost, hoặc đặt là `false` nếu muốn kết nối trực tiếp đến backend Railway online.
  * **`EXPO_PUBLIC_BACKEND_URL`**: Tùy chọn ghi đè URL của backend local.
* **Tự động nhận diện IP máy chủ (Host IP)**: Trong trường hợp không cấu hình biến môi trường, hệ thống tự động dò tìm địa chỉ IP của máy tính lập trình. Điều này giúp các thiết bị điện thoại thật kết nối đến backend local `localhost:5000` thông qua sóng Wi-Fi chung cực kỳ đơn giản mà không cần cấu hình thủ công.
* **Hỗ trợ gỡ lỗi kết nối (Axios Response Interceptor)**: Hệ thống chặn lỗi trong file [api.ts](file:///e:/WDP301/Scientific-Journal-Publication-Trend-Tracking-System/Frontend_expo_app/lib/api.ts) và in ra terminal các gợi ý gỡ lỗi mạng hữu ích (Ví dụ: trạng thái port, cấu hình Wi-Fi, cài đặt tường lửa máy tính) khi gặp lỗi mạng.

---

## ⚡ Hướng dẫn cài đặt & Khởi chạy

### 1. Chuẩn bị trước khi chạy
Đảm bảo bạn đã cài sẵn app **Expo Go** trên điện thoại thật của mình (tải từ App Store / Google Play Store), hoặc đã cài trình giả lập (Android Emulator / iOS Simulator) trên máy tính.

### 2. Cài đặt các thư viện cần thiết
```bash
npm install
```

### 3. Cấu hình môi trường
Tạo file `.env` ở thư mục gốc của dự án `Frontend_expo_app` (hoặc copy từ `.env.example`):
```bash
# Đặt là 'false' nếu muốn kết nối tới server Railway online
EXPO_PUBLIC_USE_LOCAL_BACKEND=true

# Tùy chọn: Ghi đè địa chỉ IP nội bộ của máy tính của bạn
# EXPO_PUBLIC_BACKEND_URL=http://localhost:5000
```

### 4. Khởi động Metro Bundler
Để khởi chạy màn hình điều khiển Expo:
```bash
npm start
```

### 5. Khởi chạy trên các thiết bị
* **Máy ảo Android**: Ấn phím `a` ở terminal hoặc chạy lệnh `npm run android`
* **Máy ảo iOS**: Ấn phím `i` ở terminal hoặc chạy lệnh `npm run ios`
* **Môi trường Web di động**: Ấn phím `w` ở terminal hoặc chạy lệnh `npm run web`
* **Điện thoại thật**: Quét mã QR code hiển thị trong terminal bằng ứng dụng Expo Go (Android) hoặc ứng dụng Camera mặc định (iOS) (Hãy chắc chắn điện thoại và máy tính kết nối cùng một sóng Wi-Fi).
