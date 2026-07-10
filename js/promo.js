// ============================================================
// 프로모션 상세 페이지(자체) + 스크롤 깊이 수집
// ?id=<promoId> 로 프로모션을 찾아 상세를 렌더하고,
// 사용자가 25/50/75/100% 지점을 지날 때 /api/scroll 로 이벤트 전송(실측 기반).
// ============================================================
const $ = (id) => document.getElementById(id);
const LS_LIKES = "pb_likes", LS_MINE = "pb_myPromos";

function allPromos() {
  let mine = [];
  try { mine = JSON.parse(localStorage.getItem(LS_MINE) || "[]"); } catch (e) {}
  return PROMOS.concat(mine.map((p, i) => ({ ...p, id: p.id || 9000 + i })));
}
function likes() { try { return new Set(JSON.parse(localStorage.getItem(LS_LIKES) || "[]")); } catch (e) { return new Set(); } }
function groupOf(p) { const g = (CATEGORIES[p.type] || { groups: [] }).groups.find((x) => x.id === p.group); return g || { tint: "#eee", ink: "#555", label: "" }; }
function fmtP(p) { const f = (x) => { const d = new Date(x); return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`; }; return `${f(p.period.start)} ~ ${f(p.period.end)}`; }
function dday(p) { const e = new Date(p.period.end); e.setHours(0, 0, 0, 0); const t = new Date(); t.setHours(0, 0, 0, 0); const d = Math.round((e - t) / 86400000); return d < 0 ? "종료" : d === 0 ? "오늘마감" : `D-${d}`; }

const params = new URLSearchParams(location.search);
const id = Number(params.get("id"));
const P = allPromos().find((x) => x.id === id);

if (!P) {
  $("pd").innerHTML = `<div class="pd-none"><h1>프로모션을 찾을 수 없습니다</h1><a href="index.html" class="btn btn--primary btn--lg">목록으로</a></div>`;
} else {
  render();
  initScrollTracking();
}

function render() {
  const g = groupOf(P), pt = PROMO_TYPES[P.promoType] || { label: "", color: "#888" };
  const liked = likes().has(P.id);
  const ext = P.link && P.link !== "#";
  const initial = (P.brand || "?").trim().charAt(0);
  const media = P.image
    ? `<img src="${P.image}" alt="${P.brand}" onerror="this.style.display='none'">`
    : `<span class="pd-mono">${initial}</span>`;
  const disc = P.discount ? `<span class="pd-badge pd-badge--disc">${P.discount}% OFF</span>` : "";
  const code = P.code ? `<button class="pd-code" id="pdCode">🎟 <b>${P.code}</b> 복사</button>` : "";

  // 같은 브랜드/카테고리 다른 프로모션
  const related = allPromos().filter((x) => x.id !== P.id && (x.brand === P.brand || x.group === P.group)).slice(0, 4);
  const relHTML = related.length ? related.map((x) => `<a class="pd-rel" href="promo.html?id=${x.id}"><b>${x.brand}</b><span>${x.title}</span></a>`).join("") : "";

  $("pd").innerHTML = `
    <a href="index.html" class="pd-back">← 프로모션 목록</a>
    <div class="pd-media" style="--tint:${g.tint};--tink:${g.ink}">
      ${media}
      <span class="pd-badge" style="background:${pt.color}">${pt.label}</span>
      <span class="pd-dday">${dday(P)}</span>
      ${disc}
    </div>

    <div class="pd-eyebrow">${iconSVG(g.icon, 15)} ${g.label} · ${P.sub}</div>
    <h1 class="pd-title">${P.title}</h1>
    <div class="pd-brand"><span class="pd-avatar" style="background:${g.ink}">${initial}</span>${P.brand}</div>

    <div class="pd-actions">
      ${ext ? `<a class="btn btn--primary btn--lg" href="${P.link}" target="_blank" rel="noopener noreferrer" id="pdGo">공식 페이지로 이동 →</a>` : ""}
      <button class="btn btn--outline btn--lg" id="pdLike">${liked ? "♥ 찜함" : "♡ 찜하기"}</button>
      <button class="btn btn--soft btn--lg" id="pdShare">🔗 공유</button>
      ${code}
    </div>

    <div class="pd-info">
      <div><span>진행 기간</span><b>${fmtP(P)}</b></div>
      <div><span>혜택 유형</span><b>${pt.label}</b></div>
      ${P.discount ? `<div><span>할인율</span><b>${P.discount}%</b></div>` : ""}
      ${P.code ? `<div><span>쿠폰코드</span><b>${P.code}</b></div>` : ""}
    </div>

    <section class="pd-sec">
      <h2>프로모션 소개</h2>
      <p>${P.desc}</p>
    </section>

    <section class="pd-sec">
      <h2>이런 혜택이 있어요</h2>
      <ul class="pd-benefits">
        <li>${pt.label} 프로모션 — ${P.title}</li>
        ${P.discount ? `<li>최대 <b>${P.discount}%</b> 할인 적용</li>` : ""}
        ${P.code ? `<li>쿠폰코드 <b>${P.code}</b> 사용 시 추가 혜택</li>` : ""}
        <li>진행 기간: ${fmtP(P)} (${dday(P)})</li>
        <li>자세한 조건은 아래 공식 페이지에서 확인하세요.</li>
      </ul>
    </section>

    <section class="pd-sec">
      <h2>유의사항</h2>
      <p class="pd-note">본 정보는 프로모보드가 집계한 것으로, 실제 혜택·기간·조건은 브랜드 사정에 따라 변경될 수 있습니다. 정확한 내용은 공식 페이지를 확인해 주세요.</p>
    </section>

    ${relHTML ? `<section class="pd-sec"><h2>이 브랜드/카테고리의 다른 프로모션</h2><div class="pd-rels">${relHTML}</div></section>` : ""}

    ${ext ? `<div class="pd-cta"><a class="btn btn--primary btn--lg" href="${P.link}" target="_blank" rel="noopener noreferrer">공식 페이지에서 자세히 보기 →</a></div>` : ""}
  `;

  // 액션 이벤트
  const likeBtn = $("pdLike");
  if (likeBtn) likeBtn.addEventListener("click", () => {
    const s = likes(); if (s.has(P.id)) s.delete(P.id); else s.add(P.id);
    try { localStorage.setItem(LS_LIKES, JSON.stringify([...s])); } catch (e) {}
    likeBtn.textContent = s.has(P.id) ? "♥ 찜함" : "♡ 찜하기";
  });
  const shareBtn = $("pdShare");
  if (shareBtn) shareBtn.addEventListener("click", async () => {
    const url = location.href;
    try { await navigator.clipboard.writeText(url); shareBtn.textContent = "✓ 링크 복사됨"; setTimeout(() => (shareBtn.textContent = "🔗 공유"), 1500); }
    catch (e) { shareBtn.textContent = "복사 실패"; }
  });
  const codeBtn = $("pdCode");
  if (codeBtn) codeBtn.addEventListener("click", async () => {
    try { await navigator.clipboard.writeText(P.code); codeBtn.innerHTML = "✓ 복사됨"; setTimeout(() => (codeBtn.innerHTML = `🎟 <b>${P.code}</b> 복사`), 1500); } catch (e) {}
  });
}

// ---------- 스크롤 깊이 수집 ----------
function initScrollTracking() {
  const bar = $("readProgress");
  const sent = {};
  function onScroll() {
    const h = document.documentElement;
    const max = h.scrollHeight - h.clientHeight;
    const pct = max > 0 ? Math.min(100, (h.scrollTop / max) * 100) : 100;
    if (bar) bar.style.width = pct + "%";
    [25, 50, 75, 100].forEach((d) => {
      if (pct >= d && !sent[d]) {
        sent[d] = 1;
        try { fetch("/api/scroll", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: P.id, depth: d }), keepalive: true }); } catch (e) {}
      }
    });
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}
