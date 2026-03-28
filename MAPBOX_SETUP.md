# Mapbox setup

## 1. Tạo token và style

1. Tạo tài khoản tại [Mapbox](https://www.mapbox.com/).
2. Vào `Access tokens` và tạo public token cho web.
3. Vào `Mapbox Studio`, tạo style mới từ `Monochrome` hoặc `Streets`.
4. Chỉnh style theo hướng retro passport:
   - giảm `road labels`, `road casing`, POI labels không cần thiết
   - giữ `water`, `park`, `landmark` rõ hơn một bậc
   - dùng palette giấy ngà, nâu trầm, xanh muted
5. Publish style và copy style URL dạng `mapbox://styles/<username>/<style_id>`.

## 2. Khai báo env local

Tạo file `.env.local` ở root project:

```bash
NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=your_public_token
NEXT_PUBLIC_MAPBOX_STYLE_URL=mapbox://styles/your-user/your-style-id
```

Nếu chưa có style riêng, app sẽ fallback sang `mapbox://styles/mapbox/streets-v12`.

## 3. Chạy app

```bash
pnpm dev
```

Mở [http://localhost:3000/minimap](http://localhost:3000/minimap).

## 4. Deploy Vercel

Thêm 2 env vars sau trong Project Settings:

- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`
- `NEXT_PUBLIC_MAPBOX_STYLE_URL`

Redeploy sau khi thêm env.

## 5. Ghi chú v1

- Dữ liệu marker hiện đang seed local trong `components/minimap/data.ts`.
- CTA `Nhận chỉ đường` hiện mở Google Maps bằng deep link.
- Nếu user từ chối geolocation, minimap vẫn hoạt động nhưng không hiển thị distance thực tế.
