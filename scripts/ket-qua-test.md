# Smoke test — Railway production

- **When:** 2026-05-22T07:06:37Z
- **Base:** https://scientific-journal-publication-trend-tracking-sy-production.up.railway.app
- **AI (nội bộ BE):** https://lavish-adventure-production-dd7f.up.railway.app

| Test | Method | Path | HTTP | Expected | Result | Time |
|------|--------|------|------|----------|--------|------|
| health | GET | `/health` | 200 | 200 | PASS | 0.76s |
| openapi-json | GET | `/api-docs.json` | 200 | 200 | PASS | 0.85s |
| auth-register | POST | `/api/v1/auth/register` | 409 | 201,409 | PASS | 0.80s |
| auth-login | POST | `/api/v1/auth/login` | 200 | 200 | PASS | 0.78s |
| auth-me | GET | `/api/v1/auth/me` | 200 | 200 | PASS | 0.55s |
| ai-health | GET | `/api/v1/ai/health` | 200 | 200 | PASS | 0.69s |
| ai-embed | POST | `/api/v1/ai/embeddings/embed` | 200 | 200 | PASS | 0.69s |
| ai-embed-batch | POST | `/api/v1/ai/embeddings/embed-batch` | 200 | 200 | PASS | 1.02s |
| ai-similarity | POST | `/api/v1/ai/embeddings/similarity` | 200 | 200 | PASS | 0.46s |
| ai-recommend-papers | POST | `/api/v1/ai/recommendations/papers` | 200 | 200 | PASS | 1.08s |
| ai-research-directions | POST | `/api/v1/ai/recommendations/research-directions` | 200 | 200 | PASS | 0.68s |
| ai-summarize | POST | `/api/v1/ai/summarization/abstract` | 200 | 200 | PASS | 0.91s |
| ai-extract-problem | POST | `/api/v1/ai/summarization/extract-problem` | 200 | 200 | PASS | 2.41s |
| sources-search | GET | `/api/v1/sources/search` | 200 | 200,504 | PASS | 0.41s |
| sources-trend | GET | `/api/v1/sources/trend` | 200 | 200,504 | PASS | 0.86s |
| sources-journal | GET | `/api/v1/sources/journal` | 200 | 200,504 | PASS | 1.30s |
| sources-author | GET | `/api/v1/sources/author` | 200 | 200,504 | PASS | 1.96s |
| papers-search | GET | `/api/v1/papers/search` | 200 | 200,504 | PASS | 0.87s |
| corpus-create-run | POST | `/api/v1/corpus/runs` | 202 | 202 | PASS | 0.76s |
| corpus-list-runs | GET | `/api/v1/corpus/runs` | 200 | 200 | PASS | 0.51s |
| corpus-get-run | GET | `/api/v1/corpus/runs/{id}` | 200 | 200 | PASS | 0.80s |
| corpus-get-papers | GET | `/api/v1/corpus/runs/{id}/papers` | 200 | 200 | PASS | 1.40s |
| corpus-follow | POST | `/api/v1/corpus/runs/{id}/follow` | 200 | 200 | PASS | 1.10s |
| corpus-me-tracked | GET | `/api/v1/corpus/me/tracked` | 200 | 200 | PASS | 0.87s |
| trends-keyword | GET | `/api/v1/trends/keyword` | 200 | 200,504 | PASS | 1.12s |
| trends-compare | POST | `/api/v1/trends/compare` | 200 | 200,504 | PASS | 1.71s |
| trends-emerging | GET | `/api/v1/trends/emerging` | 200 | 200 | PASS | 0.84s |
| trends-trending | GET | `/api/v1/trends/trending` | 200 | 200 | PASS | 0.86s |
| papers-bookmarks | GET | `/api/v1/papers/bookmarks` | 500 | 200 | FAIL* | 0.77s |
| papers-save | POST | `/api/v1/papers` | 201 | 201,400 | PASS | 0.73s |

**Summary:** PASS=29 FAIL=1 (lần kiểm tra 2026-05-22; `papers-save` OK khi có `source`)

### Ghi chú FAIL còn lại

| Test | Nguyên nhân | Hành động |
|------|-------------|-----------|
| papers-bookmarks | Production chưa deploy fix route + fallback controller | **Redeploy backend** (đã sửa trong repo) |

Chạy lại: `./scripts/test-production.sh scripts/ket-qua-test.md`
