# Photobooth All-in-One Route - Tóm tắt Tính Năng

**Route:** `/all-in-one`

---

## 📋 Tổng Quan

Route `/all-in-one` là một giải pháp hoàn chỉnh cho photobooth cho phép người dùng từ chụp ảnh, chọn ảnh, thêm chữ ký và tin nhắn, cho đến xem lại và hoàn tất toàn bộ quy trình trong một giao diện duy nhất. Đây là chế độ **tự phục vụ** (self-service) cho người dùng phổ thông.

---

## 🎯 Lưu Lượng Chính (Main Flow)

```
FRAME_SELECTION → CONFIG → CAPTURE → SELECTION → REVIEW → COMPLETED
```

### Chi Tiết Từng Bước:

#### **1. FRAME_SELECTION** 📸
- **Mục đích:** Người dùng chọn khung hình (frame) cho ảnh của mình
- **Tính năng:**
  - Hiển thị danh sách 14 khung hình có sẵn:
    - Đà Nẵng
    - Báo Xuân
    - Chuyến tàu
    - Quân sự
    - Lịch xanh dương, hồng, xanh, xám, đen
    - Xuân tình nguyện
    - Final 1, Cuối 1, Cuối 2, Cuối 3
  - Người dùng chọn frame và nhấn "Xác nhận"
  - **Tác dụng:** Tạo session trên server nếu chưa có

---

#### **2. CONFIG** ⏱️
- **Mục đích:** Người dùng cấu hình bộ đếm ngược (timer) trước khi chụp ảnh
- **Tính năng:**
  - Cho phép chọn thời gian đếm ngược: **5, 7, 10 giây**
  - Hiển thị preview webcam rtc
  - Người dùng chọn timer và nhấn "Tiếp tục"

---

#### **3. CAPTURE** 📷
- **Mục đích:** Chụp ảnh liên tiếp (burst mode)
- **Tính năng:**
  - **Chụp 6 ảnh**:
    - Mỗi ảnh cách nhau vài giây
    - Có đếm ngược trước mỗi lần chụp (dựa trên timer đã chọn)
    - Karaoke âm thanh (tùy chọn)
  - **Ghi hình video clip:**
    - Bắt đầu ghi video từ khi bắt đầu chụp
    - Ghi hình đến khi kết thúc (6 ảnh)
    - Video này dùng để tạo recap video sau
  - **Hiển thị preview:**
    - Từng ảnh được chụp sẽ hiển thị và xác nhận trước khi chụp ảnh tiếp theo
  - **Flip/Mirror:**
    - Ảnh từ webcam được tự động lật ngang (mirror) để hiển thị bình thường

---

#### **4. SELECTION** ✅
- **Mục đích:** Người dùng chọn 4 ảnh từ 6 ảnh vừa chụp
- **Tính năng:**
  - Hiển thị tất cả 6 ảnh
  - Cho phép chọn / bỏ chọn từng ảnh
  - **Phải chọn đúng 4 ảnh**
  - Cảnh báo nếu chọn thừa/thiếu

---

#### **5. REVIEW** 📝
- **Mục đích:** Xem lại ảnh đã chọn và thêm tin nhắn + chữ ký
- **Tính năng:**
  - **Hiển thị dải ảnh (Photo Strip):**
    - Ghép 4 ảnh đã chọn thành một hình dải
    - Tự động nén/resize phù hợp
    - Áp dụng frame đã chọn
  - **Nhập tin nhắn tùy chỉnh:**
    - Tối đa **10 từ**
    - Tin nhắn được ghi vào dải ảnh
    - Có tính năng debounce (800ms) để sinh lại dải khi người dùng thay đổi
  - **Ký tên (Signature):**
    - Cho phép người dùng vẽ chữ ký bằng touchpad/chuột
    - Chữ ký được thêm vào ảnh dải
  - **Recap Video:**
    - Tạo video montage từ 6 video clip đã ghi ngay khi sang step này
    - Video gộp: Video clips + ảnh dải + chữ ký (nếu có)
    - Định dạng: WebM

---

#### **6. COMPLETED** 🎉
- **Mục đích:** Hiển thị kết quả cuối cùng
- **Tính năng:**
  - **Hiển thị:**
    - Dải ảnh cuối cùng (4 ảnh + frame + tin nhắn + chữ ký)
    - Recap video
  - **Tải xuống:**
    - Cho phép tải dải ảnh
    - Cho phép tải video recap
    - Cho phép tạo QR code để chia sẻ
  - **Background Upload:**
    - Tự động upload phía sau:
      - 6 ảnh gốc (ORIGINAL)
      - Video recap (VIDEO)
      - Chữ ký (SIGNATURE)
    - Upload không chặn luồng chính

---

## 🔄 Các Tính Năng Chính

### **Session Management**
| Tính Năng | Chi Tiết |
|-----------|----------|
| Tạo session | Bắt đầu từ server khi người dùng xác nhận frame |
| Session ID | UUID từ server, dùng để upload và chia sẻ |
| Context Đồng bộ | Dùng BoothContext để chia sẻ trạng thái giữa các layout |

### **Media Handling**
| Tính Năng | Chi Tiết |
|-----------|----------|
| Capture ảnh | Camera input → Blob → Upload |
| Video recording | MediaRecorder API, ghi từng video clip |
| Auto mirror/flip | Ảnh từ webcam tự động lật ngang |
| Photo strip | Tổng hợp 4 ảnh chọn + frame + tin nhắn |

### **Background Tasks**
| Tác vụ | Thời điểm | Kết quả |
|--------|-----------|--------|
| Upload 6 ảnh gốc | Khi chọn ảnh xong | ORIGINAL media |
| Tạo video recap | Khi vào Review step | WebM video blob |
| Upload video | Khi video tạo xong (COMPLETED step) | VIDEO media |
| Upload chữ ký | Khi có chữ ký (COMPLETED step) | SIGNATURE media |

### **Photo Strip Composition**
- **Thành phần:**
  - 4 ảnh đã chọn xếp dọc
  - Frame nền (frame_id)
  - Tin nhắn tùy chỉnh (dưới cùng)
  - Chữ ký (nếu có)
- **Công cụ:** Hook `useStripComposer()` để tạo dải ảnh
- **Format:** HTML Canvas → PNG blob

---

## 🎨 User Interface

### **Layout Components**
1. **`FrameSelectionLayout`** - Hiển thị lưới 14 frame
2. **`CaptureLayout`** - Webcam + Countdown + Preview
3. **`ConfigLayout`** - Chọn timer (5/7/10 giây)
4. **`SelectionLayout`** - Chọn 4 từ 6 ảnh
5. **`ReviewLayout`** - Dải ảnh + Tin nhắn + Chữ ký
6. **`CompletedLayout`** - Kết quả cuối + Download

### **Responsive Design**
- Full screen (h-screen w-full)
- Mobile-friendly cảm ứng
- Hỗ trợ chuột và touchpad

---

## 🔌 API Integration

### **Endpoints Được Sử Dụng**
| Endpoint | Phương thức | Mục đích |
|----------|-----------|---------|
| `POST /sessions` | POST | Tạo session mới |
| `PUT /sessions/:id` | PUT | Cập nhật trạng thái session |
| `POST /sessions/:id/media` | POST | Upload media (ảnh/video/chữ ký) |
| `GET /sessions/:id` | GET | Lấy chi tiết session |

### **Media Types**
```typescript
type: 'ORIGINAL' | 'VIDEO' | 'SIGNATURE'
```

### **Session Data Structure**
```typescript
{
  id: string (UUID)
  type: 'PHOTOBOOTH'
  selectedFrameId: string
  customMessage: string
  signatureData: string (URI)
  rawPhotos: Blob[]
  rawVideoClips: Blob[]
  selectedPhotoIndices: number[]
}
```

---

## 🛠️ Hooks & Utilities

### **Custom Hooks**
| Hook | Mục đích |
|------|---------|
| `useBooth()` | Truy cập/cập nhật global booth context |
| `useVideoComposer()` | Tạo recap video từ clips + ảnh |
| `useStripComposer()` | Tạo photo strip từ 4 ảnh |
| `useUploadSessionMedia()` | Upload media lên server |

### **Utilities**
- **`mirrorImageBlob()`** - Lật ngang ảnh blob
- **Socket.io** - Đồng bộ thời gian thực (nếu cần)

---

## 📦 Dependencies

- **`react-webcam`** - Truy cập camera
- **`react-query`** - HTTP requests (via Orval generated)
- **`@radix-ui/*`** - UI components
- **`canvas`** / **`MediaRecorder`** - Xử lý ảnh/video

---

## 🎯 Workflow Tóm Gọn

```
User chọn Frame
    ↓
Tạo Session trên Server
    ↓
Chọn Timer (5/7/10s)
    ↓
Chụp 6 ảnh liên tiếp (có video)
    ↓
Chọn 4 ảnh tốt nhất
    ↓
(Background: Upload) ← 6 ảnh gốc
    ↓
Thêm Tin nhắn (max 10 từ)
    ↓
(Background: Tạo Video Recap)
    ↓
Vẽ Chữ ký (tuỳ chọn)
    ↓
Tạo Photo Strip (4 ảnh + frame + tin nhắn + chữ ký)
    ↓
(Background: Upload) ← Video + Chữ ký
    ↓
Xem kết quả
    ↓
Tải xuống / Chia sẻ QR
```

---

## 🔐 Notes

- Session có thể là **local** (nếu server không sẵn) hoặc **server-side** (UUID thực)
- Tất cả upload chạy ngầm, không chặn UX
- Camera yêu cầu HTTPS (hoặc localhost)
- Video được ghi định dạng WebM (H.264 compatible)
- Photo strip là PNG (giảm dung lượng so với hình gốc)
