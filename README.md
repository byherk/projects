# Góc công cụ nhỏ của HerK

Đây là nơi mình gom lại những công cụ nhỏ tự làm, phục vụ mấy việc lặt vặt hằng ngày như ghi thu chi, tạo hóa đơn, tóm tắt tài liệu, học từ vựng, tạo mã QR chuyển khoản...

**Vào xem tại: https://byherk.github.io/projects**

## Có gì trong này?

Các công cụ được chia theo nhóm cho dễ tìm:

- **Tài chính**: sổ thu chi gia đình, tạo hóa đơn, tính lãi suất kép, tạo mã VietQR
- **Soạn thảo**: tóm tắt tài liệu dài, lấy chữ từ ảnh chụp, đếm từ trong bài viết
- **Học tập**: thẻ ghi nhớ từ vựng, đọc sách EPUB
- **Năng suất**: đồng hồ tập trung, bảng theo dõi thói quen
- **Tiện ích**: ghi âm nhật ký, nén ảnh

Công cụ nào ghi "Coming soon" là mình đang làm, chưa dùng được.

## Dùng thế nào?

Bạn chỉ cần mở trang, chọn công cụ rồi dùng luôn. Không phải cài gì, không cần tạo tài khoản. Muốn tìm nhanh thì gõ vào ô tìm kiếm hoặc bấm chọn nhóm.

Mình làm phần lớn công cụ để chạy ngay trên trình duyệt của bạn, nên những thứ như số liệu thu chi hay ghi âm được giữ lại trên máy bạn, không gửi đi đâu cả.

## Góp ý

Bạn thấy công cụ nào lỗi hoặc muốn có thêm công cụ nào thì cứ [mở một Issue](https://github.com/byherk/projects/issues) để báo mình nhé.

<details>
<summary>Dành cho người muốn xem phần kỹ thuật</summary>

Trang chỉ dùng HTML, CSS và JS thuần, không cần build.

- Danh sách công cụ nằm trong `apps.json`. Muốn thêm công cụ mới thì sửa file này.
- Để trống `url` thì thẻ hiện "Coming soon". Đặt `featured: true` thì công cụ nằm ở mục nổi bật.
- Icon lấy từ [Phosphor Icons](https://phosphoricons.com) và nằm trong `assets/icons.svg`.
- Chạy thử trên máy: `npx serve .` (không mở thẳng file `index.html` được).
- Deploy: Settings → Pages → Deploy from a branch → `main` / `(root)`.

</details>
