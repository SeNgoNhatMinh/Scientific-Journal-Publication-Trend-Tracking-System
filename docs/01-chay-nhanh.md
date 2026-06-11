# Hướng dẫn chạy nhanh

Hướng dẫn chạy **Hệ thống theo dõi xu hướng công bố tạp chí khoa học** trên máy local (macOS/Linux).

## Yêu cầu

| Công cụ | Phiên bản |
|---------|-----------|
| Node.js | 18+ |
| npm | đi kèm Node |
| Python | 3.9+ |
| MongoDB | Atlas hoặc local (URI trong `backend/.env`) |

## 1. Cấu hình môi trường

```bash
cd backend
cp .env.example .env
# Chỉnh MONGODB_URI, JWT_SECRET, AI_SERVICE_URL=http://localhost:8000
```

```bash
cd ../ai-service
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

> **Lưu ý:** `sentence-transformers` cần phiên bản **≥ 3.0** (đã cập nhật trong `requirements.txt`) để tương thích `huggingface_hub`. Nếu gặp `ImportError: cached_download`, chạy lại `pip install -r requirements.txt`.

## 2. Chạy hai service (khuyến nghị — 2 terminal)

### Terminal 1 — Dịch vụ AI (cổng 8000)

```bash
cd ai-service
source .venv/bin/activate
uvicorn main:app --host 127.0.0.1 --port 8000
```

- Kiểm tra sức khỏe: http://localhost:8000/health  
- Tài liệu FastAPI: http://localhost:8000/docs  

Lần đầu gọi embedding có thể mất vài giây (tải model `all-MiniLM-L6-v2`).

### Terminal 2 — API Backend (cổng trong `.env`, thường 3001 hoặc 5000)

```bash
cd backend
npm install
npm run dev
```

- Kiểm tra sức khỏe: http://localhost:3001/health  
- **Swagger UI:** http://localhost:3001/api-docs  

## 3. Kiểm tra nhanh

```bash
# Backend
curl http://localhost:3001/health

# AI trực tiếp
curl http://localhost:8000/health

# AI qua proxy backend
curl http://localhost:3001/api/v1/ai/health

# Embedding (qua Swagger hoặc curl)
curl -X POST http://localhost:3001/api/v1/ai/embeddings/embed \
  -H "Content-Type: application/json" \
  -d '{"text":"machine learning"}'
```

## 4. Luồng Corpus (theo dõi hybrid)

**Trực tiếp** (không lưu corpus): `GET /sources/search`, `GET /sources/trend`

**Corpus** (thu thập → phân tích → có minh chứng):

```bash
# 1) Bắt đầu theo dõi từ khóa (chạy nền, vài phút)
curl -X POST http://localhost:3001/api/v1/corpus/runs \
  -H "Content-Type: application/json" \
  -d '{
    "seedKeyword": "federated learning",
    "startYear": 2018,
    "endYear": 2024,
    "maxPages": 3
  }'

# 2) Kiểm tra trạng thái (thay RUN_ID)
curl http://localhost:3001/api/v1/corpus/runs/RUN_ID

# 3) Khi status = completed → xem bài báo và xu hướng
curl http://localhost:3001/api/v1/corpus/runs/RUN_ID/papers
curl "http://localhost:3001/api/v1/trends/emerging"
curl "http://localhost:3001/api/v1/trends/trending"

# 4) (Tùy chọn) Theo dõi run — cần JWT
curl -X POST http://localhost:3001/api/v1/corpus/runs/RUN_ID/follow \
  -H "Authorization: Bearer TOKEN"
```

| Bước | Việc xảy ra |
|------|-------------|
| Thu thập (Ingest) | OpenAlex → lưu `Paper` gắn `analysisRunId` |
| Phân tích (Analyze) | Đếm theo năm → `yearlyData`, `growthRate`, `Topic` |
| Chủ đề mới (Emerging) | `isEmerging` + `emergenceScore` trên run và topic |

## 5. Swagger — thử API có kết quả

Mở http://localhost:3001/api-docs (refresh sau khi sửa code).

### Endpoint nên thử trước (có dữ liệu ngay)

| Nhóm | Endpoint | Ghi chú |
|------|----------|---------|
| Nguồn dữ liệu | `GET /sources/search` | Bắt buộc `keyword=AI`; `source=openalex`, `semanticscholar`, `crossref`, `ieee`, `exa` |
| Xu hướng | `GET /trends/keyword` | Query `keyword=machine learning` |
| Dịch vụ AI | `GET /ai/health` | Cần AI chạy cổng 8000 |
| Dịch vụ AI | `POST /ai/embeddings/embed` | Body: `{"text":"machine learning"}` |
| Dịch vụ AI | `POST /ai/summarization/abstract` | Body có trường `abstract` |
| Corpus | `POST /corpus/runs` | Bắt đầu theo dõi từ khóa |

### Endpoint cần chạy corpus trước

| Endpoint | Lý do |
|----------|--------|
| `GET /trends/emerging` | Chạy `POST /corpus/runs` trước, đợi `status: completed` |
| `GET /trends/trending` | Tương tự |
| `GET /papers/{paperId}` | Cần `_id` MongoDB, không phải URL OpenAlex |

### POST AI — phải có body

Bấm Execute với body `{}` sẽ lỗi 422. Dùng **Example Value** trong Swagger hoặc điền đủ trường (`text`, `texts`, `text1`/`text2`, `keywords`, `abstract`).

### JWT (bookmark / lưu bài / follow corpus)

1. **Auth** → `POST /auth/register` hoặc `login`  
2. Copy `token` trong response  
3. **Authorize** → nhập `Bearer <token>` (hoặc chỉ dán token)

## 6. Docker (tùy chọn)

```bash
# Từ thư mục gốc repo
docker compose up --build
```

- Backend: http://localhost:5000/api-docs  
- AI: http://localhost:8000/docs  
- MongoDB: localhost:27017  

## 7. Sự cố thường gặp

| Triệu chứng | Cách xử lý |
|-------------|------------|
| AI `/api/v1/ai/health` báo `unavailable` | Khởi động AI ở terminal 1; kiểm tra `AI_SERVICE_URL` trong `backend/.env` |
| `ImportError: cached_download` khi start AI | `cd ai-service && pip install -r requirements.txt` |
| Cảnh báo kết nối MongoDB | Kiểm tra `MONGODB_URI`, whitelist IP Atlas |
| Swagger papers search 401 | Dùng `/api/v1/sources/search` hoặc đăng nhập Bearer |

## Thứ tự khởi động đúng

```
MongoDB (Atlas/local) → AI Service (:8000) → Backend (:3001) → Mở Swagger
```

## 8. Test nhanh Production (Railway)

| Mục | URL |
|-----|-----|
| Health | https://scientific-journal-publication-trend-tracking-sy-production.up.railway.app/health |
| Swagger | https://scientific-journal-publication-trend-tracking-sy-production.up.railway.app/api-docs |
| OpenAPI | https://scientific-journal-publication-trend-tracking-sy-production.up.railway.app/api-docs.json |

```bash
curl -s https://scientific-journal-publication-trend-tracking-sy-production.up.railway.app/health
curl -s https://scientific-journal-publication-trend-tracking-sy-production.up.railway.app/api/v1/ai/health

# Toàn bộ endpoint (~32):
chmod +x scripts/test-production.sh
./scripts/test-production.sh scripts/ket-qua-test.md
```

Chi tiết FE: [05-huong-dan-fe.md](05-huong-dan-fe.md)

---

Xem thêm: [03-api-dac-ta.md](03-api-dac-ta.md) | [04-api-chi-tiet.md](04-api-chi-tiet.md) | [README.md](../README.md)
