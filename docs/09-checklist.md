# Danh sách kiểm tra hoàn thành — Giai đoạn 1 và mở rộng

## Hệ thống theo dõi xu hướng công bố tạp chí khoa học
### Nền tảng Backend — Bàn giao từ 19/05/2026, cập nhật corpus 2026

---

## Trạng thái dự án

### Mục tiêu Giai đoạn 1 (đã đạt)

- [x] Cấu trúc thư mục có tổ chức
- [x] API backend Express.js (sẵn sàng vận hành)
- [x] Mô hình MongoDB (User, Paper, Journal, Topic, Keyword, AnalysisRun)
- [x] Hệ thống xác thực (JWT + RBAC)
- [x] Tích hợp OpenAlex và đa nguồn (Semantic Scholar, Crossref)
- [x] Tài liệu Swagger/OpenAPI
- [x] Middleware xử lý lỗi
- [x] Cấu hình Docker
- [x] Tài liệu dự án (README, docs/01-chay-nhanh, docs/03-api-dac-ta, docs/08-thuat-toan-paper)
- [x] Dịch vụ AI (FastAPI) + proxy từ backend

### Mở rộng sau Giai đoạn 1

- [x] Luồng corpus hybrid (`/api/v1/corpus/*`)
- [x] Thu thập OpenAlex → `Paper` + `AnalysisRun`
- [x] Phân tích trend trên corpus + `Topic` evidence
- [x] Theo dõi corpus trên hồ sơ user (`trackedRuns`)

---

## Tóm tắt sản phẩm bàn giao

### 1. API Backend

```
Trạng thái: SẴN SÀNG VẬN HÀNH
Swagger: http://localhost:3001/api-docs
```

**Nhóm endpoint chính:**

| Nhóm | Số lượng (ước lượng) | Ghi chú |
|------|----------------------|---------|
| Auth | 3 | register, login, me |
| Sources | 4 | search, trend, journal, author |
| Corpus | 6 | runs, papers, follow, tracked |
| Trends | 5 | keyword, compare, emerging, trending, topic |
| Papers | 5 | search, detail, save, bookmark |
| AI proxy | 8 | health, embed, recommend, summarize |
| System | 1 | health |

Chi tiết: [03-api-dac-ta.md](03-api-dac-ta.md)

### 2. Cơ sở dữ liệu (MongoDB)

```
Trạng thái: ĐÃ CẤU HÌNH + INDEX
```

**Collection / model:**

- Users — xác thực, bookmark, trackedRuns
- Papers — metadata, analysisRunId (corpus)
- Topics — yearlyData, emerging, papers[]
- AnalysisRuns — snapshot corpus theo từ khóa
- Journals, Keywords

### 3. Bảo mật

- JWT (mặc định 7 ngày)
- bcrypt hash mật khẩu
- RBAC: researcher, student, lecturer, admin
- CORS, Helmet
- Endpoint bảo vệ: bookmark, save paper, follow corpus, /auth/me

### 4. Tích hợp API học thuật

- OpenAlex — miễn phí, không cần key
- Semantic Scholar — cần API key (tùy chọn)
- Crossref — cần mailto
- Chuẩn hóa response qua `academicApiService.js`

### 5. Tài liệu API

- Swagger UI tương tác
- [03-api-dac-ta.md](03-api-dac-ta.md) — đặc tả tiếng Việt
- [04-api-chi-tiet.md](04-api-chi-tiet.md) — trường request/response từng API
- [01-chay-nhanh.md](01-chay-nhanh.md) — hướng dẫn chạy nhanh

### 6. Docker

- `docker-compose.yml`
- Dockerfile backend + ai-service
- MongoDB, health check

### 7. Dịch vụ AI

```
Cổng: 8000
Framework: FastAPI
```

- Embedding (all-MiniLM-L6-v2, 384 chiều)
- Gợi ý bài / hướng nghiên cứu
- Tóm tắt abstract, trích problem/methodology/results
- Proxy qua `/api/v1/ai/*`

---

## Cách sử dụng nhanh

```bash
# Backend
cd backend && npm install && cp .env.example .env
npm run dev
# → http://localhost:3001/api-docs

# AI
cd ai-service && source .venv/bin/activate
uvicorn main:app --host 127.0.0.1 --port 8000

# Corpus (sau khi backend chạy)
curl -X POST http://localhost:3001/api/v1/corpus/runs \
  -H "Content-Type: application/json" \
  -d '{"seedKeyword":"machine learning","startYear":2020,"endYear":2024,"maxPages":3}'
```

Xem [01-chay-nhanh.md](01-chay-nhanh.md)

---

## Tính năng đã triển khai

### Bảo mật
- JWT, bcrypt, RBAC, CORS, Helmet, validation, biến môi trường

### API
- REST, phân trang, Swagger, health check
- Live search + corpus tracking

### Cơ sở dữ liệu
- MongoDB Atlas, index, full-text search trên Paper
- Quan hệ User ↔ Paper ↔ Topic ↔ AnalysisRun

### AI
- Microservice Python tách biệt
- Proxy và graceful degradation khi AI tắt

---

## Chất lượng tài liệu

| Tài liệu | Nội dung |
|----------|----------|
| README.md | Tổng quan, stack, API tóm tắt, lộ trình |
| 01-chay-nhanh.md | Cài đặt, Swagger, corpus, sự cố |
| 03-api-dac-ta.md | Đặc tả endpoint đầy đủ (tiếng Việt) |
| 08-thuat-toan-paper.md | Thuật toán, paper, trạng thái runtime |

---

## Danh sách xác minh

### Chức năng backend
- [x] Server khởi động không lỗi
- [x] `/health` hoạt động
- [x] Swagger hoạt động
- [x] Auth + JWT
- [x] Tìm kiếm OpenAlex / đa nguồn
- [x] Corpus run: pending → completed
- [x] Emerging/trending có dữ liệu sau corpus
- [x] Proxy AI (khi service chạy)

### Tài liệu
- [x] README tiếng Việt
- [x] 01-chay-nhanh tiếng Việt
- [x] 03-api-dac-ta tiếng Việt
- [x] Ví dụ curl và luồng corpus

---

## Chỉ số chất lượng

| Chỉ số | Mục tiêu | Trạng thái |
|--------|----------|------------|
| Chất lượng mã | Cao | Đạt |
| Tài liệu | Đầy đủ | Đạt |
| Số endpoint API | 30+ | Đạt |
| Sẵn sàng Docker | Có | Đạt |
| Luồng corpus | Có | Đạt |

---

## Giai đoạn tiếp theo

### Giai đoạn 2 — Frontend
- Dashboard React, biểu đồ trend, bookmark UI

### Giai đoạn 3–4 — AI nâng cao
- BERTopic trên corpus
- ChromaDB gom keyword
- Thông báo trending

### Giai đoạn 5 — Production
- Deploy Render/Vercel
- Giám sát, tối ưu

---

## Lộ trình

```
Giai đoạn 1  ✅  Nền tảng backend
Giai đoạn 1b ✅  Corpus hybrid + AI proxy
Giai đoạn 2  🚀  Frontend
Giai đoạn 3  📋  BERTopic / ChromaDB
Giai đoạn 4  📋  Tính năng nâng cao
Giai đoạn 5  📋  Triển khai production
```

---

## Trạng thái đồ án

**Hệ thống:** Theo dõi xu hướng công bố tạp chí khoa học  
**Khả năng hiện tại:** Tìm bài, trend live, corpus có kiểm chứng, gợi ý/tóm tắt AI, bookmark, theo dõi chủ đề  
**Người dùng:** Researcher, sinh viên, giảng viên, admin  

---

**Tài liệu liên quan:**

- [README.md](./README.md) — Tổng quan dự án  
- [01-chay-nhanh.md](01-chay-nhanh.md) — Chạy nhanh  
- [03-api-dac-ta.md](03-api-dac-ta.md) — Đặc tả API
- [04-api-chi-tiet.md](04-api-chi-tiet.md) — Trường request/response  
- [08-thuat-toan-paper.md](08-thuat-toan-paper.md) — Thuật toán  
