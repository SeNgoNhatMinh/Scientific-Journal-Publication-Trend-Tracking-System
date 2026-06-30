# THIẾT KẾ CHỨC NĂNG: HỆ THỐNG INSIGHT & PHÂN TÍCH XU HƯỚNG BÁO CÁO KHOA HỌC

Tài liệu này mô tả chi tiết thiết kế chức năng **Insight & Phân tích Xu hướng (Research Trend Analysis)** dành cho dự án nghiên cứu khoa học, tối ưu hóa dựa trên việc khai thác siêu dữ liệu (Metadata) như Title, Abstract, Author, và DOI mà không cần tệp tin PDF toàn văn (Full-text).

---

## 1. Lọc và Định hình Đặc trưng (Feature Selection)

Thay vì xử lý toàn bộ văn bản, hệ thống tập trung lọc và làm giàu dữ liệu (Data Enrichment) thông qua 5 đặc trưng cốt lõi. Việc lựa chọn đúng đặc trưng giúp hệ thống cô đọng thông tin, tối ưu hiệu năng tính toán và tập trung vào các dữ liệu có giá trị phân tích xu hướng.

| Đặc trưng (Features) | Nguồn trích xuất | Ý nghĩa đối với phân tích khoa học |
| :--- | :--- | :--- |
| **Chủ đề lớn (Fields of Study)** | Nhãn có sẵn từ API (OpenAlex/Semantic Scholar) hoặc phân loại tự động từ Title + Abstract. | Nhóm bài báo vào các danh mục lớn phục vụ bộ lọc vĩ mô (Ví dụ: *Y tế, Dược phẩm, Kinh tế học, Khoa học máy tính...*). |
| **Từ khóa chính (Keywords)** | Trường `keywords` từ metadata hoặc dùng NLP (Trích xuất thực thể/Cụm từ danh từ) từ Abstract. | Định vị chính xác công nghệ, phương pháp, hoặc đối tượng cốt lõi được nghiên cứu (Ví dụ: *Machine Learning, Vaccine, GDP, Nano-material...*). |
| **Đơn vị công tác (Affiliation)** | Trường `author_org` hoặc `affiliation` trong siêu dữ liệu chuẩn. | Xác định quốc gia, tổ chức, hoặc trường đại học nào đang dẫn đầu hoặc đổ nhiều nguồn lực vào xu hướng đó. |
| **Thời gian (Publication Date)** | Trường `published_date` hoặc năm xuất bản. | Trục thời gian gốc (Tháng/Quý/Năm) - yếu tố bắt buộc để thiết lập biểu đồ động lực và dòng chảy xu hướng. |
| **Tính chất nghiên cứu (Study Type)** | Phân loại từ Abstract bằng biểu thức chính quy (Regex) hoặc mô hình phân loại nhỏ. | *Thay thế cho tiêu chí "Thái độ bài viết" (Tích cực/Tiêu cực) của báo chí*. Xác định phương pháp luận: *Thực nghiệm (RCT/Empirical), Tổng quan (Review), Nghiên cứu tình huống (Case study), hay Mô phỏng...* |

---

## 2. Quy trình Thu thập và Phân loại Dữ liệu (Data Pipeline)

Quy trình chuẩn hóa dòng dữ liệu từ các nguồn thô về kho lưu trữ tập trung phục vụ thống kê được thực hiện qua hai bước chính:

```
[Nguồn bài báo: Crossref / OpenAlex / Upload File]
                       │
                       ▼
         (Gom bài thông qua ID: DOI)
         [Kho dữ liệu dùng chung]
                       │
                       ▼
    (Gán nhãn tự động & Làm giàu dữ liệu)
    [Dữ liệu sẵn sàng phân tích (Enriched)]
```

### 2.1 Gom bài (Data Aggregation)
* Hệ thống cho phép tìm kiếm và tích hợp dữ liệu từ nhiều nguồn khác nhau (nhập file BibTeX/CSV hoặc kết nối API Crossref, OpenAlex, PubMed).
* Sử dụng mã định danh số **DOI (Digital Object Identifier)** làm khóa chính (Primary Key) để tự động đối chiếu, loại bỏ các bài báo trùng lặp khi gom về hệ thống chung.

### 2.2 Gán nhãn/Phân loại (Auto-Labeling & Classification)
* **Tận dụng Metadata có sẵn:** Hệ thống gọi API bổ trợ từ OpenAlex hoặc Semantic Scholar để lấy trường `concepts` hoặc `fields of study` đã được phân loại sẵn.
* **Fallback (Xử lý nội bộ):** Với các bài báo thiếu nhãn, hệ thống áp dụng kỹ thuật NLP quét qua trường **Title + Abstract** để tự động gán nhãn chủ đề, trích xuất thực thể (Từ khóa chính) và phân loại *Tính chất nghiên cứu*.

---

## 3. Xây dựng Chức năng Insight thông qua Thống kê

Cốt lõi của chức năng Insight là áp dụng các phương pháp **xác suất thống kê mô tả (Descriptive Statistics)** dựa trên việc đếm tần suất xuất hiện của các đặc trưng trên trục thời gian để tìm ra "Top Trends".

Hệ thống tính toán và hiển thị cho người dùng 3 nhóm Insight chính:

### 3.1 Insight về Tiêu điểm Chủ đề & Từ khóa (Top Topics & Keywords)
* **Cơ chế:** Đếm tổng số bài báo ($N$) xuất hiện theo từng nhóm *Chủ đề* hoặc *Từ khóa chính* trong một bộ lọc thời gian xác định (Ví dụ: Năm 2025).
* **Hiển thị trực quan:**
    * **Bảng xếp hạng (Top Chart):** Biểu đồ cột (Bar Chart) hiển thị Top 5 hoặc Top 10 chủ đề nhiều bài viết nhất. (Ví dụ: *"Dược phẩm: 150 bài, Y tế công cộng: 80 bài -> Tiêu điểm thời gian này là Dược phẩm"*).
    * **Đám mây từ khóa (Word Cloud):** Trực quan hóa các từ khóa chính, từ khóa nào có tần suất xuất hiện càng lớn thì kích thước chữ trên giao diện càng to.

### 3.2 Insight về Động lực Xu hướng Mới nổi (Trending & Emerging Topics)
* **Cơ chế:** Hệ thống không chỉ tính tổng số lượng, mà tính toán tốc độ tăng trưởng hoặc tốc độ thay đổi biên độ giữa hai chu kỳ thời gian liên tiếp (Quý này so với Quý trước, hoặc Năm nay so với Năm trước) theo công thức:
    $$\Delta\% = rac{N_{chu\_ky\_nay} - N_{chu\_ky\_truoc}}{N_{chu\_ky\_truoc}} 	imes 100$$
* **Hiển thị trực quan:**
    * **Biểu đồ đường (Line Chart):** Thể hiện dòng dịch chuyển của các từ khóa. Một từ khóa có thể có tổng số bài ít hơn Top 1, nhưng nếu độ dốc đường biểu diễn ($\Delta\%$) tăng trưởng vượt bậc, hệ thống sẽ gắn nhãn đây là **"Xu hướng mới nổi" (Emerging Trend)**.

### 3.3 Insight về Mạng lưới và Đơn vị Dẫn đầu (Top Influencers & Affiliations)
* **Cơ chế:** Thống kê tần suất xuất hiện của các Trường đại học, Viện nghiên cứu hoặc Tác giả trong tập dữ liệu kết quả.
* **Hiển thị trực quan:** Bảng danh sách xếp hạng kèm số lượng công bố, giúp người dùng nhận diện ngay tổ chức nào đang đầu tư mạnh mẽ nhất vào hướng nghiên cứu này.

---

## 4. Tóm tắt Cơ chế Vận hành của Hệ thống

Mô hình hoạt động tổng quát của chức năng Insight được tóm tắt theo chuỗi hành vi sau:

$$	ext{Bộ lọc người dùng (Thời gian/Nguồn)} \longrightarrow 	ext{Lọc đặc trưng Metadata} \longrightarrow 	ext{Thống kê số lượng theo tần suất} \longrightarrow 	ext{Trực quan hóa Top Trends}$$

**Kết luận:** Với thiết kế này, hệ thống hoàn toàn loại bỏ sự phụ thuộc vào tệp tin PDF nặng nề, tối ưu hóa tốc độ xử lý dữ liệu lớn (Big Data) nhờ việc chỉ khai thác metadata tinh gọn, mang lại trải nghiệm phân tích xu hướng nhanh chóng và chính xác cho người dùng.