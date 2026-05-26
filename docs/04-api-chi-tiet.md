# Đặc tả trường Request và Response

Tài liệu chi tiết **gửi lên những trường gì** và **nhận về những trường gì** cho từng API.

| | |
|---|---|
| Base URL (local) | `http://localhost:3001` (hoặc `PORT` trong `.env`) |
| Base URL (production) | `https://scientific-journal-publication-trend-tracking-sy-production.up.railway.app` |
| Prefix | `/api/v1` |
| Định dạng | `application/json` |
| Tài liệu tổng quan | [03-api-dac-ta.md](03-api-dac-ta.md) |
| Hướng dẫn FE | [05-huong-dan-fe.md](05-huong-dan-fe.md) |
| Swagger | `GET /api-docs` |
| OpenAPI JSON | `GET /api-docs.json` |

**Chú thích cột bắt buộc:** `Có` = bắt buộc, `Không` = tùy chọn.

---

## Mục lục

1. [Quy ước chung](#1-quy-ước-chung)
2. [System](#2-system)
3. [Auth](#3-auth)
4. [Sources — truy vấn trực tiếp](#4-sources--truy-vấn-trực-tiếp)
5. [Corpus — theo dõi hybrid](#5-corpus--theo-dõi-hybrid)
6. [Trends](#6-trends)
6.5. [Notifications](#65-notifications-jwt)
7. [Papers](#7-papers)
8. [AI Service (proxy)](#8-ai-service-proxy)
9. [Đối tượng dùng chung (schema)](#9-đối-tượng-dùng-chung-schema)

---

## 1. Quy ước chung

### Header xác thực (khi endpoint yêu cầu JWT)

| Header | Giá trị | Bắt buộc |
|--------|---------|----------|
| `Authorization` | `Bearer <token>` | Có |

### Response lỗi chuẩn

| Trường | Kiểu | Mô tả |
|--------|------|--------|
| `success` | boolean | Luôn `false` |
| `statusCode` | number | Mã HTTP (400, 401, 404, 422, 500…) |
| `message` | string | Mô tả lỗi |
| `stack` | string | Chỉ khi `NODE_ENV=development` |

### Response thành công (hầu hết endpoint)

| Trường | Kiểu | Mô tả |
|--------|------|--------|
| `success` | boolean | Luôn `true` (trừ một số response AI gốc) |

---

## 2. System

### `GET /health`

Không dùng prefix `/api/v1`.

| | |
|---|---|
| **Request** | Không có body, không query |
| **Auth** | Không |

**Response `200`**

| Trường | Kiểu | Bắt buộc | Mô tả |
|--------|------|----------|--------|
| `success` | boolean | Có | `true` |
| `message` | string | Có | Ví dụ: `"API is running"` |
| `timestamp` | string (ISO date) | Có | Thời điểm server |

---

## 3. Auth

Base: `/api/v1/auth`

### `POST /auth/register`

| | |
|---|---|
| **Auth** | Không |

**Request body (JSON)**

| Trường | Kiểu | Bắt buộc | Mô tả |
|--------|------|----------|--------|
| `name` | string | Có | Tên hiển thị |
| `email` | string | Có | Email (unique) |
| `password` | string | Có | Tối thiểu 6 ký tự |
| `role` | string | Không | `researcher` \| `student` \| `lecturer` \| `admin` (mặc định `student`) |
| `institution` | string | Không | Tổ chức / trường |

**Response `201`**

| Trường | Kiểu | Bắt buộc | Mô tả |
|--------|------|----------|--------|
| `success` | boolean | Có | `true` |
| `message` | string | Có | Thông báo đăng ký |
| `token` | string | Có | JWT — dùng cho các API protected |
| `user` | object | Có | Xem bảng `UserPublic` bên dưới |

`UserPublic` trong response register:

| Trường | Kiểu |
|--------|------|
| `id` | string (ObjectId) |
| `name` | string |
| `email` | string |
| `role` | string |

---

### `POST /auth/login`

**Request body**

| Trường | Kiểu | Bắt buộc |
|--------|------|----------|
| `email` | string | Có |
| `password` | string | Có |

**Response `200`**

| Trường | Kiểu | Mô tả |
|--------|------|--------|
| `success` | boolean | |
| `message` | string | |
| `token` | string | JWT |
| `user` | object | Gồm `id`, `name`, `email`, `role`, `institution` |

---

### `GET /auth/me`

| | |
|---|---|
| **Auth** | Bearer — **Có** |
| **Request** | Không body |

**Response `200`**

| Trường | Kiểu | Mô tả |
|--------|------|--------|
| `success` | boolean | |
| `user` | object | Document `User` đầy đủ (không có `password`) |

Các trường `user` thường gặp:

| Trường | Kiểu |
|--------|------|
| `_id` | string |
| `name` | string |
| `email` | string |
| `role` | string |
| `institution` | string |
| `interests` | string[] |
| `bookmarks` | string[] (ObjectId Paper) |
| `trackedRuns` | object[] — xem mục Corpus |
| `createdAt`, `updatedAt` | string |

---

## 4. Sources — truy vấn trực tiếp

Base: `/api/v1/sources` — Gọi API ngoài, **không** lưu MongoDB.

### `GET /sources/search`

**Query parameters**

| Trường | Kiểu | Bắt buộc | Mặc định |
|--------|------|----------|----------|
| `keyword` | string | **Có** | — |
| `source` | string | Không | `openalex` |
| `page` | number | Không | `1` |
| `limit` | number | Không | `20` |
| `year` | number | Không | — (lọc năm xuất bản) |

**Response `200`**

| Trường | Kiểu | Mô tả |
|--------|------|--------|
| `success` | boolean | |
| `source` | string | Nguồn đã chuẩn hóa |
| `total` | number | Tổng kết quả (ước lượng từ API ngoài) |
| `papers` | array | Mảng `PaperLive` — xem [§9.1](#91-paperlive-tìm-kiếm-live) |

---

### `GET /sources/trend`

**Query parameters**

| Trường | Kiểu | Bắt buộc | Mặc định |
|--------|------|----------|----------|
| `keyword` | string | **Có** | — |
| `source` | string | Không | `openalex` |
| `startYear` | number | Không | `2010` |

**Response `200`**

| Trường | Kiểu | Mô tả |
|--------|------|--------|
| `success` | boolean | |
| `source` | string | |
| `keyword` | string | |
| `trends` | array | Mảng `YearlyTrendPoint` |

`YearlyTrendPoint`:

| Trường | Kiểu | Mô tả |
|--------|------|--------|
| `year` | number | Năm |
| `count` | number | Số bài trong năm |
| `growthRate` | number | % tăng so với năm trước (năm đầu = 0) |

---

### `GET /sources/journal`

**Query parameters**

| Trường | Kiểu | Bắt buộc | Mặc định |
|--------|------|----------|----------|
| `query` | string | **Có** | — |
| `source` | string | Không | `openalex` (chỉ hỗ trợ OpenAlex) |

**Response `200`**

| Trường | Kiểu | Mô tả |
|--------|------|--------|
| `success` | boolean | |
| `source` | string | |
| `journals` | array | |

Phần tử `journals[]`:

| Trường | Kiểu |
|--------|------|
| `id` | string |
| `title` | string |
| `issn` | string \| null |
| `publisher` | string \| null |
| `impactFactor` | number \| null |
| `paperCount` | number |

---

### `GET /sources/author`

**Query parameters**

| Trường | Kiểu | Bắt buộc | Mặc định |
|--------|------|----------|----------|
| `query` | string | **Có** | — |
| `source` | string | Không | `openalex` |

Hỗ trợ: `openalex`, `semanticscholar`.

**Response `200`**

| Trường | Kiểu | Mô tả |
|--------|------|--------|
| `success` | boolean | |
| `source` | string | |
| `authors` | array | |

Phần tử `authors[]`:

| Trường | Kiểu |
|--------|------|
| `id` | string |
| `name` | string |
| `citationCount` | number |
| `paperCount` | number |
| `orcid` | string \| null (OpenAlex) |

---

## 5. Corpus — theo dõi hybrid

Base: `/api/v1/corpus` — Lưu snapshot vào MongoDB.

> Ingestion hiện chỉ chạy với `source: openalex`.

### `POST /corpus/runs`

**Request body**

| Trường | Kiểu | Bắt buộc | Mặc định | Mô tả |
|--------|------|----------|----------|--------|
| `seedKeyword` | string | **Có** | — | Từ khóa seed |
| `source` | string | Không | `openalex` | Nguồn thu thập |
| `startYear` | number | Không | currentYear−5 | Năm bắt đầu |
| `endYear` | number | Không | năm hiện tại | Năm kết thúc |
| `maxPages` | number | Không | `4` | Số trang OpenAlex (1–20) |
| `perPage` | number | Không | `25` | Bài/trang (10–50) |

**Response `202`** — Job chạy nền

| Trường | Kiểu | Mô tả |
|--------|------|--------|
| `success` | boolean | |
| `message` | string | Hướng dẫn poll |
| `run` | object | `AnalysisRun` — xem [§9.3](#93-analysisrun) |

---

### `GET /corpus/runs`

**Query parameters**

| Trường | Kiểu | Bắt buộc | Mặc định |
|--------|------|----------|----------|
| `status` | string | Không | — | Lọc: `pending`, `ingesting`, `analyzing`, `completed`, `failed` |
| `page` | number | Không | `1` |
| `limit` | number | Không | `20` |

**Response `200`**

| Trường | Kiểu | Mô tả |
|--------|------|--------|
| `success` | boolean | |
| `runs` | array | Danh sách `AnalysisRun` |
| `total` | number | Tổng số run |
| `page` | number | |
| `limit` | number | |

---

### `GET /corpus/runs/{runId}`

**Path**

| Trường | Kiểu | Bắt buộc |
|--------|------|----------|
| `runId` | string (ObjectId) | Có |

**Response `200`**

| Trường | Kiểu | Mô tả |
|--------|------|--------|
| `success` | boolean | |
| `run` | object | `AnalysisRun` đầy đủ; `topicId` có thể populate |

Khi `status === completed`, `run` thêm:

| Trường | Kiểu | Mô tả |
|--------|------|--------|
| `yearlyData` | array | `YearlyTrendPoint` |
| `averageGrowthRate` | number | |
| `trendStatus` | string | `exploding` \| `growing` \| `stable` \| `declining` |
| `emergenceScore` | number | 0–1 |
| `isEmerging` | boolean | |
| `topicId` | string \| object | Liên kết Topic |
| `paperCount` | number | |
| `papersAdded` | number | |
| `papersSkipped` | number | |
| `completedAt` | string | |

---

### `GET /corpus/runs/{runId}/papers`

**Path:** `runId` — bắt buộc.

**Query:** `page` (mặc định 1), `limit` (mặc định 20).

**Response `200`**

| Trường | Kiểu | Mô tả |
|--------|------|--------|
| `success` | boolean | |
| `runId` | string | |
| `seedKeyword` | string | |
| `papers` | array | Bài trong corpus — trường rút gọn |
| `total` | number | |
| `page` | number | |
| `limit` | number | |

Mỗi phần tử `papers[]`:

| Trường | Kiểu |
|--------|------|
| `_id` | string |
| `title` | string |
| `abstract` | string \| null |
| `publicationYear` | number \| null |
| `citationCount` | number |
| `journalName` | string \| null |
| `doi` | string \| null |
| `url` | string \| null |
| `keywords` | string[] |

---

### `POST /corpus/runs/{runId}/follow`

| | |
|---|---|
| **Auth** | Bearer — **Có** |

**Path:** `runId`

**Request body (tùy chọn)**

| Trường | Kiểu | Bắt buộc | Mặc định |
|--------|------|----------|----------|
| `notifyEnabled` | boolean | Không | `true` |

**Response `200`**

| Trường | Kiểu | Mô tả |
|--------|------|--------|
| `success` | boolean | |
| `message` | string | |
| `trackedRuns` | array | Mảng entry theo dõi trên User |

`trackedRuns[]`:

| Trường | Kiểu |
|--------|------|
| `analysisRunId` | string (ObjectId) |
| `notifyEnabled` | boolean |
| `followedAt` | string |

---

### `GET /corpus/me/tracked`

| | |
|---|---|
| **Auth** | Bearer — **Có** |

**Response `200`**

| Trường | Kiểu | Mô tả |
|--------|------|--------|
| `success` | boolean | |
| `trackedRuns` | array | `analysisRunId` được populate |

`trackedRuns[].analysisRunId` (populate):

| Trường | Kiểu |
|--------|------|
| `_id` | string |
| `seedKeyword` | string |
| `status` | string |
| `paperCount` | number |
| `trendStatus` | string |
| `isEmerging` | boolean |
| `averageGrowthRate` | number |
| `startYear`, `endYear` | number |
| `completedAt` | string |

---

## 6. Trends

Base: `/api/v1/trends`

### `GET /trends/keyword`

Giống `GET /sources/trend` + thêm phân loại xu hướng.

**Query:** `keyword` (bắt buộc), `source`, `startYear`

**Response `200`**

| Trường | Kiểu | Mô tả |
|--------|------|--------|
| `success` | boolean | |
| `keyword` | string | |
| `trendStatus` | string | `exploding` \| `growing` \| `stable` \| `declining` |
| `averageGrowthRate` | string | Chuỗi số (2 chữ số thập phân) |
| `source` | string | |
| `trends` | array | `YearlyTrendPoint` |

---

### `POST /trends/compare`

**Request body**

| Trường | Kiểu | Bắt buộc | Mặc định |
|--------|------|----------|----------|
| `keywords` | string[] | **Có** | — |
| `source` | string | Không | `openalex` |
| `startYear` | number | Không | `2010` |

**Response `200`**

| Trường | Kiểu | Mô tả |
|--------|------|--------|
| `success` | boolean | |
| `comparisons` | array | Mỗi phần tử giống response `sources/trend` (source, keyword, trends) |

---

### `GET /trends/emerging`

> Cần chạy `POST /corpus/runs` trước và đợi `completed`.

**Query:** `limit` (mặc định 10), `analysisRunId` (tùy chọn)

**Response `200`**

| Trường | Kiểu | Mô tả |
|--------|------|--------|
| `success` | boolean | |
| `source` | string | `"all"` hoặc `"corpus_run"` |
| `topics` | array | Document `Topic` có `isEmerging: true` |
| `corpusRuns` | array | Run có `isEmerging: true` (rút gọn) |

`topics[]` — các trường chính: xem [§9.2 Topic](#92-topic-chủ-đề-corpus).

---

### `GET /trends/trending`

**Query:** `limit`, `analysisRunId` (tùy chọn)

**Response `200`**

| Trường | Kiểu | Mô tả |
|--------|------|--------|
| `success` | boolean | |
| `source` | string | |
| `topics` | array | `trendStatus` ∈ `exploding`, `growing` |

---

### `GET /trends/topics/{topicId}`

**Path:** `topicId` (ObjectId)

**Response `200`**

| Trường | Kiểu | Mô tả |
|--------|------|--------|
| `success` | boolean | |
| `topic` | object | `Topic` + `papers`, `parentTopics`, `relatedTopics` populate |

---

## 6.5 Notifications (JWT)

Base: `/api/v1/notifications` — tất cả endpoint yêu cầu `Authorization: Bearer <token>`.

### `GET /notifications`

| Query | Kiểu | Mặc định | Mô tả |
|-------|------|----------|--------|
| `page` | number | 1 | |
| `limit` | number | 20 (max 100) | |
| `unreadOnly` | boolean | false | Chỉ lấy chưa đọc |

**Response `200`**

| Trường | Kiểu | Mô tả |
|--------|------|--------|
| `success` | boolean | |
| `notifications` | array | `title`, `message`, `type`, `refId`, `refType`, `isRead`, `sentAt` |
| `total`, `page`, `limit` | number | |

`type`: `newPaper` \| `trendingKeyword` \| `syncComplete` \| `system`

### `GET /notifications/unread-count`

**Response `200`:** `{ success, unreadCount }`

### `PATCH /notifications/{notificationId}/read`

**Response `200`:** `{ success, notification }` — `404` nếu không thuộc user.

### `PATCH /notifications/read-all`

**Response `200`:** `{ success, modifiedCount }`

Tự sinh khi corpus run `completed` (user đã `follow` run) và khi `isEmerging` (trending).

---

## 7. Papers

Base: `/api/v1/papers`

### `GET /papers/search`

Giống hệt `GET /sources/search` (query và response `PaperLive`).

---

### `GET /papers/{paperId}`

**Path:** `paperId` — ObjectId MongoDB (không phải ID OpenAlex).

**Response `200`**

| Trường | Kiểu | Mô tả |
|--------|------|--------|
| `success` | boolean | |
| `paper` | object | Document `Paper` — xem [§9.4 Paper DB](#94-paper-trong-mongodb) |

Side effect: `viewCount` tăng 1.

---

### `POST /papers`

| | |
|---|---|
| **Auth** | Bearer — **Có** |

**Request body**

| Trường | Kiểu | Bắt buộc |
|--------|------|----------|
| `paper` | object | **Có** — schema Paper (cần `title`, `source`) |

**Response `201`**

| Trường | Kiểu |
|--------|------|
| `success` | boolean |
| `message` | string |
| `paper` | object — bài vừa lưu |

**Response `409`:** `paper` — bản ghi trùng.

---

### `POST /papers/{paperId}/bookmark`

| | |
|---|---|
| **Auth** | Bearer — **Có** |

**Path:** `paperId`

**Request body:** Không bắt buộc.

**Response `200`**

| Trường | Kiểu |
|--------|------|
| `success` | boolean |
| `message` | string |
| `paper` | object |

---

### `GET /papers/bookmarks`

| | |
|---|---|
| **Auth** | Bearer — **Có** |

**Query:** `page`, `limit`

**Response `200`**

| Trường | Kiểu |
|--------|------|
| `success` | boolean |
| `total` | number |
| `papers` | array |
| `pagination.page` | number |
| `pagination.limit` | number |
| `pagination.pages` | number |

---

## 8. AI Service (proxy)

Base: `/api/v1/ai` — Proxy sang Python `:8000`.

**Lưu ý:** Mọi `POST` phải có body JSON đủ trường; `{}` → lỗi `422`.

### `GET /ai/health`

**Response khi AI chạy (`200`)**

| Trường | Kiểu |
|--------|------|
| `status` | string — `"healthy"` |
| `service` | string |
| `version` | string |

**Response khi AI tắt (`200` graceful)**

| Trường | Kiểu |
|--------|------|
| `success` | boolean — `true` |
| `status` | string — `"unavailable"` |
| `service` | string |
| `message` | string |
| `error` | string |

---

### `POST /ai/embeddings/embed`

**Request body**

| Trường | Kiểu | Bắt buộc |
|--------|------|----------|
| `text` | string | **Có** |

**Response `200`**

| Trường | Kiểu | Mô tả |
|--------|------|--------|
| `success` | boolean | |
| `text` | string | Text đầu vào |
| `embedding` | number[] | Vector 384 chiều |
| `dimension` | number | Thường `384` |

---

### `POST /ai/embeddings/embed-batch`

**Request body**

| Trường | Kiểu | Bắt buộc |
|--------|------|----------|
| `texts` | string[] | **Có** |

**Response `200`**

| Trường | Kiểu | Mô tả |
|--------|------|--------|
| `success` | boolean | |
| `count` | number | Số câu |
| `embeddings` | number[][] | Mảng vector |
| `dimension` | number | |

---

### `POST /ai/embeddings/similarity`

**Request body**

| Trường | Kiểu | Bắt buộc |
|--------|------|----------|
| `text1` | string | **Có** |
| `text2` | string | **Có** |

**Response `200`**

| Trường | Kiểu | Mô tả |
|--------|------|--------|
| `success` | boolean | |
| `text1`, `text2` | string | |
| `similarity` | number | Cosine similarity (~0–1) |
| `interpretation` | string | `"High similarity"` hoặc `"Low similarity"` |

---

### `POST /ai/recommendations/papers`

**Request body**

| Trường | Kiểu | Bắt buộc | Mặc định |
|--------|------|----------|----------|
| `userInterests` | string[] | **Có** | — |
| `candidatePapers` | object[] | **Có** | — |
| `userHistory` | object[] | Không | `[]` |
| `topN` | number | Không | `10` |

Mỗi `candidatePapers[]` / `userHistory[]`:

| Trường | Kiểu | Bắt buộc |
|--------|------|----------|
| `paperId` | string | Có |
| `title` | string | Có |
| `abstract` | string | Không |
| `keywords` | string[] | Không |
| `citationCount` | number | Không |
| `authors` | string[] | Không |

**Response `200`**

| Trường | Kiểu | Mô tả |
|--------|------|--------|
| `success` | boolean | |
| `message` | string | |
| `recommendations` | array | Bài đã xếp hạng + điểm |

Mỗi `recommendations[]` (giữ nguyên field gốc + điểm):

| Trường | Kiểu | Mô tả |
|--------|------|--------|
| `paperId` | string | |
| `title` | string | |
| `abstract` | string | |
| `keywords` | string[] | |
| `citationCount` | number | |
| `score` | number | Điểm tổng (0–1) |
| `semanticScore` | number | Độ tương đồng ngữ nghĩa |
| `keywordScore` | number | Trùng từ khóa |
| `citationBoost` | number | Boost trích dẫn |
| `reason` | string | Lý do gợi ý (text) |

---

### `POST /ai/recommendations/research-directions`

**Request body**

| Trường | Kiểu | Bắt buộc |
|--------|------|----------|
| `keywords` | string[] | **Có** |

**Response `200`**

| Trường | Kiểu | Mô tả |
|--------|------|--------|
| `success` | boolean | |
| `message` | string | |
| `directions` | array | |

Mỗi `directions[]`:

| Trường | Kiểu | Mô tả |
|--------|------|--------|
| `direction` | string | Tên hướng đại diện |
| `keywords` | string[] | Nhóm từ khóa |
| `rationale` | string | Giải thích |
| `confidence` | number | Độ tin cậy clustering |
| `priority` | number | Mức ưu tiên |

---

### `POST /ai/summarization/abstract`

**Request body**

| Trường | Kiểu | Bắt buộc | Mặc định |
|--------|------|----------|----------|
| `abstract` | string | **Có** | — |
| `maxLength` | number | Không | `150` |

**Response `200`**

| Trường | Kiểu | Mô tả |
|--------|------|--------|
| `success` | boolean | |
| `message` | string | |
| `summary` | string | Tóm tắt ngắn |
| `keyPoints` | string[] | Các câu then chốt |

---

### `POST /ai/summarization/extract-problem`

**Request body**

| Trường | Kiểu | Bắt buộc |
|--------|------|----------|
| `abstract` | string | **Có** |

**Response `200`**

| Trường | Kiểu | Mô tả |
|--------|------|--------|
| `success` | boolean | |
| `problem` | string | Vấn đề nghiên cứu |
| `methodology` | string | Phương pháp |
| `results` | string | Kết quả |

---

## 9. Đối tượng dùng chung (schema)

### 9.1 PaperLive (tìm kiếm live)

Dùng trong `papers[]` của search (Sources/Papers).

| Trường | Kiểu | Mô tả |
|--------|------|--------|
| `id` | string | ID nguồn ngoài |
| `title` | string | |
| `abstract` | string \| object \| null | OpenAlex có thể trả inverted index |
| `doi` | string \| null | |
| `publishedDate` | string \| null | ISO date |
| `publicationYear` | number \| null | |
| `citationCount` | number | |
| `authors` | array | `{ authorId, name }` |
| `journalName` | string \| null | |
| `url` | string \| null | |
| `source` | string | `openalex` \| `semanticscholar` \| `crossref` |

---

### 9.2 Topic (chủ đề corpus)

| Trường | Kiểu | Mô tả |
|--------|------|--------|
| `_id` | string | |
| `name` | string | Tên topic (= seedKeyword) |
| `seedKeyword` | string | |
| `analysisRunId` | string | |
| `description` | string | |
| `relatedKeywords` | string[] | |
| `paperCount` | number | |
| `trendStatus` | string | |
| `growthRate` | number | |
| `accelerationFactor` | number | |
| `yearlyData` | array | `{ year, count, growthRate }` |
| `isEmerging` | boolean | |
| `emergenceScore` | number | |
| `papers` | array | ObjectId hoặc object populate |
| `lastAnalyzedAt` | string | |
| `createdAt`, `updatedAt` | string | |

---

### 9.3 AnalysisRun

| Trường | Kiểu | Mô tả |
|--------|------|--------|
| `_id` | string | |
| `seedKeyword` | string | |
| `source` | string | |
| `startYear`, `endYear` | number | |
| `status` | string | `pending` \| `ingesting` \| `analyzing` \| `completed` \| `failed` |
| `maxPages`, `perPage` | number | |
| `papersAdded`, `papersSkipped`, `paperCount` | number | |
| `yearlyData` | array | Khi đã analyze |
| `averageGrowthRate` | number | |
| `trendStatus` | string | |
| `emergenceScore` | number | |
| `isEmerging` | boolean | |
| `topicId` | string \| object | |
| `createdBy` | string \| null | |
| `errorMessage` | string \| null | Khi `failed` |
| `startedAt`, `completedAt` | string | |
| `createdAt`, `updatedAt` | string | |

---

### 9.4 Paper (trong MongoDB)

| Trường | Kiểu | Mô tả |
|--------|------|--------|
| `_id` | string | Dùng cho `GET /papers/:paperId` |
| `title` | string | Bắt buộc khi tạo |
| `abstract` | string | |
| `doi` | string | |
| `publicationYear` | number | |
| `publishedDate` | string | |
| `externalIds` | object | `{ openalex, semanticScholar, crossref }` |
| `authors` | array | `{ name, affiliations, externalId }` |
| `journal` | string (ObjectId) | |
| `journalName` | string | |
| `citationCount` | number | |
| `keywords` | string[] | |
| `topics` | string[] | ObjectId Topic |
| `source` | string | Bắt buộc khi tạo |
| `analysisRunId` | string | Gắn corpus |
| `aiSummary` | string | |
| `semanticEmbedding` | number[] | |
| `bookmarkedBy` | string[] | |
| `viewCount` | number | |
| `createdAt`, `updatedAt` | string | |

---

## Bảng tra nhanh: Request vs Response

| Method | Endpoint | Request | Response chính |
|--------|----------|---------|----------------|
| GET | `/health` | — | `success`, `message`, `timestamp` |
| POST | `/auth/register` | body: `name`, `email`, `password` | `token`, `user` |
| POST | `/auth/login` | body: `email`, `password` | `token`, `user` |
| GET | `/auth/me` | Header JWT | `user` |
| GET | `/sources/search` | query: `keyword` | `papers[]`, `total` |
| GET | `/sources/trend` | query: `keyword` | `trends[]` |
| POST | `/corpus/runs` | body: `seedKeyword` | `run` |
| GET | `/corpus/runs/{id}` | path `runId` | `run` + `yearlyData` |
| GET | `/trends/emerging` | query `limit` | `topics[]`, `corpusRuns[]` |
| POST | `/ai/embeddings/embed` | body: `text` | `embedding[]` |
| POST | `/ai/recommendations/papers` | body: interests + candidates | `recommendations[]` |

---

*Tài liệu bám sát mã nguồn backend + ai-service. Cập nhật khi thêm endpoint mới.*
