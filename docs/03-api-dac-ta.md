# Đặc tả API

**Hệ thống theo dõi xu hướng xuất bản tạp chí khoa học**

| | |
|---|---|
| Phiên bản | 1.0.0 |
| Base path | `/api/v1` |
| Cổng mặc định | `3001` (xem `backend/.env` → `PORT`) |
| Tài liệu tương tác | `GET /api-docs` (Swagger UI), `GET /api-docs.json` (OpenAPI) |
| Microservice AI (local) | `http://localhost:8000` (proxy qua `/api/v1/ai/*`) |
| Luồng nghiệp vụ / use case (FE) | [12-luong-nghiep-vu.md](12-luong-nghiep-vu.md) |
| Hướng dẫn FE / smoke test | [05-huong-dan-fe.md](05-huong-dan-fe.md) |
| Trường request/response chi tiết | [04-api-chi-tiet.md](04-api-chi-tiet.md) |

---

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Xác thực](#2-xác-thực)
3. [Quy ước chung](#3-quy-ước-chung)
4. [System](#4-system)
5. [Authentication API](#5-authentication-api)
6. [Sources API (dữ liệu ngoài trực tiếp)](#6-sources-api-dữ-liệu-ngoài-trực-tiếp)
7. [Corpus API (theo dõi lai)](#7-corpus-api-theo-dõi-lai)
8. [Trends API](#8-trends-api)
9. [Papers API](#9-papers-api)
10. [AI Service API (proxy)](#10-ai-service-api-proxy)
11. [AI Service API (trực tiếp)](#11-ai-service-api-trực-tiếp)
12. [Mô hình dữ liệu (tóm tắt)](#12-mô-hình-dữ-liệu-tóm-tắt)
13. [Xử lý lỗi](#13-xử-lý-lỗi)
14. [Phụ thuộc bên ngoài](#14-phụ-thuộc-bên-ngoài)

---

## 1. Tổng quan

Backend cung cấp ba lớp chức năng:

| Lớp | Prefix | Mô tả |
|-----|--------|-------|
| **Truy vấn trực tiếp** | `/sources`, `/trends/keyword` | Gọi thời gian thực tới OpenAlex, Semantic Scholar, Crossref, IEEE, Exa |
| **Theo dõi corpus** | `/corpus` | Thu thập bài báo vào MongoDB, tính xu hướng theo năm, tạo bằng chứng `Topic` |
| **AI** | `/ai` | Proxy tới Python FastAPI (embedding, gợi ý, tóm tắt) |

**Luồng lai được khuyến nghị**

1. `GET /sources/search` — khám phá từ khóa trực tiếp  
2. `POST /corpus/runs` — bắt đầu theo dõi corpus cho từ khóa đó  
3. Poll `GET /corpus/runs/{runId}` cho đến khi `status: completed`  
4. `GET /corpus/runs/{runId}/papers` và `GET /trends/emerging`  
5. (Tùy chọn) `POST /corpus/runs/{runId}/follow` với JWT  

### Môi trường Production (Railway)

| Mục | URL |
|-----|-----|
| Backend | `https://scientific-journal-publication-trend-tracking-sy-production.up.railway.app` |
| API base (FE) | `https://scientific-journal-publication-trend-tracking-sy-production.up.railway.app/api/v1` |
| Swagger | `https://scientific-journal-publication-trend-tracking-sy-production.up.railway.app/api-docs` |
| OpenAPI JSON | `https://scientific-journal-publication-trend-tracking-sy-production.up.railway.app/api-docs.json` |
| AI (nội bộ BE, không gọi từ FE) | `https://lavish-adventure-production-dd7f.up.railway.app` |

Biến Railway backend: `AI_SERVICE_URL` trỏ domain AI; `OPENALEX_MAILTO` (email hợp lệ); `EXTERNAL_API_TIMEOUT_MS=90000` (mặc định production).

**Lưu ý:** Tìm kiếm live qua API ngoài có thể mất **30–90 giây**; vượt timeout trả **`504`**. Chi tiết test: [05-huong-dan-fe.md](05-huong-dan-fe.md).

---

## 2. Xác thực

Các endpoint được bảo vệ yêu cầu JWT trong header:

```http
Authorization: Bearer <token>
```

Lấy token qua `POST /api/v1/auth/register` hoặc `POST /api/v1/auth/login`.

| Trường | Giá trị |
|--------|---------|
| Thuật toán | HS256 |
| Hết hạn | biến môi trường `JWT_EXPIRE` (mặc định `7d`) |
| Secret | biến môi trường `JWT_SECRET` |

**Vai trò:** `researcher`, `student`, `lecturer`, `admin` (mặc định: `student`)

---

## 3. Quy ước chung

### Content type

```http
Content-Type: application/json
```

### Envelope thành công (hầu hết endpoint)

```json
{
  "success": true,
  ...
}
```

### Envelope lỗi

```json
{
  "success": false,
  "statusCode": 400,
  "message": "Human-readable error message"
}
```

Trong môi trường `development`, phản hồi có thể bao gồm trường `stack`.

### Tham số nguồn học thuật

Khi chấp nhận `source`:

| Giá trị | API |
|---------|-----|
| `openalex` | OpenAlex (mặc định, không cần key) |
| `semanticscholar` | Semantic Scholar (yêu cầu `SEMANTIC_SCHOLAR_API_KEY`) |
| `crossref` | Crossref (yêu cầu `CROSSREF_MAILTO`) |
| `ieee` | IEEE Xplore Metadata API (yêu cầu `IEEE_API_KEY`) |
| `exa` | Exa Search API, category research paper (yêu cầu `EXA_API_KEY`) |

Alias: `semantic`, `semantic_scholar` → `semanticscholar`; `ieeexplore` → `ieee`.

### Nhãn trạng thái xu hướng

| Giá trị | Ý nghĩa (theo quy tắc) |
|---------|------------------------|
| `exploding` | Tăng trưởng trung bình (5 năm gần nhất) > 20% |
| `growing` | Tăng trưởng trung bình > 10% |
| `stable` | Trong khoảng -5% đến 10% |
| `declining` | Tăng trưởng trung bình < -5% |

### Trạng thái corpus run

| Giá trị | Ý nghĩa |
|---------|---------|
| `pending` | Đang chờ trong hàng đợi |
| `ingesting` | Đang lấy bài báo từ OpenAlex |
| `analyzing` | Đang tổng hợp xu hướng theo năm / `Topic` |
| `completed` | Sẵn sàng cho dashboard |
| `failed` | Xem `errorMessage` trên run |

---

## 4. System

### `GET /health`

Kiểm tra sức khỏe (không có prefix `/api/v1`).

**Auth:** Không

**Response `200`**

```json
{
  "success": true,
  "message": "API is running",
  "timestamp": "2026-05-20T12:00:00.000Z"
}
```

### `GET /api-docs.json`

OpenAPI 3.0 JSON (dùng codegen FE, không có prefix `/api/v1`).

**Auth:** Không

**Response `200`:** JSON spec (cùng nội dung Swagger UI).

---

## 5. Authentication API

Base: `/api/v1/auth`

### `POST /auth/register`

Tạo tài khoản người dùng mới.

**Auth:** Không

**Request body**

| Trường | Kiểu | Bắt buộc | Mô tả |
|--------|------|----------|-------|
| `name` | string | Có | Tên hiển thị |
| `email` | string | Có | Email duy nhất |
| `password` | string | Có | Tối thiểu 6 ký tự |
| `role` | string | Không | `researcher` \| `student` \| `lecturer` \| `admin` |
| `institution` | string | Không | Cơ quan / trường |

**Response `201`**

```json
{
  "success": true,
  "message": "User registered successfully",
  "token": "<jwt>",
  "user": {
    "id": "...",
    "name": "Test User",
    "email": "test@example.com",
    "role": "student"
  }
}
```

**Lỗi:** `400` validation, `409` email đã tồn tại

---

### `POST /auth/login`

**Auth:** Không

**Request body**

| Trường | Kiểu | Bắt buộc |
|--------|------|----------|
| `email` | string | Có |
| `password` | string | Có |

**Response `200`**

```json
{
  "success": true,
  "message": "Login successful",
  "token": "<jwt>",
  "user": {
    "id": "...",
    "name": "Test User",
    "email": "test@example.com",
    "role": "student",
    "institution": "..."
  }
}
```

**Lỗi:** `401` thông tin đăng nhập không hợp lệ

---

### `GET /auth/me`

**Auth:** Bearer bắt buộc

**Response `200`**

```json
{
  "success": true,
  "user": { ... }
}
```

---

## 6. Sources API (dữ liệu ngoài trực tiếp)

Base: `/api/v1/sources`

Tất cả endpoint truy vấn API bên ngoài trực tiếp (không cần corpus).

### `GET /sources/search`

Tìm kiếm bài báo học thuật.
Hỗ trợ: `openalex`, `semanticscholar`, `crossref`, `ieee`, `exa`.

**Auth:** Không

**Query parameters**

| Tên | Kiểu | Bắt buộc | Mặc định | Mô tả |
|-----|------|----------|----------|-------|
| `keyword` | string | Có | — | Từ khóa tìm kiếm |
| `source` | string | Không | `openalex` | Nhà cung cấp dữ liệu |
| `page` | integer | Không | `1` | Số trang |
| `limit` | integer | Không | `20` | Số kết quả mỗi trang |
| `year` | integer | Không | — | Lọc theo năm xuất bản |

**Response `200`**

```json
{
  "success": true,
  "source": "openalex",
  "total": 4170336,
  "papers": [
    {
      "id": "https://openalex.org/W...",
      "title": "...",
      "abstract": "...",
      "doi": "...",
      "publishedDate": "2024-01-01",
      "publicationYear": 2024,
      "citationCount": 120,
      "authors": [{ "authorId": "...", "name": "..." }],
      "journalName": "...",
      "url": "...",
      "source": "openalex"
    }
  ]
}
```

**Lỗi:** `400` thiếu keyword, `500` lỗi API upstream

---

### `GET /sources/trend`

Số lượng xuất bản theo năm cho một từ khóa (tổng hợp trực tiếp từ API bên ngoài).

**Auth:** Không

**Query parameters**

| Tên | Kiểu | Bắt buộc | Mặc định |
|-----|------|----------|----------|
| `keyword` | string | Có | — |
| `source` | string | Không | `openalex` |
| `startYear` | integer | Không | `2010` |

**Response `200`**

```json
{
  "success": true,
  "source": "openalex",
  "keyword": "machine learning",
  "trends": [
    { "year": 2020, "count": 164344, "growthRate": 12.5 }
  ]
}
```

---

### `GET /sources/journal`

Tìm kiếm metadata tạp chí / venue.

**Auth:** Không

**Query parameters**

| Tên | Kiểu | Bắt buộc | Mặc định |
|-----|------|----------|----------|
| `query` | string | Có | — |
| `source` | string | Không | `openalex` (giá trị duy nhất được hỗ trợ) |

**Response `200`**

```json
{
  "success": true,
  "source": "openalex",
  "journals": [
    {
      "id": "...",
      "title": "Nature",
      "issn": "...",
      "publisher": "...",
      "paperCount": 50000
    }
  ]
}
```

---

### `GET /sources/author`

Tìm kiếm metadata tác giả.

**Auth:** Không

**Query parameters**

| Tên | Kiểu | Bắt buộc | Mặc định |
|-----|------|----------|----------|
| `query` | string | Có | — |
| `source` | string | Không | `openalex` |

Hỗ trợ: `openalex`, `semanticscholar`.

**Response `200`**

```json
{
  "success": true,
  "source": "openalex",
  "authors": [
    {
      "id": "...",
      "name": "...",
      "citationCount": 100000,
      "paperCount": 500,
      "orcid": "..."
    }
  ]
}
```

---

## 7. Corpus API (theo dõi lai)

Base: `/api/v1/corpus`

Xây dựng **ảnh chụp có thể xác minh** trong MongoDB: thu thập bài báo → tính xu hướng → tạo/cập nhật `Topic`.

> **Lưu ý:** Thu thập hiện chỉ hỗ trợ **`source: openalex`**.

### `POST /corpus/runs`

Bắt đầu một lần chạy phân tích corpus mới (tác vụ nền).

**Auth:** Không (tùy chọn: truyền JWT sau để gán `createdBy`)

**Request body**

| Trường | Kiểu | Bắt buộc | Mặc định | Mô tả |
|--------|------|----------|----------|-------|
| `seedKeyword` | string | Có | — | Từ khóa gốc chủ đề, ví dụ `federated learning` |
| `source` | string | Không | `openalex` | Nguồn dữ liệu khi ingest |
| `startYear` | integer | Không | currentYear - 5 | Năm bắt đầu khoảng |
| `endYear` | integer | Không | năm hiện tại | Năm kết thúc khoảng |
| `maxPages` | integer | Không | `4` | Số trang OpenAlex (1–20, tối đa 25 bài/trang) |
| `perPage` | integer | Không | `25` | Số bài mỗi trang (10–50) |

**Response `202`**

```json
{
  "success": true,
  "message": "Corpus ingestion started. Poll GET /corpus/runs/:id for status.",
  "run": {
    "_id": "...",
    "seedKeyword": "federated learning",
    "source": "openalex",
    "startYear": 2018,
    "endYear": 2024,
    "status": "pending",
    "maxPages": 4,
    "perPage": 25,
    "paperCount": 0,
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```

Poll cho đến khi `status` là `completed` hoặc `failed`.

---

### `GET /corpus/runs`

Liệt kê các lần chạy phân tích.

**Auth:** Không

**Query parameters**

| Tên | Kiểu | Mặc định |
|-----|------|----------|
| `status` | string | — lọc: `pending`, `ingesting`, `analyzing`, `completed`, `failed` |
| `page` | integer | `1` |
| `limit` | integer | `20` |

**Response `200`**

```json
{
  "success": true,
  "runs": [ ... ],
  "total": 5,
  "page": 1,
  "limit": 20
}
```

---

### `GET /corpus/runs/{runId}`

Lấy chi tiết run, bao gồm xu hướng và topic liên kết.

**Auth:** Không

**Response `200`**

```json
{
  "success": true,
  "run": {
    "_id": "...",
    "seedKeyword": "federated learning",
    "status": "completed",
    "paperCount": 100,
    "papersAdded": 95,
    "papersSkipped": 5,
    "yearlyData": [
      { "year": 2022, "count": 20, "growthRate": 0 },
      { "year": 2023, "count": 35, "growthRate": 75 }
    ],
    "averageGrowthRate": 42.5,
    "trendStatus": "exploding",
    "emergenceScore": 0.72,
    "isEmerging": true,
    "topicId": { ... },
    "startedAt": "...",
    "completedAt": "..."
  }
}
```

**Lỗi:** `404` không tìm thấy run

---

### `GET /corpus/runs/{runId}/papers`

Liệt kê bài báo đã lưu cho corpus run này.

**Auth:** Không

**Query parameters**

| Tên | Kiểu | Mặc định |
|-----|------|----------|
| `page` | integer | `1` |
| `limit` | integer | `20` |

**Response `200`**

```json
{
  "success": true,
  "runId": "...",
  "seedKeyword": "federated learning",
  "papers": [
    {
      "title": "...",
      "abstract": "...",
      "publicationYear": 2023,
      "citationCount": 150,
      "journalName": "...",
      "doi": "...",
      "keywords": ["..."]
    }
  ],
  "total": 100,
  "page": 1,
  "limit": 20
}
```

---

### `POST /corpus/runs/{runId}/follow`

Đăng ký theo dõi corpus run này cho người dùng đã xác thực.

**Auth:** Bearer bắt buộc

**Request body (tùy chọn)**

```json
{
  "notifyEnabled": true
}
```

**Response `200`**

```json
{
  "success": true,
  "message": "Now tracking this corpus run",
  "trackedRuns": [
    {
      "analysisRunId": "...",
      "notifyEnabled": true,
      "followedAt": "..."
    }
  ]
}
```

---

### `GET /corpus/me/tracked`

Liệt kê các corpus run mà người dùng hiện tại đang theo dõi.

**Auth:** Bearer bắt buộc

**Response `200`**

```json
{
  "success": true,
  "trackedRuns": [
    {
      "analysisRunId": {
        "_id": "...",
        "seedKeyword": "...",
        "status": "completed",
        "paperCount": 100,
        "trendStatus": "growing",
        "isEmerging": true
      },
      "notifyEnabled": true,
      "followedAt": "..."
    }
  ]
}
```

---

## 8. Trends API

Base: `/api/v1/trends`

### `GET /trends/keyword`

Xu hướng trực tiếp cho một từ khóa (API bên ngoài + phân loại trạng thái).

**Auth:** Không

**Query parameters**

| Tên | Kiểu | Bắt buộc | Mặc định |
|-----|------|----------|----------|
| `keyword` | string | Có | — |
| `source` | string | Không | `openalex` |
| `startYear` | integer | Không | `2010` |

**Response `200`**

```json
{
  "success": true,
  "keyword": "AI",
  "trendStatus": "growing",
  "averageGrowthRate": "15.32",
  "source": "openalex",
  "trends": [
    { "year": 2023, "count": 395956, "growthRate": 72.1 }
  ]
}
```

---

### `POST /trends/compare`

So sánh xu hướng của nhiều từ khóa.

**Auth:** Không

**Request body**

```json
{
  "source": "openalex",
  "keywords": ["machine learning", "deep learning"],
  "startYear": 2015
}
```

**Response `200`**

```json
{
  "success": true,
  "comparisons": [
    { "source": "openalex", "keyword": "machine learning", "trends": [...] }
  ]
}
```

---

### `GET /trends/emerging`

Chủ đề nổi bật từ tài liệu `Topic` **được corpus hỗ trợ**.

**Auth:** Không

**Điều kiện tiên quyết:** Chạy `POST /corpus/runs` và chờ `completed`.

**Query parameters**

| Tên | Kiểu | Mặc định |
|-----|------|----------|
| `limit` | integer | `10` |
| `analysisRunId` | string | — lọc theo một run |

**Response `200`**

```json
{
  "success": true,
  "source": "all",
  "topics": [
    {
      "name": "federated learning",
      "isEmerging": true,
      "emergenceScore": 0.72,
      "yearlyData": [...],
      "papers": [...]
    }
  ],
  "corpusRuns": [
    {
      "seedKeyword": "...",
      "paperCount": 100,
      "isEmerging": true,
      "emergenceScore": 0.72
    }
  ]
}
```

---

### `GET /trends/trending`

Chủ đề có `trendStatus` là `exploding` hoặc `growing`.

**Auth:** Không

**Query parameters**

| Tên | Kiểu | Mặc định |
|-----|------|----------|
| `limit` | integer | `10` |
| `analysisRunId` | string | lọc tùy chọn |

**Response `200`**

```json
{
  "success": true,
  "source": "all",
  "topics": [ ... ]
}
```

---

### `GET /trends/keyword-categories`

Thống kê keyword đã lưu theo loại (`domain`, `algorithm`, `application`, `method`, `dataset`, `tool`, `general`).

**Auth:** Không

**Query:** `category`, `analysisRunId`, `limit`

---

### `GET /trends/keyword-graph`

Graph đồng xuất hiện keyword từ paper đã lưu. FE dùng `nodes` và `edges` để vẽ mô hình graph.

**Auth:** Không

**Query:** `analysisRunId`, `limit`, `paperLimit`, `year`, `source`

---

### `GET /trends/algorithm-domains`

Danh sách cặp thuật toán-domain cùng xuất hiện, dùng để trả lời “thuật toán nào đang nổi trong domain nào”.

**Auth:** Không

**Query:** `analysisRunId`, `limit`, `paperLimit`, `year`, `source`

---

### `GET /trends/topics/{topicId}`

Chi tiết topic kèm bài báo đã populate.

**Auth:** Không

**Response `200`**

```json
{
  "success": true,
  "topic": {
    "_id": "...",
    "name": "...",
    "yearlyData": [...],
    "papers": [...],
    "analysisRunId": "..."
  }
}
```

**Lỗi:** `404` không tìm thấy topic

---

## 9. Papers API

Base: `/api/v1/papers`

### `GET /papers/search`

Tìm kiếm bài báo đã lưu trong MongoDB (paper được lưu thủ công hoặc sinh từ corpus).
Nếu cần tìm kiếm live từ OpenAlex / Semantic Scholar / Crossref / IEEE / Exa, dùng `GET /sources/search`.

**Auth:** Không

**Query:** `keyword`, `page`, `limit`, `year`, `source`, `analysisRunId`, `sortBy`

**Response `200`:** `source: "local_database"`, `papers`, `pagination`

---

### `GET /papers/{paperId}`

Lấy bài báo đã lưu trong MongoDB theo ObjectId.

**Auth:** Không

**Response `200`:** tài liệu paper với `journal`, `topics` đã populate

**Lỗi:** `404` không có trong cơ sở dữ liệu (dùng tìm kiếm trực tiếp trước, hoặc ingest corpus)

---

### `POST /papers`

Lưu đối tượng paper vào MongoDB.

**Auth:** Bearer bắt buộc

**Request body**

```json
{
  "paper": {
    "title": "...",
    "source": "openalex",
    "externalIds": { "openalex": "W..." },
    ...
  }
}
```

**Response `201`:** paper đã lưu  
**Lỗi:** `409` trùng lặp

---

### `POST /papers/{paperId}/bookmark`

**Auth:** Bearer bắt buộc

**Response `200`:** paper đã cập nhật với bookmark

---

### `GET /papers/bookmarks`

**Auth:** Bearer bắt buộc

**Query:** `page`, `limit`

**Response `200`:** danh sách paper đã bookmark, có phân trang

---

## 10. AI Service API (proxy)

Base: `/api/v1/ai`

Proxy tới dịch vụ Python tại `AI_SERVICE_URL` (mặc định `http://localhost:8000`).

Tất cả endpoint POST yêu cầu body JSON (body rỗng `{}` trả về `422`).

### `GET /ai/health`

**Response `200` (AI đang chạy)**

```json
{
  "status": "healthy",
  "service": "AI Service",
  "version": "1.0.0"
}
```

**Response `200` (AI không chạy)** — suy giảm nhẹ nhàng

```json
{
  "success": true,
  "status": "unavailable",
  "service": "AI Service",
  "message": "AI service is not running..."
}
```

---

### `POST /ai/embeddings/embed`

| Trường | Kiểu | Bắt buộc |
|--------|------|----------|
| `text` | string | Có |

**Response `200`**

```json
{
  "success": true,
  "text": "machine learning",
  "embedding": [0.024, ...],
  "dimension": 384
}
```

Model: `all-MiniLM-L6-v2` (384 chiều).

---

### `POST /ai/embeddings/embed-batch`

| Trường | Kiểu | Bắt buộc |
|--------|------|----------|
| `texts` | string[] | Có |

---

### `POST /ai/embeddings/similarity`

| Trường | Kiểu | Bắt buộc |
|--------|------|----------|
| `text1` | string | Có |
| `text2` | string | Có |

**Response `200`**

```json
{
  "success": true,
  "text1": "...",
  "text2": "...",
  "similarity": 0.7546,
  "interpretation": "High similarity"
}
```

---

### `POST /ai/recommendations/papers`

| Trường | Kiểu | Bắt buộc |
|--------|------|----------|
| `userInterests` | string[] | Có |
| `candidatePapers` | object[] | Có |
| `userHistory` | object[] | Không |
| `topN` | integer | Không (mặc định 10) |

**Đối tượng candidate paper**

| Trường | Kiểu |
|--------|------|
| `paperId` | string |
| `title` | string |
| `abstract` | string |
| `keywords` | string[] |
| `citationCount` | integer |

---

### `POST /ai/recommendations/research-directions`

| Trường | Kiểu | Bắt buộc |
|--------|------|----------|
| `keywords` | string[] | Có |

**Response `200`**

```json
{
  "success": true,
  "directions": [
    {
      "direction": "Machine learning",
      "keywords": ["machine learning"],
      "confidence": 1,
      "priority": 0.55,
      "rationale": "..."
    }
  ]
}
```

---

### `POST /ai/summarization/abstract`

| Trường | Kiểu | Bắt buộc |
|--------|------|----------|
| `abstract` | string | Có |
| `maxLength` | integer | Không (mặc định 150) |

**Response `200`**

```json
{
  "success": true,
  "summary": "...",
  "keyPoints": ["...", "..."]
}
```

---

### `POST /ai/summarization/extract-problem`

| Trường | Kiểu | Bắt buộc |
|--------|------|----------|
| `abstract` | string | Có |

**Response `200`**

```json
{
  "success": true,
  "problem": "...",
  "methodology": "...",
  "results": "..."
}
```

---

## 11. AI Service API (trực tiếp)

Khi gọi trực tiếp dịch vụ Python (cổng `8000`):

| Method | Path |
|--------|------|
| GET | `/health` |
| GET | `/docs` (OpenAPI UI) |
| POST | `/api/v1/embeddings/embed` |
| POST | `/api/v1/embeddings/embed-batch` |
| POST | `/api/v1/embeddings/similarity` |
| POST | `/api/v1/recommendations/papers` |
| POST | `/api/v1/recommendations/research-directions` |
| POST | `/api/v1/summarization/abstract` |
| POST | `/api/v1/summarization/extract-problem` |

Request/response body giống hệt các route proxy ở trên.

---

## 12. Mô hình dữ liệu (tóm tắt)

### AnalysisRun

Metadata ảnh chụp corpus: `seedKeyword`, `startYear`, `endYear`, `status`, `yearlyData`, `trendStatus`, `isEmerging`, `topicId`, thống kê ingest.

### Paper

Bài báo học thuật; bài corpus bao gồm `analysisRunId`. Chỉ mục dedup: `(analysisRunId, externalIds.openalex)`.

### Topic

Chủ đề xu hướng liên kết corpus qua `analysisRunId`; bao gồm `yearlyData`, `emergenceScore`, `papers[]`.

### Keyword

Keyword nghiên cứu đã chuẩn hóa; có `category` để phân biệt `domain`, `algorithm`, `application`, `method`, `dataset`, `tool`, `general`.

### User

`bookmarks[]`, `trackedRuns[]`, `follows[]`, `lastLogin`, `interests[]`.

### Author, SyncLog, PublicationTrend, Notification, ApiSource

Collection WDP hợp nhất — chi tiết trường: [13-schema-hop-nhat.md](13-schema-hop-nhat.md).

### Notifications API

`GET/PATCH /api/v1/notifications/*` (JWT). Sinh tự động khi corpus hoàn tất / emerging.

---

## 13. Xử lý lỗi

| HTTP | Nguyên nhân thường gặp |
|------|------------------------|
| `400` | Thiếu trường query/body bắt buộc |
| `401` | JWT thiếu hoặc không hợp lệ |
| `404` | Không tìm thấy tài nguyên |
| `409` | Người dùng hoặc paper trùng lặp |
| `422` | Lỗi validation AI (body không hợp lệ) |
| `500` | Lỗi máy chủ hoặc API upstream |
| `504` | OpenAlex / API ngoài vượt `EXTERNAL_API_TIMEOUT_MS` (production thường 90s) |
| `429` | API ngoài bị rate limit |
| `403` | API key bị từ chối hoặc chưa active |

---

## 14. Phụ thuộc bên ngoài

| Dịch vụ | Biến môi trường | Mục đích |
|---------|-----------------|----------|
| MongoDB Atlas | `MONGODB_URI` | Lưu trữ |
| OpenAlex | `OPENALEX_API_URL`, `OPENALEX_MAILTO` | Tìm kiếm trực tiếp + ingest corpus (mailto giảm rate-limit) |
| Semantic Scholar | `SEMANTIC_SCHOLAR_API_KEY` | Tìm kiếm trực tiếp tùy chọn |
| Crossref | `CROSSREF_MAILTO` | Tìm kiếm trực tiếp tùy chọn |
| IEEE Xplore | `IEEE_API_URL`, `IEEE_API_KEY` | Tìm kiếm trực tiếp tùy chọn |
| Exa | `EXA_API_URL`, `EXA_API_KEY` | Tìm kiếm trực tiếp tùy chọn |
| AI Service | `AI_SERVICE_URL` | Embedding, gợi ý, tóm tắt |

---

## Phụ lục: Ví dụ curl nhanh

```bash
# Live search
curl "http://localhost:3001/api/v1/sources/search?keyword=AI&source=openalex&limit=5"

# Start corpus
curl -X POST http://localhost:3001/api/v1/corpus/runs \
  -H "Content-Type: application/json" \
  -d '{"seedKeyword":"federated learning","startYear":2020,"endYear":2024,"maxPages":3}'

# Poll run
curl http://localhost:3001/api/v1/corpus/runs/RUN_ID

# Emerging topics (after completed)
curl http://localhost:3001/api/v1/trends/emerging

# Login
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
```

---

*Tài liệu cho backend capstone v1.0.0. Để cài đặt và chạy nhanh, xem [01-chay-nhanh.md](01-chay-nhanh.md). Tổng quan dự án, xem [README.md](../README.md).*
