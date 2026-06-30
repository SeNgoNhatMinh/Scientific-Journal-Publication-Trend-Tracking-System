# Biểu đồ Hoạt động (Activity Diagram)

Biểu đồ Hoạt động (Activity Diagram) dưới đây mô tả luồng kiểm soát hành vi của người dùng từ khi bắt đầu truy cập hệ thống cho đến khi hoàn thành các tác vụ cốt lõi như tìm kiếm bài báo, phân tích xu hướng hoặc quản lý thư viện.

```mermaid
stateDiagram-v2
    direction TB
    
    %% Bắt đầu
    [*] --> TruyCapHeThong
    
    %% Kiểm tra đăng nhập
    TruyCapHeThong --> KiemTraDangNhap
    
    state if_auth <<choice>>
    KiemTraDangNhap --> if_auth
    
    if_auth --> XacThucUser : Chưa đăng nhập
    XacThucUser --> Dashboard
    
    if_auth --> Dashboard : Đã đăng nhập
    
    %% Ngã rẽ các tính năng chính (Fork)
    state fork_main <<fork>>
    Dashboard --> fork_main
    
    %% Nhánh 1: Tìm kiếm
    fork_main --> NhapTuKhoaTimKiem
    NhapTuKhoaTimKiem --> GoiApiTimKiem
    GoiApiTimKiem --> HienThiDanhSachBaiBao
    HienThiDanhSachBaiBao --> XemChiTietBaiBao
    
    state if_action_paper <<choice>>
    XemChiTietBaiBao --> if_action_paper
    if_action_paper --> LuuVaoWorkspace : Chọn lưu
    LuuVaoWorkspace --> [*]
    
    if_action_paper --> SuDungAITomTat : Chọn AI
    SuDungAITomTat --> HienThiKetQuaAI
    HienThiKetQuaAI --> [*]
    
    if_action_paper --> [*] : Không thao tác thêm
    
    %% Nhánh 2: Phân tích xu hướng
    fork_main --> NhapTuKhoaXuHuong
    NhapTuKhoaXuHuong --> TinhToanTocDoTangTruong
    TinhToanTocDoTangTruong --> VeBieuDoXuHuong
    VeBieuDoXuHuong --> XemTuKhoaLienQuan
    XemTuKhoaLienQuan --> AIPhanTichDanhGia
    AIPhanTichDanhGia --> DangKyNhanThongBaoTopic
    DangKyNhanThongBaoTopic --> [*]
    
    %% Nhánh 3: Quản lý Thư viện / Workspace
    fork_main --> TruyCapWorkspace
    TruyCapWorkspace --> XemBaiBaoDaLuu
    
    state if_action_ws <<choice>>
    XemBaiBaoDaLuu --> if_action_ws
    if_action_ws --> XoaBaiBao : Chọn xóa
    XoaBaiBao --> [*]
    
    if_action_ws --> ExportDanhSach : Chọn Export
    ExportDanhSach --> [*]
    
    if_action_ws --> [*] : Không thao tác thêm
```
