# projects

Trang danh mục dự án của byherk, đăng bằng GitHub Pages. Trang tĩnh, không cần build.

## Cấu trúc

```
index.html            Khung trang
apps.json             Danh sách dự án (chỉ sửa file này khi thêm dự án)
assets/css/tokens.css Token Dạ Quỳnh, chép từ repo interactive-learning-garden
assets/css/style.css  Kiểu trang, chỉ dùng token
assets/js/app.js      Đọc apps.json, vẽ thẻ, tìm kiếm, lọc danh mục
assets/icons.svg      Icon Phosphor (MIT), mỗi icon một <symbol>
.nojekyll             Báo GitHub Pages không chạy Jekyll
```

## Thêm dự án

Thêm một mục vào `apps.json`:

```json
{
  "id": "ten-khong-dau",
  "title": "Tên dự án",
  "description": "Một câu mô tả.",
  "category": "Tài chính",
  "icon": "wallet",
  "featured": false,
  "url": "https://..."
}
```

- `url` rỗng: thẻ hiện "Coming soon", không bấm được.
- `featured: true`: thẻ nằm ở mục "Selected projects".
- `icon`: tên một `<symbol>` trong `assets/icons.svg`. Cần icon mới thì tải bản regular từ phosphoricons.com rồi thêm `<symbol>` cùng dạng.

## Chạy thử trên máy

Trang đọc `apps.json` bằng `fetch`, nên phải mở qua máy chủ tĩnh (mở thẳng file sẽ không thấy dự án):

```
npx serve .
```

## Đăng lên GitHub Pages

Settings → Pages → Source: Deploy from a branch → `main` / `(root)`.
