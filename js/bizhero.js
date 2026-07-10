// ============================================================
// 광고주(기업회원) 히어로 인텔리전스 패널 — <>로 넘기는 3개 패널
//  1) 실시간 대시보드(livedash)  2) 이번 주 키워드 순위(워드클라우드)  3) 인기 프로모션 순위
// ============================================================
window.renderBizHero = function (el, brand) {
  if (!el) return;

  const STOP = new Set(["프로모션", "이벤트", "진행", "브랜드", "공식", "고객", "구매", "혜택", "다양한", "최대", "기념", "안내", "제공", "포함", "기준", "대한", "위한", "제품", "상품", "전용", "시리즈", "라인업", "라인", "여러분", "지금", "바로", "모든", "각종"]);

  function keywords() {
    const w = {};
    PROMOS.forEach((p) => {
      const weight = 1 + (p.views || 0) / 800;
      (p.title + " " + p.desc).split(/[^가-힣A-Za-z0-9%]+/).forEach((tok) => {
        tok = tok.trim();
        if (tok.length < 2 || /^\d+%?$/.test(tok) || STOP.has(tok)) return;
        w[tok] = (w[tok] || 0) + weight;
      });
    });
    return Object.entries(w).sort((a, b) => b[1] - a[1]).slice(0, 22);
  }

  function keywordsHTML() {
    const kw = keywords();
    if (!kw.length) return "<p class='bh-empty'>키워드가 없습니다.</p>";
    const max = kw[0][1], min = kw[kw.length - 1][1], rng = (max - min) || 1;
    const cloud = kw.map(([t, v]) => {
      const sz = (0.85 + ((v - min) / rng) * 1.5).toFixed(2);
      const op = (0.55 + ((v - min) / rng) * 0.45).toFixed(2);
      return `<span class="kw" style="font-size:${sz}rem;opacity:${op}">${t}</span>`;
    }).join("");
    const list = kw.slice(0, 8).map(([t, v], i) => `<div class="kwrow"><b>${i + 1}</b><span>${t}</span><em>${Math.round(v)}</em></div>`).join("");
    return `<div class="bh-sub">이번 주 프로모션에서 많이 쓰인 키워드</div>
      <div class="bh-2col"><div class="kw-cloud">${cloud}</div><div class="kw-list">${list}</div></div>`;
  }

  function gLabel(p) { const grp = CATEGORIES[p.type].groups.find((x) => x.id === p.group); return grp ? grp.label : ""; }

  function rankingsHTML() {
    const top = [...PROMOS].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 6);
    const f = top[0];
    const head = `<div class="bh-first">
      <span class="bh-first__no">🥇 현재 인기 프로모션 1위</span>
      <div class="bh-first__t">${f.title}</div>
      <div class="bh-first__b">${f.brand} · ${gLabel(f)} · 조회 ${(f.views || 0).toLocaleString()}</div>
    </div>`;
    const rest = top.slice(1).map((p, i) => `<div class="kwrow"><b>${i + 2}</b><span>${p.brand} — ${p.title}</span><em>${(p.views || 0).toLocaleString()}</em></div>`).join("");
    return head + `<div class="kw-list">${rest}</div>`;
  }

  const slides = [
    { label: "실시간 대시보드", mount: (c) => { c.className = "bh-slide ld ld--dark"; if (window.renderLiveDash) window.renderLiveDash(c, brand); } },
    { label: "키워드 순위", mount: (c) => { c.className = "bh-slide"; c.innerHTML = keywordsHTML(); } },
    { label: "인기 프로모션", mount: (c) => { c.className = "bh-slide"; c.innerHTML = rankingsHTML(); } },
  ];

  el.innerHTML = `
    <div class="bh">
      <div class="bh-head">
        <div class="bh-tabs" id="bhTabs">${slides.map((s, i) => `<button class="bh-tab ${i === 0 ? "is-active" : ""}" data-i="${i}">${s.label}</button>`).join("")}</div>
        <div class="bh-nav"><button class="bh-arrow" id="bhPrev" aria-label="이전">&lsaquo;</button><button class="bh-arrow" id="bhNext" aria-label="다음">&rsaquo;</button></div>
      </div>
      <div class="bh-viewport"><div class="bh-track" id="bhTrack">${slides.map(() => `<div class="bh-slide"></div>`).join("")}</div></div>
    </div>`;

  const track = el.querySelector("#bhTrack");
  const slideEls = track.querySelectorAll(".bh-slide");
  slides.forEach((s, i) => s.mount(slideEls[i]));

  let idx = 0;
  function go(i) {
    idx = (i + slides.length) % slides.length;
    track.style.transform = `translateX(-${idx * 100}%)`;
    el.querySelectorAll(".bh-tab").forEach((t, j) => t.classList.toggle("is-active", j === idx));
  }
  el.querySelector("#bhPrev").addEventListener("click", () => go(idx - 1));
  el.querySelector("#bhNext").addEventListener("click", () => go(idx + 1));
  el.querySelector("#bhTabs").addEventListener("click", (e) => { const t = e.target.closest(".bh-tab"); if (t) go(+t.dataset.i); });
};
