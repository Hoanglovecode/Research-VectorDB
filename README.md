# 🧠 Hạ Tầng Truy Xuất Thông Tin Cho AI: Ghi Chú Nghiên Cứu

[![Live Demo](https://img.shields.io/badge/Demo-Vercel-black?style=for-the-badge&logo=vercel)](https://vectordb-iota.vercel.app)
[![Tech Stack](https://img.shields.io/badge/Stack-Vanilla%20HTML%2FCSS%2FJS-orange?style=for-the-badge)](https://developer.mozilla.org/en-US/docs/Web)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](LICENSE)

> Website tổng hợp tài liệu nghiên cứu chuyên sâu về hạ tầng truy xuất thông tin (Information Retrieval) phục vụ các hệ thống AI & RAG (Retrieval-Augmented Generation). Tích hợp các sơ đồ kiến trúc động và các bản demo mô phỏng tương tác trực quan.

🔗 **Trải nghiệm trực tiếp:** [https://vectordb-iota.vercel.app](https://vectordb-iota.vercel.app)  
*(Dự phòng: [https://vectordb-hoanglovecodes-projects.vercel.app](https://vectordb-hoanglovecodes-projects.vercel.app))*

---

## 📌 Nội Dung Nghiên Cứu Chính

Dự án gồm **5 chuyên đề cốt lõi** theo chuẩn luồng dữ liệu từ xử lý tài liệu thô đến khi mô hình ngôn ngữ (LLM) tổng hợp câu trả lời:

1. **Vector & Vector Database**
   - Khái niệm Vector & vai trò trong AI/ML.
   - Quá trình biến đổi dữ liệu thành Vector thông qua Embedding.
   - So sánh Vector Database với cơ sở dữ liệu quan hệ truyền thống (RDBMS).
   - Chi tiết các phép đo độ tương đồng: *Cosine Similarity*, *Dot Product*, *Euclidean Distance*.

2. **Vector Database Search Algorithms**
   - Phân loại: Flat/Exact Search vs. Approximate Nearest Neighbor (ANN).
   - Cơ chế hoạt động của các thuật toán chỉ mục hàng đầu: **HNSW** (Hierarchical Navigable Small World), **IVF** (Inverted File Index) và **PQ** (Product Quantization).
   - Đánh giá sự đánh đổi (Trade-offs) giữa *Recall*, *Latency (độ trễ)* và *Memory (bộ nhớ)*.

3. **AI Memory Management**
   - Bản chất của AI Memory và cách mô hình quản lý ngữ cảnh.
   - Phân biệt *Short-term Memory* và *Long-term Memory*.
   - So sánh 3 khái niệm: *Context Window*, *Conversation History* và *Memory*.
   - Cơ chế lưu trữ, truy xuất (Read), cập nhật (Update) và nén bộ nhớ.

4. **Chunking Strategies**
   - Lý do cần phân đoạn (Chunking) tài liệu trong RAG.
   - Các phương pháp chunking phổ biến: *Fixed-size*, *Recursive Character*, *Document Structure-based*, *Semantic Chunking*.
   - Tối ưu hóa kích thước đoạn (*Chunk Size*) và độ gối đầu (*Chunk Overlap*).
   - Tác động của chunking tới độ chính xác của khâu Retrieval.

5. **Information Analysis & Synthesis**
   - Phương pháp phân tích và trích xuất thông tin thực thể, quan hệ.
   - So sánh đối chiếu *Keyword Search (BM25)* và *Semantic Search (Dense Vector)*.
   - Kỹ thuật **Hybrid Search** kết hợp thuật toán xếp hạng hợp nhất **RRF** (*Reciprocal Rank Fusion*) và **Reranking** (Cross-Encoder).
   - Xử lý các thách thức thực tế: thông tin trùng lặp, mâu thuẫn dữ liệu hoặc thiếu hụt ngữ cảnh.

---

## 🎮 Các Demo Tương Tác & Tính Năng Trực Quan

Không chỉ là tài liệu lý thuyết, trang web cung cấp các công cụ mô phỏng trực tiếp bằng JavaScript thuần:

- 🧭 **Demo 1: Đo độ tương đồng Vector** – Kéo thả đầu mút 2 vector 2D trên đồ thị và quan sát sự thay đổi tức thì của Dot Product, Cosine Similarity, khoảng cách Euclidean và góc $\theta$.
- 🗂️ **Demo 2: Mô phỏng thuật toán IVF** – Trực quan hóa các tâm cụm (Centroids), vùng Voronoi và tác động của tham số `nprobe` đến vùng tìm kiếm và thời gian truy vấn.
- ✂️ **Demo 3: Thử nghiệm Chunking & Overlap** – Nhập văn bản tùy ý và quan sát cách thuật toán cắt nhỏ văn bản kèm dải overlap được đánh dấu trực quan.
- ⚖️ **Demo 4: Hybrid Search & RRF Calculator** – Mô phỏng việc trộn kết quả tìm kiếm từ 2 luồng Keyword và Vector qua công thức Reciprocal Rank Fusion.
- 📝 **Mini Quiz / Trắc nghiệm ôn tập** – Bộ câu hỏi kiểm tra nhanh kiến thức từng chuyên đề kèm giải thích chi tiết.

---

## 📂 Cấu Trúc Thư Mục

```text
Vector-research/
├── index.html            # Trang tài liệu chính và giao diện tương tác
├── css/
│   └── style.css         # Thiết kế responsive, dark/light mode, typography
├── js/
│   ├── main.js           # Xử lý điều hướng, mục lục, thanh tiến trình đọc
│   ├── demos.js          # Logic các demo tương tác (Vector visualizer, RRF, Chunking)
│   ├── sim.js            # Mô phỏng thuật toán không gian vector và chỉ mục
│   ├── quiz.js           # Trình điều khiển hệ thống câu hỏi trắc nghiệm
│   └── quiz-data.js      # Dữ liệu ngân hàng câu hỏi & đáp án
└── README.md             # Tài liệu dự án
```

---

## 🚀 Hướng Dẫn Sử Dụng & Triển Khai

### 1. Xem trực tiếp trên máy (Local)
Dự án được xây dựng với phương châm **zero dependencies** (không cần cài Node.js, npm hay bất kỳ thư viện ngoài nào):
- Chỉ cần mở trực tiếp file `index.html` bằng bất kỳ trình duyệt nào (Chrome, Edge, Firefox, Safari).

### 2. Triển khai lên Vercel
Dự án đã được cấu hình tối ưu để triển khai tức thì trên Vercel:
```bash
# Sử dụng Vercel CLI
npx vercel --prod
```
> **Lưu ý cấu hình Vercel**: Nếu repo chứa thư mục con `Vector-research`, hãy đặt **Root Directory** trong phần *Project Settings* là `Vector-research`.

### 3. Triển khai lên GitHub Pages
1. Push toàn bộ mã nguồn lên nhánh `main` của repository GitHub.
2. Vào **Settings** &rarr; **Pages**.
3. Tại phần **Source**, chọn `Deploy from a branch`, chọn nhánh `main` và thư mục `/ (root)`.
4. Bấm **Save**, website sẽ được kích hoạt tại `https://<tên-user>.github.io/<tên-repo>/`.

---

## 👤 Tác Giả & Bản Quyền

- **Tác giả:** Lê Văn Hoàng (Math) - *Hoanglovecode*
- **Đơn vị:** Sinh viên ngành AI & Data Engineering, Trường Đại học Bách Khoa
- **Mục đích:** Nghiên cứu & tổng hợp tài liệu GDSC (Google Developer Student Clubs)
- **Giấy phép:** [MIT License](LICENSE)
