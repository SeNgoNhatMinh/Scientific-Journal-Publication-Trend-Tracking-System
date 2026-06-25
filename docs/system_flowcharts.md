# Biểu đồ Luồng Chức năng Hệ thống (System Flowchart)

Dưới đây là biểu đồ **Flowchart** thể hiện hành trình của người dùng và sự liên kết giữa các chức năng cốt lõi trong hệ thống (từ khi truy cập đến khi sử dụng các tính năng phân tích chuyên sâu).

```mermaid
flowchart TD
    %% Định nghĩa các node bắt đầu
    Start(["Truy cập Hệ thống"]) --> CheckAuth{"Đã đăng nhập?"}

    %% Nhánh Auth
    CheckAuth -->|Chưa| Landing["Trang chủ / Landing Page"]
    Landing --> Auth["Đăng nhập / Đăng ký"]
    Auth --> CheckAuth
    Auth -.-> ForgotPass["Quên mật khẩu"]

    %% Bảng Điều khiển chính (Sau khi Login)
    CheckAuth -->|"Đã Login"| Dashboard("Bảng điều khiển chính")

    %% Các Module chính từ Dashboard
    Dashboard --> ModSearch["1. Cỗ máy Tìm kiếm (Search)"]
    Dashboard --> ModTrends["2. Phân tích Xu hướng (Trends)"]
    Dashboard --> ModLibrary["3. Quản lý Thư viện (Workspaces)"]
    Dashboard --> ModAdmin["4. Trang Quản trị (Admin)"]

    %% 1. Chi tiết module Tìm kiếm
    ModSearch --> InputQuery["Nhập từ khóa / DOI / Tác giả"]
    InputQuery --> FetchAPI["Gọi API OpenAlex / Crossref / arXiv"]
    FetchAPI --> Results["Hiển thị Danh sách Bài báo"]
    
    Results --> ViewPaper["Xem Chi tiết Bài báo"]
    ViewPaper --> ActionSave["Lưu vào Thư viện / Workspace"]
    ViewPaper --> ActionAI["Sinh Tóm tắt bằng AI (Gemini)"]
    ViewPaper --> ActionCite["Trích xuất định dạng Citation"]

    %% 2. Chi tiết module Xu hướng (Trends)
    ModTrends --> InputTrend["Nhập Từ khóa cần phân tích"]
    InputTrend --> CalcGrowth["Tính toán Tốc độ tăng trưởng qua các năm"]
    CalcGrowth --> ChartLine["Vẽ biểu đồ đường (Line Chart)"]
    ChartLine --> RelatedKw["Phân tích Từ khóa liên quan (Related Keywords)"]
    RelatedKw --> GenAITrend["AI Đánh giá Xu hướng (Trending Insights)"]
    GenAITrend --> SubTopic["Đăng ký nhận thông báo Topic này"]

    %% 3. Chi tiết module Thư viện (Library/Workspaces)
    ModLibrary --> ListWS["Xem danh sách Workspaces"]
    ListWS --> CreateWS["Tạo Workspace mới"]
    ListWS --> ViewWS["Mở một Workspace"]
    ViewWS --> ListPapers["Xem các bài báo đã lưu"]
    ListPapers --> FilterSort["Lọc / Sắp xếp"]
    ListPapers --> Export["Xuất danh sách (Export)"]

    %% 4. Chi tiết module Admin (Chỉ dành cho Admin)
    ModAdmin --> AdmUsers["Quản lý Người dùng"]
    ModAdmin --> AdmData["Quản lý Data Sources (Bật/Tắt)"]
    ModAdmin --> AdmLogs["Xem Audit Logs (Nhật ký hệ thống)"]

    %% Liên kết chéo giữa các chức năng
    ActionSave -.-> ViewWS
    SubTopic -.-> Notification(("Hệ thống Gửi Email / Thông báo"))

    %% Phân màu (Styling)
    classDef auth fill:#f9d0c4,stroke:#333,stroke-width:2px;
    classDef core fill:#d4edda,stroke:#333,stroke-width:2px;
    classDef ai fill:#cce5ff,stroke:#333,stroke-width:2px;
    classDef ext fill:#fff3cd,stroke:#333,stroke-width:2px;

    class CheckAuth,Auth,Landing auth;
    class ModSearch,ModTrends,ModLibrary,ModAdmin core;
    class ActionAI,GenAITrend ai;
    class FetchAPI,Notification ext;
```

### Giải thích các Nhóm Chức năng Chính:

1. **Nhóm Xác thực (Màu Đỏ Nhạt):** Người dùng chưa đăng nhập sẽ đi qua Landing Page, thực hiện Đăng nhập hoặc Đăng ký.
2. **Nhóm Tính năng Lõi (Màu Xanh Lá):** Từ Bảng điều khiển, người dùng có thể rẽ nhánh vào 4 module chính của hệ thống.
3. **Nhóm AI (Màu Xanh Dương):** Bất cứ khi nào người dùng xem chi tiết bài báo hoặc xem xu hướng từ khóa, họ có thể sử dụng sức mạnh của AI (Gemini) để sinh tóm tắt hoặc nhận xét về độ hot của xu hướng.
4. **Nhóm Tương tác Ngoại cảnh (Màu Vàng):** Bao gồm việc hệ thống Fetch dữ liệu từ OpenAlex/Crossref hoặc các Background Job chạy ngầm để gửi Email thông báo (Notification) khi có bài báo mới thuộc Topic đã đăng ký.
