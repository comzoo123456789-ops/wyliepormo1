// ============================================================
// 히어로 표시 항목 설정 (마이페이지 ↔ 메인 히어로 공유)
// 사업자 회원이 메인 화면 <> 슬라이드에 무엇을 보일지 선택
// ============================================================
window.HERO_SLIDES = [
  { key: "live", label: "실시간 대시보드", desc: "방문·클릭 실시간 추이와 목표 게이지" },
  { key: "sov", label: "경쟁 위치 (SoV)", desc: "카테고리 내 노출 점유율·순위" },
  { key: "age", label: "고객 연령대", desc: "우리 프로모션에 반응하는 연령 분포" },
  { key: "keyword", label: "키워드 순위", desc: "프로모션 카피에 많이 쓰인 키워드" },
  { key: "ranking", label: "인기 프로모션", desc: "조회수 기준 인기 프로모션 TOP" },
];

window.HERO = {
  KEY: "pb_hero",
  all: function () { return window.HERO_SLIDES.map((s) => s.key); },
  // 저장된 선택이 없으면 전체 표시 (기본값)
  get: function (brand) {
    try {
      const m = JSON.parse(localStorage.getItem(this.KEY) || "{}");
      const v = m[brand];
      const valid = Array.isArray(v) ? v.filter((k) => this.all().includes(k)) : null;
      if (!valid) return this.all();
      // 레지스트리 순서 유지
      return this.all().filter((k) => valid.includes(k));
    } catch (e) { return this.all(); }
  },
  set: function (brand, keys) {
    let m = {};
    try { m = JSON.parse(localStorage.getItem(this.KEY) || "{}"); } catch (e) {}
    m[brand] = this.all().filter((k) => keys.includes(k));
    localStorage.setItem(this.KEY, JSON.stringify(m));
  },
};
