# Hạ tầng truy xuất thông tin cho AI: ghi chú nghiên cứu

Website tĩnh (HTML, CSS, JavaScript thuần) tổng hợp 5 chủ đề: vector và vector database, thuật toán tìm kiếm vector (HNSW, IVF, PQ), quản lý bộ nhớ của AI, chiến lược chunking, và phân tích tổng hợp thông tin (hybrid search, reranking). Có 4 demo tương tác: độ tương đồng vector, IVF với nprobe, chunking, RRF.

Chạy ở máy: mở `index.html` bằng trình duyệt. Không cần cài đặt hay build, không tải gì từ mạng.

Đưa lên GitHub Pages: tạo repository, đẩy toàn bộ thư mục này lên nhánh `main`, vào Settings, chọn Pages, chọn nguồn là nhánh `main` và thư mục gốc (`/ (root)`), rồi lưu. Sau ít phút trang xuất hiện ở `https://<tên-tài-khoản>.github.io/<tên-repository>/`.

Cấu trúc: `index.html`, `css/style.css`, `js/main.js` (điều hướng), `js/demos.js` (các demo).
