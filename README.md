# projects

Nơi mình gom lại các dự án cá nhân, chạy trên GitHub Pages. Chỉ có HTML, CSS và JS thuần, không dùng framework, không cần build. Clone về là chạy được.

## Bên trong có gì

```
index.html             khung trang
apps.json              danh sách dự án (thêm dự án chỉ cần sửa file này)
assets/css/tokens.css  bộ token Dạ Quỳnh, lấy từ repo interactive-learning-garden
assets/css/style.css   style của trang, chỉ dùng biến từ tokens.css
assets/js/app.js       đọc apps.json rồi hiện ra các thẻ, có tìm kiếm và lọc theo danh mục
assets/icons.svg       bộ icon Phosphor (MIT), mỗi icon là một <symbol>
.nojekyll              để GitHub Pages không xử lý trang bằng Jekyll
```

## Thêm dự án mới

Mở `apps.json` và thêm một mục như sau:

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

Vài điều cần biết:

- `id` viết thường, không dấu, các từ nối bằng gạch ngang.
- Chưa có link thì để `url` trống. Thẻ sẽ hiện "Coming soon" và không bấm vào được.
- Muốn dự án nằm trong mục "Selected projects" thì đặt `featured` là `true`.
- `icon` là tên một `<symbol>` trong `assets/icons.svg`. Nếu thiếu icon, lên [phosphoricons.com](https://phosphoricons.com) tải bản Regular rồi bọc vào `<symbol>` giống mấy icon có sẵn.

## Chạy trên máy

Trang lấy dữ liệu từ `apps.json` bằng `fetch`, nên mở thẳng file `index.html` sẽ không thấy dự án nào. Cần chạy một server tĩnh:

```
npx serve .
```

## Deploy

Vào **Settings → Pages**, chọn Source là **Deploy from a branch**, rồi chọn branch `main` và thư mục `/ (root)`. Lưu lại, đợi một lát là trang lên.
