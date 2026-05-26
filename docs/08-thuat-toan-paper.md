# Thuật toán, bài báo tham khảo và trạng thái dự án

Tài liệu này liệt kê các thuật toán liên quan đến **Hệ thống theo dõi xu hướng công bố tạp chí khoa học**, kèm paper tham khảo, liên kết và trạng thái thực tế trong mã nguồn.

## 1) Thuật toán đang chạy thật trong project

Ghi chú: nếu một thành phần hiện tại là heuristic nội bộ và không có paper riêng, mình quy chiếu sang thuật toán/paper gần nhất có thể triển khai được trong hệ thống.

| Thuật toán | Paper / nguồn tham khảo | Link | Trạng thái trong project | Gọi trong code | Tác dụng / Chức năng |
|---|---|---|---|---|
| Sentence-BERT / sentence-transformers | Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks (Reimers & Gurevych, 2019) | https://arxiv.org/abs/1908.10084 | Đang chạy thật | `ai-service/app/services/embedding_service.py` | Chuyển tiêu đề / abstract / keywords thành vector ngữ nghĩa để các bước sau so sánh và xếp hạng. |
| Tìm kiếm ngữ nghĩa bằng vector | Sentence-BERT: Sentence Embeddings using Siamese BERT-Networks (Reimers & Gurevych, 2019) | https://arxiv.org/abs/1908.10084 | Đang chạy thật | `ai-service/app/services/recommendation_service.py` | So sánh độ gần nghĩa giữa user interests và candidate papers để xếp hạng bài liên quan nhất. |
| Tóm tắt trích xuất văn bản | TextRank: Bringing Order into Texts (Mihalcea & Tarau, 2004) | https://aclanthology.org/W04-3252/ | Đang chạy thật theo hướng triển khai tương đương | `ai-service/app/services/summarization_service.py` | Chọn các câu quan trọng nhất trong abstract để tạo summary ngắn và key points. |
| Phát hiện xu hướng theo chuỗi thời gian | Dynamic Topic Models (Blei & Ng, 2006) | https://www.cs.princeton.edu/~blei/papers/Blei2006b.pdf | Đang chạy thật theo hướng rule-based tương đương | `backend/src/controllers/trendController.js`, `backend/src/services/academicApiService.js`, `backend/src/services/corpusAnalysisService.js` | Đếm số bài theo năm (live API hoặc corpus đã lưu), tính growth rate, gán nhãn exploding / growing / stable / declining; corpus tạo `Topic` có `emergenceScore`. |

## 2) Thuật toán có trong dependency / tài liệu, nhưng chưa thấy chạy trong runtime hiện tại

| Thuật toán | Paper / nguồn tham khảo | Link | Trạng thái trong project | Gọi trong code | Tác dụng / Chức năng |
|---|---|---|---|---|
| BERTopic | BERTopic: Neural topic modeling with a class-based TF-IDF procedure (Grootendorst, 2022) | https://arxiv.org/abs/2203.05556 | Có trong dependency / tài liệu | Chưa thấy runtime gọi trực tiếp | Dùng để phân tích chủ đề và sinh topic labels từ tập tài liệu. |
| UMAP | UMAP: Uniform Manifold Approximation and Projection for Dimension Reduction (McInnes et al., 2018) | https://arxiv.org/abs/1802.03426 | Có trong dependency gián tiếp | Chưa thấy runtime gọi trực tiếp | Giảm chiều vector embedding trước khi clustering để topic dễ tách hơn. |
| HDBSCAN | Accelerated Hierarchical Density Clustering with Automatic Cluster Selection (McInnes et al., 2017) | https://arxiv.org/abs/1705.07321 | Có trong dependency gián tiếp | Chưa thấy runtime gọi trực tiếp | Phân cụm các embedding thành các nhóm topic mà không cần chọn số cụm trước. |
| Topic Over Time | Topic Over Time: A Non-Homogeneous Poisson Process Approach (Wang & McCallum, 2006) | https://people.cs.umass.edu/~mccallum/papers/tot-kdd06.pdf | Chưa triển khai | Chưa thấy runtime gọi trực tiếp | Mô hình xu hướng chủ đề theo thời gian, phù hợp cho trending analysis nâng cao. |

## 3) Kết luận ngắn

- Project hiện tại đã chạy thật: embedding, tìm kiếm ngữ nghĩa, tóm tắt trích xuất, và trend theo growth rate.
- Các mục heuristic đã được quy chiếu sang thuật toán/paper gần nhất có thể triển khai: TextRank cho summarization, Dynamic Topic Model cho trend.
- Project chưa chạy thật pipeline topic modeling kiểu BERTopic / UMAP / HDBSCAN trong runtime.
- Nếu mục tiêu là trend detection đúng bài báo, phần cần bổ sung tiếp theo là BERTopic hoặc Dynamic Topic Model.

## 4) Bảng chức năng theo thuật toán

| Thuật toán | Chức năng chính trong hệ thống |
|---|---|
| Sentence-BERT / sentence-transformers | Mã hóa text thành vector để so sánh nghĩa giữa các paper. |
| Độ tương đồng cosin | Đo mức độ gần nhau giữa 2 vector embedding. |
| Tìm kiếm ngữ nghĩa bằng vector | Xếp hạng paper gần với sở thích / lịch sử đọc của user. |
| Tóm tắt trích xuất văn bản | Rút gọn abstract thành summary và key points. |
| Phát hiện xu hướng theo chuỗi thời gian | Tính tăng trưởng số bài theo năm và gán nhãn trend. |
| BERTopic | Phân cụm tài liệu thành chủ đề và gán nhãn topic. |
| UMAP | Giảm chiều dữ liệu embedding trước khi phân cụm. |
| HDBSCAN | Phân cụm dữ liệu không cần biết trước số cụm. |
| Topic Over Time | Theo dõi sự thay đổi của chủ đề theo thời gian. |

## 5) Ghi chú kỹ thuật

- File mã nguồn chính để kiểm tra:
  - `ai-service/app/services/embedding_service.py`
  - `ai-service/app/services/recommendation_service.py`
  - `ai-service/app/services/summarization_service.py`
  - `backend/src/controllers/trendController.js`
  - `backend/src/services/academicApiService.js`
  - `backend/src/services/corpusIngestionService.js`
  - `backend/src/services/corpusAnalysisService.js`
- Tài liệu này mô tả trạng thái hiện tại của dự án, không phải lộ trình tương lai.

## 6) Tên thuật toán bằng tiếng Việt

- Sentence-BERT / sentence-transformers: Mô hình embedding câu Sentence-BERT
- Cosine similarity: Độ tương đồng cosin
- Recommendation engine: Bộ gợi ý bài viết theo ngữ nghĩa
- Extractive summarization: Tóm tắt trích xuất
- Trend growth-rate analysis: Phân tích xu hướng theo tốc độ tăng trưởng
- BERTopic: Mô hình chủ đề BERTopic
- UMAP: Giảm chiều UMAP
- HDBSCAN: Phân cụm HDBSCAN
- Dynamic Topic Model: Mô hình chủ đề động
- Topic Over Time: Chủ đề theo thời gian