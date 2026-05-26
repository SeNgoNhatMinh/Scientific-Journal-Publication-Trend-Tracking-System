# Deploy lên Railway (Backend + AI Service)

Hướng dẫn deploy **2 Web Service** từ monorepo này. **MongoDB** dùng **Atlas** (không deploy DB trên Railway).

Kết quả mong muốn:

| Service | URL production (team) |
|---------|------------------------|
| Backend | `https://scientific-journal-publication-trend-tracking-sy-production.up.railway.app` |
| Swagger | `https://scientific-journal-publication-trend-tracking-sy-production.up.railway.app/api-docs` |
| OpenAPI JSON | `https://scientific-journal-publication-trend-tracking-sy-production.up.railway.app/api-docs.json` |
| API cho FE | `https://scientific-journal-publication-trend-tracking-sy-production.up.railway.app/api/v1` |
| AI Service (BE gọi nội bộ) | `https://lavish-adventure-production-dd7f.up.railway.app` |

Hướng dẫn test FE: **[05-huong-dan-fe.md](05-huong-dan-fe.md)** · Smoke script: `../scripts/test-production.sh`

---

## Biến môi trường copy-paste

File **`RAILWAY_VARIABLES.env`** (local, đã gitignore) — 2 khối cho service **AI** và **backend**.  
Mẫu không secret: **`../config/railway.mau.env`**.

---

## Điều kiện

- Tài khoản [Railway](https://railway.app)
- Repo đã push GitHub (quyền push vào repo team)
- `MONGODB_URI` từ MongoDB Atlas
- Atlas **Network Access** (bắt buộc — xem mục dưới)

### MongoDB Atlas — cho phép Railway kết nối

Railway **không có IP cố định**. Nếu log báo *IP isn't whitelisted*:

1. [MongoDB Atlas](https://cloud.mongodb.com) → project → **Network Access** (Security)
2. **Add IP Address**
3. Chọn **Allow Access from Anywhere** → `0.0.0.0/0` (ghi chú: `Railway + dev`)
4. **Confirm** → đợi 1–2 phút trạng thái **Active**
5. Railway backend → **Redeploy**

> Capstone/demo: `0.0.0.0/0` là cách phổ biến. Production thật có thể thu hẹp IP sau.

Kiểm tra thêm: **Database Access** — user trong `MONGODB_URI` có quyền read/write DB `journal_trend`.

---

## Bước 1 — Tạo Project

1. Railway Dashboard → **New Project** → **Deploy from GitHub repo**
2. Chọn repo `Scientific_Journal_Trend_Backend` (hoặc tên repo của team)

### ⚠️ Lỗi thường gặp: `Railpack could not determine how to build the app`

Log có `backend/` trong list file nhưng build **từ root** → Railway không thấy `package.json` ở root.

**Cách sửa (chọn một):**

| Cách | Thao tác |
|------|----------|
| **A (khuyến nghị)** | Service → **Settings** → **Root Directory** → gõ `backend` (API) hoặc `ai-service` (AI) → **Redeploy** |
| **B** | Chỉ deploy API từ root: repo đã có `package.json` + `railway.toml` ở root (chạy `cd backend && npm start`) — **không** dùng cho service AI |

Mỗi service (Backend / AI) = **một** Root Directory riêng, **không** để trống `/`.

---

## Bước 2 — Service AI (deploy trước)

1. Trong project → **Add Service** → **GitHub Repo** (cùng repo) hoặc duplicate service
2. **Settings → Root Directory:** `ai-service` ← **bắt buộc**
3. Railway đọc `ai-service/railway.toml` (build Docker). Build log **đúng** khi thấy Python/pip/uvicorn — **sai** nếu thấy `cd backend && npm start`.
4. **Variables** (chỉ các biến sau — **không** dán `MONGODB_URI`, `JWT_SECRET`, `NODE_ENV`):

| Biến | Giá trị |
|------|---------|
| `CORS_ORIGINS` | `https://scientific-journal-publication-trend-tracking-sy-production.up.railway.app,http://localhost:3000` |

5. **Deploy** → đợi build (lần đầu cài ML có thể **5–15 phút**)
6. **Settings → Networking → Generate Domain** (port **8080** nếu Railway hỏi) → copy URL, ví dụ production:
   `https://lavish-adventure-production-dd7f.up.railway.app`
7. Kiểm tra: `GET <AI_URL>/health`

> Nếu build/run OOM: tăng **Memory** trong Railway (Settings → Resources) hoặc tạm tắt route nặng khi demo.

---

## Bước 3 — Service Backend

1. **Add Service** → cùng repo
2. **Root Directory:** `backend` ← **bắt buộc**
3. File `backend/railway.toml` dùng Nixpacks, start `npm start`
4. **Variables** (bắt buộc):

| Biến | Ví dụ / ghi chú |
|------|------------------|
| `NODE_ENV` | `production` |
| `MONGODB_URI` | `mongodb+srv://...` (Atlas) |
| `JWT_SECRET` | Chuỗi dài, random |
| `JWT_EXPIRE` | `7d` |
| `AI_SERVICE_URL` | URL AI bước 2 (không slash cuối) |
| `CORS_ORIGIN` | URL FE; nhiều origin: `https://a.com,https://b.vercel.app` |
| `OPENALEX_API_URL` | `https://api.openalex.org` |
| `CROSSREF_MAILTO` | email thật |

5. **Không cần set `PORT`** — Railway tự inject.
6. **Optional** (Swagger “Servers” đúng host):

| Biến | Giá trị |
|------|---------|
| `PUBLIC_API_URL` | `https://<domain-backend-cua-ban>` |

Hoặc Railway tự set `RAILWAY_PUBLIC_DOMAIN` → backend tự ghép `https://...` cho Swagger.

7. **Generate Domain** cho backend
8. Kiểm tra:
   - `GET <BE>/health`
   - `GET <BE>/api/v1/ai/health`
   - Mở `<BE>/api-docs`

9. Quay lại service AI → cập nhật `CORS_ORIGINS` thêm domain backend nếu cần.

---

## Bước 4 — Gửi cho Frontend

```text
API_BASE_URL=https://<backend-domain>/api/v1
SWAGGER_UI=https://<backend-domain>/api-docs
OPENAPI_JSON=https://<backend-domain>/api-docs.json
```

FE (Vite):

```env
VITE_API_BASE_URL=https://<backend-domain>/api/v1
```

Codegen (chạy trên máy dev):

```bash
npx openapi-typescript-codegen \
  --input https://<backend-domain>/api-docs.json \
  --output ./src/api/generated \
  --client axios
```

Auth: `POST /api/v1/auth/login` → header `Authorization: Bearer <token>`.

---

## Checklist sau deploy

- [ ] `GET /health` — backend OK
- [ ] `GET /api/v1/ai/health` — BE → AI OK
- [ ] `GET /api-docs` — Swagger mở được
- [ ] `GET /api/v1/papers/search?keyword=test` — OpenAlex
- [ ] Gọi từ trình duyệt FE — không lỗi CORS
- [ ] Swagger dropdown **Servers** trỏ production (nếu đã set `PUBLIC_API_URL` / `RAILWAY_PUBLIC_DOMAIN`)

---

## Xử lý sự cố

| Triệu chứng | Gợi ý |
|-------------|--------|
| `Railpack could not determine how to build` | Đặt **Root Directory** = `backend` hoặc `ai-service`; không deploy từ `/` trống |
| Build log có `cd backend && npm start` khi deploy **AI** | **Sai Root Directory** — đang build repo root. Sửa Settings → Root Directory = `ai-service` → Redeploy |
| Healthcheck failed + Nixpacks `nodejs_24` trên service AI | Cùng lỗi trên: Railway chạy backend Node thay vì Python. Xóa biến `NODE_ENV`/`MONGODB_URI` khỏi service AI (chỉ cần `CORS_ORIGINS`) |
| `Script start.sh not found` | Cùng nguyên nhân — chưa chỉ Root Directory |
| Build AI fail / OOM | Tăng RAM; hoặc deploy AI trên VPS riêng |
| `api/v1/ai/*` 502 | Sai `AI_SERVICE_URL`; AI chưa chạy |
| `IP isn't whitelisted` / Could not connect to any servers | Atlas → **Network Access** → thêm `0.0.0.0/0` → Redeploy |
| Mongo timeout (sau khi whitelist OK) | Kiểm tra `MONGODB_URI`; user/password đúng; password ký tự đặc biệt cần URL-encode |
| CORS error từ FE | Sửa `CORS_ORIGIN` đúng origin (kể cả `https://`, không slash cuối) |
| Cold start chậm | Bình thường trên plan free/hobby |
| `timeout of 15000ms exceeded` khi search | OpenAlex chậm từ Railway; redeploy code mới (timeout 45s + `mailto`); thử `limit=5`; set `OPENALEX_MAILTO` email thật |

---

## Liên quan

- Chạy local: [01-chay-nhanh.md](01-chay-nhanh.md)
- Docker (tùy chọn, không bắt buộc với Atlas): `docker-compose.yml`
