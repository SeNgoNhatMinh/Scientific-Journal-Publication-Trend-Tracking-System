# Tài liệu dự án

Đọc theo thứ tự số — tên file ngắn, tiếng Việt.

| # | File | Nội dung |
|---|------|----------|
| 01 | [01-chay-nhanh.md](./01-chay-nhanh.md) | Chạy local, Swagger, corpus |
| 02 | [02-deploy-railway.md](./02-deploy-railway.md) | Deploy Backend + AI lên Railway |
| 03 | [03-api-dac-ta.md](./03-api-dac-ta.md) | Đặc tả API (endpoint, luồng) |
| 04 | [04-api-chi-tiet.md](./04-api-chi-tiet.md) | Chi tiết request/response từng API |
| 05 | [05-huong-dan-fe.md](./05-huong-dan-fe.md) | Hướng dẫn FE, curl, smoke test production |
| 12 | [12-luong-nghiep-vu.md](./12-luong-nghiep-vu.md) | **Use case & luồng nghiệp vụ** — giải thích để báo cáo/thuyết trình + diagram cho FE |
| 06 | [06-kien-truc.md](./06-kien-truc.md) | **Software Architecture Diagram** (C4, deploy, ER) |
| 07 | [07-cau-truc-du-an.md](./07-cau-truc-du-an.md) | Cấu trúc thư mục (EN) |
| 08 | [08-thuat-toan-paper.md](./08-thuat-toan-paper.md) | Thuật toán & paper tham khảo |
| 09 | [09-checklist.md](./09-checklist.md) | Checklist hoàn thành |
| 10 | [10-phase1-cu.md](./10-phase1-cu.md) | Snapshot Phase 1 (cũ, tham khảo) |
| 11 | [11-tom-tat-giao-hang.md](./11-tom-tat-giao-hang.md) | Tóm tắt giao hàng (EN) |
| 13 | [13-schema-hop-nhat.md](./13-schema-hop-nhat.md) | **Schema DB hợp nhất FA + WDP** (11 collection) |
| 15 | [15-research-workspace.md](./15-research-workspace.md) | **Research Workspace / Place** — định hướng tạo trend riêng cho cá nhân/nhóm, mobile alert và mô hình tính phí |

## Cấu hình mẫu

| File | Mục đích |
|------|----------|
| [../config/railway.mau.env](../config/railway.mau.env) | Biến Railway (copy vào dashboard) |
| [../config/docker.mau.env](../config/docker.mau.env) | Biến Docker (copy thành `.env.docker`) |

## Script test

```bash
./scripts/test-production.sh scripts/ket-qua-test.md
```

Tổng quan dự án: [README.md](../README.md)
