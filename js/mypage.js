// ============================================================
// 마이페이지 — 메인 히어로에 표시할 인텔리전스 항목 선택
// 사업자 회원 전용. 변경 즉시 저장 + 미리보기 실시간 갱신
// ============================================================
(function () {
  const $ = (id) => document.getElementById(id);
  const auth = window.AUTH && window.AUTH.get();
  if (!auth || auth.role !== "business" || !auth.brand) { location.href = "login.html"; return; }

  const brand = auth.brand;
  $("mpWrap").hidden = false;

  // 브랜드 헤더
  $("mpName").textContent = brand;
  $("mpAvatar").textContent = brand.trim().charAt(0);
  const bp = (typeof PROMOS !== "undefined") ? PROMOS.filter((p) => p.brand === brand) : [];
  const g = bp[0] ? (CATEGORIES[bp[0].type].groups.find((x) => x.id === bp[0].group) || {}) : {};
  $("mpAvatar").style.background = g.ink || "#5a5348";

  // 체크리스트
  const enabled = new Set(window.HERO.get(brand));
  $("mpList").innerHTML = window.HERO_SLIDES.map((s) => `
    <label class="mp-item">
      <input type="checkbox" data-k="${s.key}" ${enabled.has(s.key) ? "checked" : ""} />
      <span class="mp-item__box"></span>
      <span class="mp-item__meta"><b>${s.label}</b><span>${s.desc}</span></span>
    </label>`).join("");

  const collect = () => [...$("mpList").querySelectorAll("input:checked")].map((i) => i.dataset.k);
  const preview = () => { if (window.renderBizHero) window.renderBizHero($("mpPreview"), brand); };
  const setHint = (keys) => {
    $("mpHint").textContent = keys.length ? `${keys.length}개 항목 표시 중 · 저장됨` : "표시할 항목이 없습니다 — 최소 1개를 선택하세요";
  };

  $("mpList").addEventListener("change", () => {
    const keys = collect();
    window.HERO.set(brand, keys);
    setHint(keys);
    preview();
  });

  setHint([...enabled]);
  preview();
})();
