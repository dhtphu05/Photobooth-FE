import type {
  Coordinates,
  MapPlace,
  MapViewState,
  MarkerVisualVariant,
} from "@/components/minimap/types"

function commonsFileUrl(fileName: string) {
  return `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(fileName)}`
}

export const PILOT_CENTER: Coordinates = {
  lat: 16.061351,
  lng: 108.229819,
}

export const INITIAL_MAP_VIEW: MapViewState = {
  latitude: PILOT_CENTER.lat,
  longitude: PILOT_CENTER.lng,
  zoom: 13.35,
}

export const MAPBOX_FALLBACK_STYLE = "mapbox://styles/mapbox/streets-v12"

export const MAPBOX_DEFAULT_PITCH = 22

export const PLACES: MapPlace[] = [
  {
    id: "danangbooth-dragon",
    slug: "danangbooth-dragon-bridge",
    name: "DanangBooth Cầu Rồng",
    kind: "booth",
    tier: "booth",
    clusterTheme: "landmark",
    coordinates: {
      lat: 16.06147,
      lng: 108.22791,
    },
    address: "Bờ Tây Cầu Rồng, quận Hải Châu, Đà Nẵng",
    stampCollected: true,
    passportOffer:
      "Mở hành trình từ booth trung tâm để nhận nhịp khám phá, chụp ảnh và bắt đầu sưu tầm dấu mộc quanh thành phố.",
    images: [
      commonsFileUrl("Da nang dragon bridge.jpg"),
      commonsFileUrl("Dragon Bridge Da Nang 4.jpg"),
      commonsFileUrl("Dragon Bridge Da Nang 9.jpg"),
    ],
    description:
      "Đây là điểm bắt đầu dễ nhất cho một ngày khám phá Đà Nẵng: chụp một khung ảnh, lấy cảm hứng hành trình và mở passport từ ngay bên sông Hàn.",
    detailHref: "https://en.wikipedia.org/wiki/Dragon_Bridge_(Da_Nang)",
  },
  {
    id: "da-nang-cathedral",
    slug: "da-nang-cathedral",
    name: "Nhà thờ Chính tòa Đà Nẵng",
    kind: "partner",
    tier: "premium",
    clusterTheme: "landmark",
    coordinates: {
      lat: 16.067767,
      lng: 108.223882,
    },
    address: "156 Trần Phú, Hải Châu 1, Hải Châu, Đà Nẵng",
    stampCollected: true,
    passportOffer:
      "Ghé landmark màu hồng giữa lòng thành phố để mở thêm một dấu mộc thật nhẹ, thật Đà Nẵng cho cuốn passport của bạn.",
    images: [
      commonsFileUrl("Da Nang Cathedral.jpg"),
      commonsFileUrl("Da Nang Cathedral - Da Nang, Vietnam - DSC02464.JPG"),
      commonsFileUrl("Da Nang Cathedral.jpg"),
    ],
    description:
      "Nhà thờ hồng là một trong những điểm nhận diện dễ nhớ nhất của trung tâm Đà Nẵng. Chỉ cần dừng lại một lát là đã có ngay một khung hình rất đặc trưng cho hành trình.",
    detailHref: "https://en.wikipedia.org/wiki/Da_Nang_Cathedral",
  },
  {
    id: "han-market-passport",
    slug: "han-market-passport",
    name: "Chợ Hàn",
    kind: "partner",
    tier: "basic",
    clusterTheme: "culture",
    coordinates: {
      lat: 16.0676,
      lng: 108.22354,
    },
    address: "119 Trần Phú, Hải Châu 1, Hải Châu, Đà Nẵng",
    stampCollected: true,
    passportOffer:
      "Dừng ở Chợ Hàn để gom thêm một mảnh rất đời thường của Đà Nẵng, rồi tiếp tục hành trình với đặc sản và quà mang về.",
    images: [
      commonsFileUrl("Han Market Da Nang.JPG"),
      commonsFileUrl("Streetmarket Da Nang Vietnam.jpg"),
      commonsFileUrl("Han Market outside.JPG"),
    ],
    description:
      "Nếu muốn cảm nhận nhịp địa phương rõ hơn, Chợ Hàn là nơi rất hợp để ghé. Vừa dễ mua quà, vừa dễ chạm vào một Đà Nẵng gần gũi và nhiều năng lượng.",
    detailHref: "https://traveldanang.org/place/han-market/",
  },
  {
    id: "cham-museum",
    slug: "museum-of-cham-sculpture",
    name: "Bảo tàng Điêu khắc Chăm",
    kind: "partner",
    tier: "premium",
    clusterTheme: "culture",
    coordinates: {
      lat: 16.060436,
      lng: 108.220955,
    },
    address: "Số 2, đường 2 Tháng 9, Hải Châu, Đà Nẵng",
    stampCollected: true,
    passportOffer:
      "Đổi nhịp hành trình bằng một điểm dừng giàu chiều sâu văn hóa, nơi mỗi dấu mộc mang cảm giác lưu giữ hơn là chỉ check-in.",
    images: [
      commonsFileUrl("Museum of Cham Sculpture.jpg"),
      commonsFileUrl("Le musée Cham (Da Nang) (4395751687).jpg"),
      commonsFileUrl("Museum of Cham Sculpture.jpg"),
    ],
    description:
      "Một điểm dừng dành cho lúc bạn muốn hành trình chậm lại đôi chút. Không gian bảo tàng giúp Đà Nẵng hiện lên sâu hơn, có lớp lang và nhiều câu chuyện hơn.",
    detailHref: "https://en.wikipedia.org/wiki/Museum_of_Cham_Sculpture",
  },
  {
    id: "love-lock-bridge",
    slug: "love-lock-bridge-da-nang",
    name: "Cầu Tình Yêu",
    kind: "partner",
    tier: "premium",
    clusterTheme: "landmark",
    coordinates: {
      lat: 16.063122,
      lng: 108.230759,
    },
    address: "Đường Trần Hưng Đạo, An Hải, Sơn Trà, Đà Nẵng",
    stampCollected: true,
    passportOffer:
      "Một điểm dừng rất hợp để giữ lại khung hình ven sông, nhất là khi bạn muốn passport có thêm một dấu mốc mềm mại và giàu cảm xúc.",
    images: [
      commonsFileUrl("Love Lock Bridge Da Nang 05.19.jpg"),
      commonsFileUrl("Dragon Carp, Da Nang 05.19.jpg"),
      commonsFileUrl("Love Lock Bridge Da Nang 05.19.jpg"),
    ],
    description:
      "Cầu Tình Yêu là kiểu điểm đến không cần ở lại quá lâu nhưng rất dễ nhớ. Gần sông, gần gió, gần những tấm ảnh đẹp vừa đủ để nối tiếp hành trình trung tâm.",
    detailHref: "https://danangfantasticity.com/en/discovery/love-lock-bridge-da-nang.html",
  },
  {
    id: "han-river-bridge",
    slug: "han-river-bridge",
    name: "Cầu sông Hàn",
    kind: "partner",
    tier: "basic",
    clusterTheme: "landmark",
    coordinates: {
      lat: 16.071071,
      lng: 108.225335,
    },
    address: "Cầu Sông Hàn, nối quận Hải Châu và Sơn Trà, Đà Nẵng",
    stampCollected: false,
    passportOffer:
      "Ghé cây cầu quay biểu tượng của Đà Nẵng để mở thêm một điểm ngắm thành phố rất đáng đưa vào passport hành trình.",
    images: [
      commonsFileUrl("Han River Bridge.jpg"),
      commonsFileUrl("Han River Bridge, Da Nang - original - dove.jpg"),
      commonsFileUrl("Han River Bridge, Da Nang, 20241209, Drehteller.jpeg"),
    ],
    description:
      "Nếu Cầu Rồng là điểm bùng nổ thị giác, thì Cầu sông Hàn lại là một biểu tượng nhẹ hơn nhưng rất gắn với ký ức đô thị của Đà Nẵng. Hợp để nối tuyến dạo ven sông.",
    detailHref: "https://en.wikipedia.org/wiki/Han_River_Bridge",
  },
  {
    id: "my-khe-beach",
    slug: "my-khe-beach",
    name: "Biển Mỹ Khê",
    kind: "partner",
    tier: "premium",
    clusterTheme: "beach",
    coordinates: {
      lat: 16.04357,
      lng: 108.24731,
    },
    address: "Đường Võ Nguyên Giáp, quận Sơn Trà, Đà Nẵng",
    stampCollected: true,
    passportOffer:
      "Đổi mood từ phố sang biển bằng một điểm dừng thoáng và dễ thở hơn, rất hợp để thêm một dấu mộc mang cảm giác nghỉ chân đúng lúc.",
    images: [
      commonsFileUrl("My Khe Beach Da Nang.jpg"),
      commonsFileUrl("Pictures of My Khe beach in Da Nang.jpg"),
      commonsFileUrl("My Khe Beach, Da Nang, Vietnam.jpg"),
    ],
    description:
      "Mỹ Khê là nơi hành trình trở nên mở hơn và nhẹ hơn. Đi vào buổi chiều hoặc gần hoàng hôn sẽ cho bạn một nhịp chuyển rất đẹp từ thành phố sang biển.",
    detailHref: "https://en.wikipedia.org/wiki/My_Khe_Beach",
  },
  {
    id: "linh-ung-pagoda",
    slug: "linh-ung-pagoda-son-tra",
    name: "Chùa Linh Ứng Sơn Trà",
    kind: "partner",
    tier: "premium",
    clusterTheme: "beach",
    coordinates: {
      lat: 16.099423,
      lng: 108.277034,
    },
    address: "Bãi Bụt, bán đảo Sơn Trà, quận Sơn Trà, Đà Nẵng",
    stampCollected: true,
    passportOffer:
      "Một điểm dừng hợp cho nhịp chậm hơn: ngắm thành phố từ trên cao, hít gió biển và giữ lại một dấu mộc rất yên cho passport của bạn.",
    images: [
      commonsFileUrl("Lady Buddha Da Nang.jpg"),
      commonsFileUrl("Lady Buddha Da Nang 5.jpg"),
      commonsFileUrl("Lady Buddha Da Nang 3.jpg"),
    ],
    description:
      "Linh Ứng là nơi rất hợp khi bạn muốn hành trình có thêm chiều sâu và khoảng lặng. Từ đây, Đà Nẵng hiện ra theo cách rộng hơn, cao hơn và bình yên hơn.",
    detailHref: "https://traveldanang.org/place/linh-ung-pagoda/",
  },
  {
    id: "son-tra-peninsula",
    slug: "son-tra-peninsula",
    name: "Bán đảo Sơn Trà",
    kind: "partner",
    tier: "basic",
    clusterTheme: "beach",
    coordinates: {
      lat: 16.104678,
      lng: 108.287322,
    },
    address: "Bán đảo Sơn Trà, quận Sơn Trà, Đà Nẵng",
    stampCollected: false,
    passportOffer:
      "Nếu bạn muốn một đoạn hành trình nhiều gió, nhiều xanh và thoáng hơn, Sơn Trà là điểm rất đáng để đi tiếp sau trung tâm.",
    images: [
      commonsFileUrl("Da Nang and the Son Tra Peninsula.jpg"),
      commonsFileUrl("Son Tra Peninsula.jpg"),
      commonsFileUrl("Son-Tra-Peninsula Da-Nang Vietnam Linh-Ung-Pagoda-02.jpg"),
    ],
    description:
      "Sơn Trà không phải kiểu điểm đến ghé cho nhanh. Đây là nơi để dành cho một chặng đi chậm hơn, ngắm thành phố từ xa và cảm nhận rõ sự chuyển nhịp của Đà Nẵng.",
    detailHref: "https://traveldanang.org/place/son-tra-peninsula/",
  },
  {
    id: "marble-mountains",
    slug: "marble-mountains",
    name: "Ngũ Hành Sơn",
    kind: "partner",
    tier: "premium",
    clusterTheme: "culture",
    coordinates: {
      lat: 16.003934,
      lng: 108.264338,
    },
    address: "81 Huyền Trân Công Chúa, Hòa Hải, Ngũ Hành Sơn, Đà Nẵng",
    stampCollected: true,
    passportOffer:
      "Thêm một điểm dừng có độ sâu văn hóa và không gian rất khác trung tâm, để cuốn passport của bạn không chỉ có phố và biển.",
    images: [
      commonsFileUrl("Marble Mountains, Da Nang, Vietnam - 20071217.jpg"),
      commonsFileUrl("Da Nang - Marble Mountain (15155136572).jpg"),
      commonsFileUrl("Marble Mountain Da Nang.jpg"),
    ],
    description:
      "Ngũ Hành Sơn là điểm dành cho lúc bạn muốn hành trình đi xa hơn một chút và có thêm chiều sâu trải nghiệm. Cảnh quan, hang động và không khí nơi đây tạo cảm giác rất khác phố biển thường thấy.",
    detailHref: "https://en.wikipedia.org/wiki/Marble_Mountains",
  },
]

export const CLUSTER_THEME_STYLES: Record<
  MapPlace["clusterTheme"],
  {
    label: string
    markerClassName: string
    pillClassName: string
  }
> = {
  beach: {
    label: "Nhịp biển",
    markerClassName: "bg-[#3b6d8c] text-[#f7f1df]",
    pillClassName: "bg-[#d7e6ec] text-[#244558] border-[#88a7b9]",
  },
  culture: {
    label: "Chiều sâu văn hóa",
    markerClassName: "bg-[#7b5d41] text-[#fbf5e8]",
    pillClassName: "bg-[#ece0cf] text-[#5d4229] border-[#b59474]",
  },
  cafe: {
    label: "Điểm nghỉ chân",
    markerClassName: "bg-[#8f4f3c] text-[#fff5ea]",
    pillClassName: "bg-[#f0ddd1] text-[#6d3625] border-[#b9826e]",
  },
  landmark: {
    label: "Biểu tượng thành phố",
    markerClassName: "bg-[#8b2e2e] text-[#fff1ea]",
    pillClassName: "bg-[#f3d6ca] text-[#74201d] border-[#c07c67]",
  },
}

export function getMarkerVariant(place: MapPlace): MarkerVisualVariant {
  if (place.tier === "booth") return "hero"
  if (place.tier === "premium") return "premium"
  return "standard"
}
