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

// ---------- 핵심 인사이트 (자동 분석) ----------
(function insights() {
  const label = (id) => (brandGroups.find((g) => g.id === id) || {}).label || id;
  const count = (pred) => P.filter(pred).length;

  // 카테고리별 건수
  const catCount = {};
  P.filter((p) => p.type === "brand").forEach((p) => (catCount[p.group] = (catCount[p.group] || 0) + 1));
  const topCat = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0];

  // 유형별 건수
  const typeCount = {};
  P.forEach((p) => (typeCount[p.promoType] = (typeCount[p.promoType] || 0) + 1));
  const topType = Object.entries(typeCount).sort((a, b) => b[1] - a[1])[0];
  const typeLabel = (k) => (PROMO_TYPES[k] || {}).label || k;

  // 평균/최고 할인율
  const discs = P.filter((p) => p.discount).map((p) => p.discount);
  const avgDisc = discs.length ? Math.round(discs.reduce((a, b) => a + b, 0) / discs.length) : 0;
  const catDisc = {};
  P.forEach((p) => { if (p.discount) (catDisc[p.group] = catDisc[p.group] || []).push(p.discount); });
  const catDiscAvg = Object.entries(catDisc).map(([g, arr]) => [g, Math.round(arr.reduce((a, b) => a + b, 0) / arr.length)]).sort((a, b) => b[1] - a[1])[0];

  const todayNew = count((p) => p.posted === TODAY_STR);
  const endingSoon = count((p) => { const d = Math.round((new Date(p.period.end) - TODAY) / 86400000); return d >= 0 && d <= 3; });
  const couponCnt = count((p) => p.code);

  const items = [];
  if (topCat) items.push(`지금 가장 활발한 카테고리는 <b>${label(topCat[0])}</b> — 진행 프로모션 <b>${topCat[1]}건</b>으로 최다입니다.`);
  if (topType) items.push(`가장 많이 쓰이는 혜택 방식은 <b>${typeLabel(topType[0])}</b>(${topType[1]}건). 브랜드들이 이 방식으로 경쟁하고 있습니다.`);
  if (avgDisc) items.push(`할인형 프로모션의 <b>평균 할인율은 ${avgDisc}%</b>${catDiscAvg ? `, 그중 <b>${label(catDiscAvg[0])}</b>가 평균 ${catDiscAvg[1]}%로 가장 공격적입니다.` : "."}`);
  items.push(`이번 주 <b>신규 ${todayNew}건</b>이 등록됐고, <b>마감 임박(D-3 이내) ${endingSoon}건</b>이 진행 중 — 지금이 노출 경쟁이 치열한 구간입니다.`);
  if (couponCnt) items.push(`쿠폰 코드를 제공하는 프로모션이 <b>${couponCnt}건</b> — 전환 유도형 혜택이 활성화돼 있습니다.`);

  document.getElementById("repInsight").innerHTML = items.map((t) => `<li>${t}</li>`).join("");
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
