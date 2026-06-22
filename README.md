# Hệ thống theo dõi xu hướng công bố tạp chí khoa học

**Đồ án /  — Sinh viên FPT University**

Backend API hỗ trợ tìm kiếm bài báo học thuật (OpenAlex), thu thập corpus theo từ khóa, phân tích xu hướng, chủ đề mới nổi và các tính năng AI (embedding, gợi ý, tóm tắt abstract). Frontend tích hợp qua REST API + Swagger.

---

## Thành viên

| MSSV | Họ và tên |
|------|-----------|
| SE185018 | Ngô Nhật Minh |
| SE184093 | Đặng Thanh Tú |
| SE184217 | Trần Đình Phong |
| SE182721 | Phạm Đức Thanh Phương |
| SE       | Tô Thanh Hải |

**Trường:** FPT University

---

## Tính năng chính

- Tìm kiếm & trend bài báo (OpenAlex, Semantic Scholar, Crossref)
- Corpus hybrid: thu thập snapshot → tính trend → chủ đề emerging
- Xác thực JWT (đăng ký, đăng nhập, bookmark)
- AI service: embedding, gợi ý bài/hướng nghiên cứu, tóm tắt abstract
- Swagger / OpenAPI cho team FE

---

## Công nghệ

| Thành phần | Stack |
|------------|--------|
| Backend | Node.js, Express, MongoDB Atlas, JWT |
| AI | Python, FastAPI, sentence-transformers |
| Deploy | Railway (BE + AI), MongoDB Atlas |
| FE *(giai đoạn 2)* | React, Tailwind, Axios |

---

## Cấu trúc repo

```
├── backend/          # API Express (:3001)
├── ai-service/       # FastAPI (:8000)
├── docs/             # Tài liệu (mục lục: docs/README.md)
├── config/           # Mẫu biến môi trường
├── scripts/          # Test production
└── frontend/         # (đang phát triển)
```

---

## Chạy nhanh (local)

```bash
# 1. AI
cd ai-service && python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && uvicorn main:app --port 8000

# 2. Backend
cd backend && npm install && cp .env.example .env
# Sửa MONGODB_URI, JWT_SECRET, AI_SERVICE_URL=http://localhost:8000
npm run dev
```

- Swagger: http://localhost:3001/api-docs  
- Hướng dẫn chi tiết: [docs/01-chay-nhanh.md](docs/01-chay-nhanh.md)

---

## Production (Railway)

| | URL |
|---|-----|
| Swagger | https://scientific-journal-publication-trend-tracking-sy-production.up.railway.app/api-docs |
| API (FE) | `.../api/v1` |
| Deploy | [docs/02-deploy-railway.md](docs/02-deploy-railway.md) |
| Tích hợp FE | [docs/05-huong-dan-fe.md](docs/05-huong-dan-fe.md) |

> FE **không** gọi trực tiếp domain AI — chỉ qua `/api/v1/ai/*`.

---

## Tài liệu

| File | Nội dung |
|------|----------|
| [docs/README.md](docs/README.md) | Mục lục đầy đủ |
| [docs/06-kien-truc.md](docs/06-kien-truc.md) | Software Architecture Diagram |
| [docs/12-luong-nghiep-vu.md](docs/12-luong-nghiep-vu.md) | Use case & luồng nghiệp vụ (diagram) |
| [docs/05-huong-dan-fe.md](docs/05-huong-dan-fe.md) | Tích hợp FE, curl, test |
| [docs/03-api-dac-ta.md](docs/03-api-dac-ta.md) | Đặc tả API |
| [docs/04-api-chi-tiet.md](docs/04-api-chi-tiet.md) | Request/response |
| [docs/08-thuat-toan-paper.md](docs/08-thuat-toan-paper.md) | Thuật toán & tài liệu tham khảo |

---

## Trạng thái dự án

| Phần | Trạng thái |
|------|------------|
| Backend + Corpus + Swagger | ✅ |
| AI service + proxy | ✅ |
| Deploy Railway | ✅ |
| Frontend React | 🔜 |

---

**License:** MIT · Capstone FPT · Cập nhật 05/2026
