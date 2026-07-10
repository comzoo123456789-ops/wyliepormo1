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

  // 로그인 브랜드의 대표 카테고리
  function brandInfo() {
    const bp = PROMOS.filter((p) => p.brand === brand);
    const first = bp[0] || PROMOS[0];
    const label = (CATEGORIES[first.type].groups.find((g) => g.id === first.group) || {}).label || "";
    return { type: first.type, gid: first.group, label, bp };
  }

  // 경쟁 위치 (SoV 게이지)
  function sovHTML() {
    const info = brandInfo();
    const cat = PROMOS.filter((p) => p.type === info.type && p.group === info.gid);
    const by = {}; cat.forEach((p) => (by[p.brand] = (by[p.brand] || 0) + (p.views || 0)));
    const total = Object.values(by).reduce((a, b) => a + b, 0) || 1;
    const share = ((by[brand] || 0) / total) * 100;
    const shares = Object.values(by).map((v) => (v / total) * 100);
    const rank = shares.filter((s) => s > share).length + 1;
    const totalN = shares.length || 1;
    const avg = 100 / totalN;
    const above = share >= avg;
    const leader = Math.max(...shares, 1);
    const pct = Math.round((share / leader) * 100);
    return `<div class="bh-sub">${info.label} 카테고리 내 노출 점유율(SoV)</div>
      <div class="bh-sov">
        <div class="bh-sov__big">${share.toFixed(1)}<span>%</span></div>
        <div class="bh-gauge"><span style="width:${pct}%"></span></div>
        <div class="bh-sov__rows">
          <div><span>순위</span><b>${rank}위 / ${totalN}개</b></div>
          <div><span>평균 점유율</span><b>${avg.toFixed(1)}%</b></div>
          <div><span>평가</span><b class="${above ? "bh-up" : "bh-down"}">${above ? "평균 이상 ▲" : "평균 이하 ▼"}</b></div>
        </div>
      </div>`;
  }

  // 고객 연령대 분포 (데모 — 카테고리 성향 기반)
  const AGE_LABELS = ["20대", "30대", "40대", "50대"];
  const AGE_W = {
    health: [.10, .20, .30, .40], beauty: [.42, .33, .18, .07], tech: [.30, .34, .24, .12], food: [.22, .30, .28, .20],
    fashion: [.40, .33, .18, .09], sports: [.36, .34, .20, .10], appliance: [.14, .28, .32, .26], homedeco: [.16, .34, .30, .20],
    "local-food": [.30, .32, .24, .14], "local-beauty": [.44, .32, .16, .08], "local-health": [.30, .34, .24, .12],
  };
  function ageHTML() {
    const info = brandInfo();
    const w = AGE_W[info.gid] || [.3, .3, .25, .15];
    const max = Math.max(...w);
    const rows = w.map((wi, i) =>
      `<div class="bh-age"><span class="bh-age__l">${AGE_LABELS[i]}</span><span class="bh-age__t"><span style="width:${Math.round((wi / max) * 100)}%"></span></span><b>${Math.round(wi * 100)}%</b></div>`).join("");
    const top = AGE_LABELS[w.indexOf(max)];
    return `<div class="bh-sub">우리 프로모션에 반응하는 고객 연령대 <span class="bh-demo">데모</span></div>
      <div class="bh-ages">${rows}</div>
      <div class="bh-agerec">📊 <b>${top}</b> 비중이 가장 높습니다 — 이 연령대에 맞춘 카피·채널을 권장합니다.</div>`;
  }

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
    { label: "경쟁 위치", mount: (c) => { c.className = "bh-slide"; c.innerHTML = sovHTML(); } },
    { label: "고객 연령대", mount: (c) => { c.className = "bh-slide"; c.innerHTML = ageHTML(); } },
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
