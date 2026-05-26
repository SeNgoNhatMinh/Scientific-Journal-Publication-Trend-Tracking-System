# Software Architecture Diagram

**Hệ thống theo dõi xu hướng công bố tạp chí khoa học** — FPT Capstone

| | |
|---|---|
| Kiến trúc | Monorepo, **2 microservice** (Node + Python), MongoDB Atlas |
| Deploy | Railway (Backend + AI), FE tách repo / Vercel |
| API | REST `/api/v1`, Swagger `/api-docs` |

Tài liệu liên quan: [12-luong-nghiep-vu.md](12-luong-nghiep-vu.md) · [03-api-dac-ta.md](03-api-dac-ta.md) · [02-deploy-railway.md](02-deploy-railway.md)

---

## 1. System Context (C4 — Level 1)

Ai dùng hệ thống và hệ thống nói chuyện với ai bên ngoài.

```mermaid
C4Context
  title System Context

  Person(user, "Người dùng", "Sinh viên / giảng viên / researcher")
  Person(dev, "Developer FE", "Tích hợp API")

  System(app, "Journal Trend System", "Theo dõi xu hướng công bố, corpus, AI")

  System_Ext(openalex, "OpenAlex", "Metadata bài báo học thuật")
  System_Ext(semanticscholar, "Semantic Scholar", "Tùy chọn")
  System_Ext(crossref, "Crossref", "Tùy chọn")
  System_Ext(atlas, "MongoDB Atlas", "Lưu users, papers, corpus, topics")

  Rel(user, app, "HTTPS")
  Rel(dev, app, "REST + Swagger")
  Rel(app, openalex, "Search & ingest")
  Rel(app, semanticscholar, "Search")
  Rel(app, crossref, "Search")
  Rel(app, atlas, "Mongoose")
```

---

## 2. Container Diagram (C4 — Level 2)

Các **container** (ứng dụng deploy được) và luồng giao tiếp.

```mermaid
flowchart TB
  subgraph clients [Clients]
    FE[React Frontend<br/>:3000 / Vercel]
    SW[Swagger UI / Postman]
  end

  subgraph railway_be [Railway — Backend]
    BE[Express API<br/>Node.js :PORT]
    SWG[Swagger /api-docs]
  end

  subgraph railway_ai [Railway — AI Service]
    AI[FastAPI<br/>Python :8080]
  end

  subgraph data [Data & External APIs]
    ATLAS[(MongoDB Atlas)]
    OA[OpenAlex API]
    SS[Semantic Scholar]
    CR[Crossref]
  end

  FE -->|JWT REST /api/v1| BE
  SW --> BE
  BE --> SWG
  BE -->|MONGODB_URI| ATLAS
  BE -->|HTTP timeout 90s| OA
  BE -.-> SS
  BE -.-> CR
  BE -->|AI_SERVICE_URL<br/>/api/v1/ai/* proxy| AI

  style FE fill:#e3f2fd
  style BE fill:#fff3e0
  style AI fill:#f3e5f5
  style ATLAS fill:#e8f5e9
```

**Quy tắc quan trọng**

- FE **không** gọi trực tiếp container AI — chỉ qua BE.
- OpenAlex dùng cho **live search** và **corpus ingestion** (background).

---

## 3. Deployment Architecture (Production)

```mermaid
flowchart LR
  subgraph internet [Internet]
    U[User Browser]
    FEAPP[Frontend App]
  end

  subgraph railway [Railway Project]
    SVC_BE[Web Service<br/>Root: backend]
    SVC_AI[Web Service<br/>Root: ai-service]
  end

  subgraph cloud [Cloud]
    ATLAS[(MongoDB Atlas<br/>0.0.0.0/0)]
    OLEX[api.openalex.org]
  end

  U --> FEAPP
  FEAPP -->|HTTPS| SVC_BE
  SVC_BE --> ATLAS
  SVC_BE --> OLEX
  SVC_BE -->|AI_SERVICE_URL| SVC_AI
```

| Container | URL production (team) |
|-----------|------------------------|
| Backend | `scientific-journal-publication-trend-tracking-sy-production.up.railway.app` |
| AI | `lavish-adventure-production-dd7f.up.railway.app` (nội bộ BE) |
| Atlas | Connection string `MONGODB_URI` |

---

## 4. Backend Component Diagram (Layered)

Cấu trúc **Express MVC** trong `backend/src/`.

```mermaid
flowchart TB
  subgraph presentation [Presentation Layer]
    R_AUTH[routes/authRoutes]
    R_SRC[routes/sourceRoutes]
    R_COR[routes/corpusRoutes]
    R_TRD[routes/trendRoutes]
    R_PAP[routes/paperRoutes]
    R_AI[routes/aiRoutes]
    MW[auth · errorHandler · helmet · cors]
  end

  subgraph application [Application Layer — Controllers]
    C_AUTH[authController]
    C_COR[corpusController]
    C_TRD[trendController]
    C_PAP[paperController]
    C_AI[aiController]
  end

  subgraph domain [Domain / Services]
    S_ACA[academicApiService<br/>OpenAlex · S2 · Crossref]
    S_CORP[corpusService · corpusIngestionService<br/>corpusAnalysisService]
    S_AI[aiService proxy]
    S_OA[openalexService]
  end

  subgraph persistence [Persistence — Mongoose Models]
    M_USER[User]
    M_PAPER[Paper]
    M_RUN[AnalysisRun]
    M_TOPIC[Topic]
    M_JOURNAL[Journal]
  end

  R_AUTH --> C_AUTH
  R_SRC --> S_ACA
  R_COR --> C_COR
  R_TRD --> C_TRD
  R_PAP --> C_PAP
  R_AI --> C_AI

  C_AUTH --> M_USER
  C_COR --> S_CORP
  C_TRD --> M_TOPIC
  C_TRD --> M_RUN
  C_PAP --> M_PAPER
  C_AI --> S_AI

  S_CORP --> S_OA
  S_CORP --> M_PAPER
  S_CORP --> M_RUN
  S_ACA --> S_OA
  S_CORP --> M_TOPIC

  MW --> presentation
```

---

## 5. AI Service Component

```mermaid
flowchart LR
  BE[Express Backend] -->|HTTP POST/GET| MAIN[main.py FastAPI]

  subgraph ai_app [ai-service/app]
    EMB[embedding_routes]
    REC[recommendation_routes]
    SUM[summarization_routes]
    ST[sentence-transformers<br/>all-MiniLM-L6-v2]
  end

  MAIN --> EMB
  MAIN --> REC
  MAIN --> SUM
  EMB --> ST
  REC --> ST
```

---

## 6. Data Flow — Corpus Pipeline

Luồng dữ liệu khi user bắt đầu theo dõi từ khóa.

```mermaid
sequenceDiagram
  participant FE as Frontend
  participant API as Express API
  participant ING as corpusIngestionService
  participant ANA as corpusAnalysisService
  participant OA as OpenAlex
  participant DB as MongoDB Atlas

  FE->>API: POST /corpus/runs
  API->>DB: Create AnalysisRun status=pending
  API-->>FE: 202 runId

  API->>ING: background job
  ING->>DB: status=ingesting
  loop pages
    ING->>OA: fetch works by keyword
    OA-->>ING: papers
    ING->>DB: upsert Paper + analysisRunId
  end
  ING->>ANA: aggregate yearly trend
  ANA->>DB: yearlyData, Topic evidence
  ANA->>DB: status=completed
  FE->>API: GET /corpus/runs/id
  API-->>FE: completed + metrics
```

---

## 7. Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Tailwind, Axios, Recharts *(phase 2)* |
| API Gateway | Express.js 4, Node 18+ |
| Auth | JWT (HS256), bcryptjs |
| ORM | Mongoose 8 |
| API Docs | swagger-jsdoc, swagger-ui-express |
| AI Runtime | Python 3.9+, FastAPI, uvicorn |
| ML/NLP | sentence-transformers, scikit-learn *(BERTopic roadmap)* |
| Database | MongoDB Atlas |
| External | OpenAlex (primary), Semantic Scholar, Crossref |
| Deploy | Railway Nixpacks/Docker, Docker Compose *(local)* |

---

## 8. Database — Logical Model (ER simplified)

```mermaid
erDiagram
  User ||--o{ Notification : receives
  User ||--o{ Paper : bookmarks
  User ||--o{ AnalysisRun : tracks
  AnalysisRun ||--o| SyncLog : syncLogId
  AnalysisRun ||--o{ Paper : contains
  AnalysisRun ||--o| Topic : evidences
  AnalysisRun ||--o| Keyword : keywordId
  Paper }o--o{ Keyword : keywordIds
  Paper }o--o| Author : authors
  Keyword ||--o{ PublicationTrend : trends
  Paper }o--o| Journal : published_in

  User {
    ObjectId _id
    string email
    ObjectId[] bookmarks
    ObjectId[] trackedRuns
    array follows
  }

  AnalysisRun {
    ObjectId _id
    string seedKeyword
    ObjectId syncLogId
    ObjectId keywordId
  }

  Notification {
    ObjectId _id
    string type
    boolean isRead
  }

  SyncLog {
    ObjectId _id
    string apiSource
    string status
  }
```

---

## 9. Security Architecture

```mermaid
flowchart LR
  FE[Frontend] -->|HTTPS + Bearer JWT| BE[Express]
  BE --> Helmet[Helmet headers]
  BE --> CORS[CORS whitelist]
  BE --> JWT[JWT verify middleware]
  JWT --> RBAC[role middleware optional]
  BE -->|TLS| ATLAS[(Atlas)]
  BE -->|no secret in repo| ENV[env vars Railway]
```

| Thành phần | Cơ chế |
|------------|--------|
| Transport | HTTPS (Railway) |
| API Auth | `Authorization: Bearer` |
| Password | bcrypt hash, không trả về client |
| Secrets | `JWT_SECRET`, `MONGODB_URI` trên Railway |
| AI | Không public — chỉ BE gọi |

---

## 10. Monorepo Layout

```
Scientific_Journal_Trend_Backend/
├── backend/                 # Container: Express API
│   └── src/
│       ├── routes/          # HTTP endpoints
│       ├── controllers/     # Request handlers
│       ├── services/        # Business + external APIs
│       ├── models/          # Mongoose schemas
│       ├── middlewares/
│       ├── config/
│       └── server.js
├── ai-service/              # Container: FastAPI
│   ├── main.py
│   └── app/routes/
├── docs/                    # Tài liệu + diagram
├── config/                  # Env templates
├── scripts/                 # Smoke test
└── frontend/                # (phase 2)
```

---

*Cập nhật: 05/2026 — Backend + Corpus + AI proxy trên Railway*
