# Sơ đồ Luồng Hoạt động Hệ thống (System Flows)

Dựa trên cấu trúc Frontend (Vite/React) và Backend (Node.js/Express) cùng tài liệu đặc tả, dưới đây là các luồng chạy chính của hệ thống.

## 1. Luồng Xác thực người dùng (Authentication Flow)
Quá trình đăng nhập, đăng ký và lấy token để truy cập các tài nguyên bảo mật.

```mermaid
sequenceDiagram
    participant U as User / Browser
    participant FE as Frontend (AuthPage)
    participant BE as Backend (authRoutes)
    participant DB as MongoDB (User Model)

    U->>FE: Nhập Email & Password
    FE->>BE: POST /api/auth/login
    BE->>DB: Tìm User bằng Email
    DB-->>BE: Trả về thông tin User + Hashed Password
    BE->>BE: So sánh Hashed Password bằng bcrypt
    alt Sai mật khẩu
        BE-->>FE: 401 Unauthorized
        FE-->>U: Hiển thị lỗi
    else Đúng mật khẩu
        BE->>BE: Tạo JWT Token
        BE-->>FE: 200 OK + JWT Token + User Info
        FE->>FE: Lưu Token (Local Storage / Context)
        FE-->>U: Chuyển hướng tới Trang chủ / Dashboard
    end
```

## 2. Luồng Tìm kiếm và Truy xuất Bài báo (Paper Search Flow)
Cho phép người dùng tìm kiếm bài báo khoa học từ các nguồn bên ngoài (OpenAlex, Crossref, arXiv) thông qua Backend.

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend (SearchPage)
    participant BE as Backend (paperRoutes/academicApiService)
    participant Ext as External APIs (OpenAlex, etc.)
    participant DB as MongoDB (SearchHistory)

    U->>FE: Nhập từ khóa tìm kiếm (VD: "Federated Learning")
    FE->>BE: GET /api/papers/search?q=...
    BE->>DB: Lưu lịch sử tìm kiếm (SearchHistory)
    BE->>Ext: Gửi request tới OpenAlex/Crossref...
    Ext-->>BE: Trả về dữ liệu thô bài báo
    BE->>BE: Chuẩn hóa dữ liệu (Format mapping)
    BE-->>FE: Trả về danh sách bài báo
    FE-->>U: Hiển thị kết quả tìm kiếm (Grid / List)
```

## 3. Luồng Phân tích Xu hướng Từ khóa (Keyword & Trend Analysis Flow)
Đây là tính năng cốt lõi của hệ thống, bao gồm truy xuất và tính toán tốc độ tăng trưởng của các từ khóa học thuật.

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend (TrendsPage)
    participant BE as Backend (trendController)
    participant API as academicApiService
    participant DB as MongoDB (Keyword/Trend Model)

    U->>FE: Yêu cầu xem xu hướng từ khóa "IoT"
    FE->>BE: GET /api/v1/trends/related-keywords?keyword=IoT
    BE->>API: Gọi hàm getRelatedKeywordsTrend()
    API->>API: Gửi Request lấy tần suất tổng (freqResp)
    API->>API: Lặp tuần tự lấy dữ liệu co-trends theo năm (Delay chống rate limit)
    API->>API: Gửi Request lấy bài báo mẫu (papersResp)
    API-->>BE: Trả về mảng dữ liệu Keyword & Growth Rate theo năm
    BE->>DB: Lưu lại kết quả xu hướng (Caching / History)
    BE-->>FE: Trả về dữ liệu xu hướng dạng JSON
    FE->>FE: Render biểu đồ (Recharts/Chart.js)
    FE-->>U: Hiển thị Biểu đồ trực quan
```

## 4. Luồng Tạo tóm tắt AI cho Bài báo (AI Insights / Summary Flow)
Sử dụng AI Service (như Gemini) để phân tích chuyên sâu nội dung hoặc tạo tóm tắt thông minh cho bài báo.

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend (InsightsPage/PaperPage)
    participant BE as Backend (aiRoutes)
    participant Gemini as Gemini AI Service
    participant DB as MongoDB (Paper Model)

    U->>FE: Bấm nút "Generate AI Summary"
    FE->>BE: POST /api/ai/summarize { paperId }
    BE->>DB: Lấy thông tin bài báo (Abstract/Nội dung)
    DB-->>BE: Dữ liệu bài báo
    BE->>Gemini: Gửi Prompt yêu cầu tóm tắt/phân tích
    Gemini-->>BE: Trả về nội dung đã tóm tắt
    BE->>DB: Lưu aiSummary vào Document của Paper
    BE-->>FE: Trả về nội dung AI
    FE-->>U: Hiển thị khung Tóm tắt AI
```

## 5. Luồng Quản lý Không gian làm việc / Thư viện (Workspace / Library Flow)
Người dùng lưu bài báo hoặc quản lý theo các nhóm riêng biệt.

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend (WorkspaceDetailsPage)
    participant BE as Backend (workspaceRoutes)
    participant DB as MongoDB (UserLibrary / Workspace)

    U->>FE: Thêm bài báo vào Workspace X
    FE->>BE: POST /api/workspaces/X/papers { paper_id }
    BE->>BE: Verify JWT Middleware (Check quyền)
    BE->>DB: Kiểm tra bài báo đã tồn tại trong Workspace chưa?
    alt Đã tồn tại
        BE-->>FE: 400 Bad Request (Duplicate)
    else Chưa tồn tại
        BE->>DB: Update Workspace (Push paper_id)
        DB-->>BE: Update Success
        BE-->>FE: 200 OK
        FE-->>U: Hiển thị Toast "Thêm thành công"
    end
```
