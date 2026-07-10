// ============================================================
// 프로모션 인텔리전스 리포트 — 데이터 기반 자동 생성
// ============================================================
const $ = (id) => document.getElementById(id);
const P = PROMOS.slice();
// 사용자가 등록한 프로모션도 포함
try {
  const mine = JSON.parse(localStorage.getItem("pb_myPromos") || "[]");
  mine.forEach((m, i) => P.push({ ...m, id: m.id || 9000 + i, views: m.views || 15, likes: m.likes || 3 }));
} catch (e) {}

const TODAY = new Date(); TODAY.setHours(0, 0, 0, 0);
const TODAY_STR = TODAY.toISOString().slice(0, 10);
const isEnded = (p) => { const e = new Date(p.period.end); e.setHours(0, 0, 0, 0); return e < TODAY; };
const brandGroups = CATEGORIES.brand.groups;

// ---------- KPI ----------
(function kpis() {
  const ongoing = P.filter((p) => !isEnded(p));
  const brands = new Set(P.map((p) => p.brand)).size;
  const withDisc = P.filter((p) => p.discount);
  const avgDisc = withDisc.length ? Math.round(withDisc.reduce((s, p) => s + p.discount, 0) / withDisc.length) : 0;
  const todayNew = P.filter((p) => p.posted === TODAY_STR).length;
  const todayEnd = P.filter((p) => p.period.end === TODAY_STR).length;
  const items = [
    { n: P.length, l: "전체 프로모션" },
    { n: ongoing.length, l: "진행 중" },
    { n: brands, l: "참여 브랜드" },
    { n: avgDisc + "%", l: "평균 할인율" },
    { n: todayNew, l: "오늘 신규 등록" },
    { n: todayEnd, l: "오늘 마감" },
  ];
  $("repKpis").innerHTML = items.map((k) => `<div class="rep-kpi"><strong>${k.n}</strong><span>${k.l}</span></div>`).join("");
  $("repAsOf").textContent = `기준일 ${TODAY_STR} · 집계 프로모션 ${P.length}건 · 참여 브랜드 ${brands}곳`;
})();

// ---------- 막대 헬퍼 ----------
function barRow(label, value, max, color, suffix) {
  const pct = max ? Math.round((value / max) * 100) : 0;
  return `<div class="bar">
    <span class="bar__label">${label}</span>
    <span class="bar__track"><span class="bar__fill" style="width:${pct}%;background:${color}"></span></span>
    <span class="bar__val">${value}${suffix || ""}</span>
  </div>`;
}

// ---------- 카테고리별 프로모션 수 ----------
(function chartCat() {
  const rows = brandGroups.map((g) => ({ g, n: P.filter((p) => p.type === "brand" && p.group === g.id).length }));
  const max = Math.max(...rows.map((r) => r.n), 1);
  $("chartCat").innerHTML = rows.sort((a, b) => b.n - a.n)
    .map((r) => barRow(`${r.g.label}`, r.n, max, r.g.ink, "건")).join("");
})();

// ---------- 유형 분포 ----------
(function chartType() {
  const rows = Object.entries(PROMO_TYPES).map(([k, t]) => ({ t, n: P.filter((p) => p.promoType === k).length }));
  const max = Math.max(...rows.map((r) => r.n), 1);
  $("chartType").innerHTML = rows.sort((a, b) => b.n - a.n)
    .map((r) => barRow(r.t.label, r.n, max, r.t.color, "건")).join("");
})();

// ---------- 카테고리별 평균 할인율 ----------
(function chartDisc() {
  const rows = brandGroups.map((g) => {
    const ds = P.filter((p) => p.group === g.id && p.discount).map((p) => p.discount);
    const avg = ds.length ? Math.round(ds.reduce((a, b) => a + b, 0) / ds.length) : 0;
    return { g, avg };
  }).filter((r) => r.avg > 0);
  const max = Math.max(...rows.map((r) => r.avg), 1);
  $("chartDisc").innerHTML = rows.sort((a, b) => b.avg - a.avg)
    .map((r) => barRow(r.g.label, r.avg, max, "var(--accent)", "%")).join("") || `<p class="rep-empty">할인율 데이터가 없습니다.</p>`;
})();

// ---------- 인기 브랜드 TOP 10 ----------
(function chartBrand() {
  const map = {};
  P.forEach((p) => { map[p.brand] = (map[p.brand] || 0) + (p.views || 0); });
  const rows = Object.entries(map).map(([brand, v]) => ({ brand, v })).sort((a, b) => b.v - a.v).slice(0, 10);
  const max = Math.max(...rows.map((r) => r.v), 1);
  $("chartBrand").innerHTML = rows.map((r, i) =>
    `<div class="rankrow">
      <span class="rankrow__no ${i < 3 ? "is-top" : ""}">${i + 1}</span>
      <span class="rankrow__name">${r.brand}</span>
      <span class="rankrow__bar"><span style="width:${Math.round((r.v / max) * 100)}%"></span></span>
      <span class="rankrow__val">${r.v.toLocaleString()}</span>
    </div>`).join("");
})();

// ---------- 카테고리 × 유형 매트릭스 ----------
(function chartMatrix() {
  const types = Object.entries(PROMO_TYPES);
  let max = 1;
  const grid = brandGroups.map((g) => types.map(([k]) => {
    const n = P.filter((p) => p.type === "brand" && p.group === g.id && p.promoType === k).length;
    if (n > max) max = n;
    return n;
  }));
  let html = `<thead><tr><th></th>${types.map(([, t]) => `<th>${t.label}</th>`).join("")}<th>합계</th></tr></thead><tbody>`;
  brandGroups.forEach((g, gi) => {
    const rowSum = grid[gi].reduce((a, b) => a + b, 0);
    html += `<tr><th class="matrix__row">${g.label}</th>` +
      grid[gi].map((n) => {
        const a = n ? 0.12 + (n / max) * 0.6 : 0;
        return `<td style="background:rgba(181,86,59,${a.toFixed(2)});${n ? "color:var(--ink);font-weight:700" : "color:var(--faint)"}">${n || "·"}</td>`;
      }).join("") +
      `<td class="matrix__sum">${rowSum}</td></tr>`;
  });
  html += "</tbody>";
  $("chartMatrix").innerHTML = html;
})();
