// 카테고리 구조 (대분류 > 중분류)
// icon: js/icons.js 의 ICONS 키
// tint: 카드 썸네일 배경(차분한 뮤트 톤), ink: 모노그램/아이콘 색

const CATEGORIES = {
  // ===== 브랜드 광고 =====
  brand: {
    label: "브랜드",
    groups: [
      { id: "health",    label: "건강",   icon: "health",    tint: "#E4EBE5", ink: "#3F6B52", sub: ["건강식품", "건강기기", "의료용품", "헬스케어"] },
      { id: "beauty",    label: "뷰티",   icon: "beauty",    tint: "#F0E6EA", ink: "#9B5C74", sub: ["스킨케어", "메이크업", "향수", "헤어/바디"] },
      { id: "tech",      label: "테크",   icon: "tech",      tint: "#E3E8F1", ink: "#3E5C8A", sub: ["스마트폰/주변기기", "노트북/PC", "웨어러블", "음향기기"] },
      { id: "food",      label: "식품",   icon: "food",      tint: "#F1EBDD", ink: "#8A6A3A", sub: ["신선식품", "가공식품", "간편식", "음료"] },
      { id: "fashion",   label: "의류",   icon: "fashion",   tint: "#EAE6E1", ink: "#6E6257", sub: ["여성의류", "남성의류", "언더웨어", "패션잡화"] },
      { id: "sports",    label: "스포츠", icon: "sports",    tint: "#E3ECEA", ink: "#2F6F63", sub: ["운동화/스니커즈", "스포츠웨어", "러닝/트레이닝", "아웃도어"] },
      { id: "appliance", label: "가전",   icon: "appliance", tint: "#E6E9EC", ink: "#4C5B66", sub: ["대형가전", "주방가전", "생활가전", "계절가전"] },
      { id: "homedeco",  label: "홈데코", icon: "homedeco",  tint: "#EEE8DE", ink: "#7A6A52", sub: ["가구", "조명", "인테리어소품", "침구"] },
    ],
  },

  // ===== 소상공인 광고 =====
  local: {
    label: "소상공인",
    groups: [
      { id: "local-food",   label: "음식", icon: "localFood",   tint: "#F1EBDD", ink: "#8A6A3A", sub: ["맛집/식당", "카페/디저트", "배달전문", "밀키트"] },
      { id: "local-beauty", label: "뷰티", icon: "localBeauty", tint: "#F0E6EA", ink: "#9B5C74", sub: ["미용실", "네일샵", "피부관리", "왁싱/눈썹"] },
      { id: "local-health", label: "헬스", icon: "localHealth", tint: "#E4EBE5", ink: "#3F6B52", sub: ["헬스장", "PT/트레이닝", "요가/필라테스", "크로스핏"] },
    ],
  },
};
