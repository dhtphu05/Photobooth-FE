"use client"

import { isWeekend } from "date-fns"

import { PLACES } from "@/components/minimap/data"
import type {
  TripHeader,
  TripMapRoute,
  TripTimelineSection,
} from "@/components/minimap/types"

const TRIP_START_DATE = new Date("2026-04-10T19:30:00+07:00")

function getPlaceImage(placeId: string, fallbackImageUrl = "/frame-da-nang.png") {
  return PLACES.find((place) => place.id === placeId)?.images[0] ?? fallbackImageUrl
}

export function buildDanangTripHeader(): TripHeader {
  return {
    eyebrow: "Hành trình Đà Nẵng",
    title: "Khám phá Đà Nẵng - Thành phố của những cây cầu",
    destination: "🇻🇳 Da Nang, Vietnam",
    timelineLabel: "10 Apr, 2026 -> 12 Apr, 2026",
    statusLabel: "Bắt đầu sau 13 ngày",
    coverImageUrl: "/frame-da-nang.png",
  }
}

export function buildDanangTripSections(): TripTimelineSection[] {
  const shouldShowDragonFireNote = isWeekend(TRIP_START_DATE)

  return [
    {
      id: "arrival-night",
      chip: {
        id: "arrival-night",
        label: "Đêm 1",
        dateLabel: "10 Apr",
      },
      title: "Chào sân Đà Thành",
      summary: "Nhịp khởi động với đặc sản địa phương, dạo cầu và một điểm chill ven sông.",
      items: [
        {
          id: "arrival-dinner",
          timeLabel: "19:30",
          title: "Ăn tối đặc sản",
          description:
            "Bánh tráng cuốn thịt heo Đại Lộc. Check-in nhẹ tại quán Trần hoặc Bi Mỹ để mở mood cho chuyến đi.",
        },
        {
          id: "dragon-bridge-walk",
          timeLabel: "21:00",
          title: "Dạo Cầu Rồng & Cầu Tình Yêu",
          description:
            "Đi dọc bờ sông Hàn để lấy nhịp thành phố, chụp vài khung ven sông và bắt đầu cảm giác Đà Nẵng về đêm.",
          note: shouldShowDragonFireNote ? "Rồng phun lửa lúc 21:00." : undefined,
          suggestion: {
            id: "dragon-bridge-dinner-suggestion",
            title: "Gợi ý theo ngữ cảnh",
            description: "Bạn đang ở gần Cầu Rồng, có muốn đặt bàn tại nhà hàng ven sông không?",
            ctaLabel: "Xem nhà hàng ven sông",
          },
        },
        {
          id: "han-river-cafe",
          timeLabel: "22:00",
          title: "Chill tại cafe ven sông Hàn",
          description:
            "Wonderlust hoặc Memory Lounge là hai điểm dừng hợp lý để kết thúc đêm đầu bằng một nhịp nhẹ hơn.",
        },
      ],
    },
    {
      id: "coastal-day",
      chip: {
        id: "coastal-day",
        label: "Ngày 1",
        dateLabel: "11 Apr",
      },
      title: "Biển xanh & Nắng vàng",
      summary: "Sơn Trà, biển Mỹ Khê và Ngũ Hành Sơn ghép thành trục khám phá ven biển rất mượt trên mobile.",
      items: [
        {
          id: "breakfast-mi-quang",
          timeLabel: "08:00",
          title: "Ăn sáng Mì Quảng Ếch Bếp Trang",
          description: "Món phải thử để bắt đầu ngày đầu tiên với đúng chất Đà Nẵng.",
        },
        {
          id: "linh-ung-stop",
          timeLabel: "09:30",
          title: "Điểm dừng nổi bật",
          description: "Dừng ở Sơn Trà để lấy góc nhìn rộng ra biển và thành phố từ một landmark rất yên.",
          placeCard: {
            id: "linh-ung-place-card",
            orderLabel: "№1",
            subtitle: "Đà Nẵng",
            placeName: "Chùa Linh Ứng Bãi Bụt",
            imageUrl: getPlaceImage("linh-ung-pagoda", "/frame-da-nang-1.png"),
            tags: ["🏛️ tâm linh", "📸 view biển", "⭐ 10"],
            placeId: "linh-ung-pagoda",
            ctaLabel: "Xem trên bản đồ",
          },
        },
        {
          id: "seafood-lunch",
          timeLabel: "12:30",
          title: "Ăn trưa hải sản Bé Mặn",
          description: "Một điểm dừng quen thuộc gần biển Mỹ Khê, hợp để giữ nhịp local mà vẫn dễ demo hành trình.",
        },
        {
          id: "marble-mountains-visit",
          timeLabel: "15:30",
          title: "Khám phá Ngũ Hành Sơn",
          description: "Tham quan các hang động và đổi tiết tấu từ biển sang trải nghiệm có chiều sâu văn hóa hơn.",
          actionLabel: "Mở route ven biển",
        },
        {
          id: "my-khe-sunset",
          timeLabel: "17:30",
          title: "Tắm biển Mỹ Khê",
          description: "Tận hưởng hoàng hôn và khoảng nghỉ mở nhất của cả lịch trình.",
        },
        {
          id: "bun-cha-ca-dinner",
          timeLabel: "19:30",
          title: "Ăn tối Bún chả cá Ông Tạ",
          description: "Một đặc sản lâu đời để kết ngày đầu bằng nhịp rất địa phương.",
        },
      ],
    },
    {
      id: "highland-day",
      chip: {
        id: "highland-day",
        label: "Ngày 2",
        dateLabel: "12 Apr",
      },
      title: "Đỉnh cao Bà Na & Thư giãn",
      summary: "Một ngày vừa có điểm nhấn biểu tượng vừa có CTA showcase booking spa.",
      items: [
        {
          id: "banh-mi-breakfast",
          timeLabel: "08:00",
          title: "Ăn sáng nhanh với Bánh mì Bà Lan",
          description: "Giữ lịch trình gọn để lên Bà Nà từ sớm.",
        },
        {
          id: "golden-bridge-stop",
          timeLabel: "09:00",
          title: "Điểm dừng nổi bật",
          description: "Điểm highlight để demo place card lớn, hình ảnh hero và nhịp hành trình highland.",
          placeCard: {
            id: "golden-bridge-place-card",
            orderLabel: "№2",
            subtitle: "Đà Nẵng - Highland",
            placeName: "Cầu Vàng (Golden Bridge)",
            imageUrl: "/frame-da-nang.png",
            tags: ["🏰 kiến trúc", "☁️ mây ngàn", "⭐ 10"],
            ctaLabel: "Xem chi tiết điểm",
          },
        },
        {
          id: "french-village-buffet",
          timeLabel: "12:00",
          title: "Ăn trưa buffet tại làng Pháp",
          description: "Giữ phần giữa ngày đủ thoải mái để timeline không bị quá dày đặc.",
        },
        {
          id: "spa-booking",
          timeLabel: "16:30",
          title: "Spa & Massage trị liệu",
          description:
            "Khoảng dừng rất hợp để showcase flow booking spa bạn đang làm, sau khi quay về lại trung tâm thành phố.",
          actionLabel: "Đặt lịch thư giãn",
        },
        {
          id: "farewell-dinner",
          timeLabel: "19:30",
          title: "Tiệc chia tay",
          description: "Bê thui Cầu Mống hoặc một bữa nướng địa phương để kết chuyến gọn mà có điểm nhớ.",
        },
      ],
    },
  ]
}

export function buildDanangTripRoute(): TripMapRoute {
  return {
    id: "coastal-route",
    title: "Cụm route nổi bật",
    subtitle: "Sơn Trà -> Mỹ Khê -> Ngũ Hành Sơn",
    placeIds: ["linh-ung-pagoda", "my-khe-beach", "marble-mountains"],
  }
}
