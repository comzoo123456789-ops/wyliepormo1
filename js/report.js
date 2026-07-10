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

// ---------- 주간 추이 · 전주 대비 ----------
(function trend() {
  const wrap = document.getElementById("trendWrap");
  const N = P.filter((p) => p.type === "brand").length;

  function draw(series, labels, real) {
    const max = Math.max(...series, 1);
    const prev = series[series.length - 2] || 0, cur = series[series.length - 1] || 0;
    const wow = cur - prev, pct = prev ? (wow / prev) * 100 : 0;
    const bars = series.map((v, i) => `
      <div class="trend-bar ${i === series.length - 1 ? "is-now" : ""}">
        <span class="trend-bar__v">${v}</span>
        <span class="trend-bar__t"><i style="height:${Math.round((v / max) * 100)}%"></i></span>
        <span class="trend-bar__l">${labels[i]}</span>
      </div>`).join("");
    wrap.innerHTML = `<div class="trend-wow">이번 주 <b>${cur}건</b> · 전주 대비 <b class="${wow >= 0 ? "co-up" : "co-down"}">${wow >= 0 ? "▲" : "▼"} ${Math.abs(wow)}건 (${pct.toFixed(1)}%)</b></div><div class="trend-bars">${bars}</div>`;
    const tag = document.getElementById("trendTag");
    if (tag) { tag.textContent = real ? "실데이터" : "추정"; if (real) tag.style.background = "#3f7a5e22"; }
  }

  // 데모(추정) 시리즈 — 결정적
  const mult = [0.72, 0.79, 0.83, 0.8, 0.88, 0.93, 0.97, 1.0];
  const demo = mult.map((m) => Math.round(N * m));
  const demoLabels = ["-7주", "-6주", "-5주", "-4주", "-3주", "-2주", "지난주", "이번주"];
  draw(demo, demoLabels, false);

  // 실데이터(스냅샷)로 대체 시도
  fetch("/api/snapshots").then((r) => (r.ok ? r.json() : null)).then((rows) => {
    if (Array.isArray(rows) && rows.length >= 2) {
      const last = rows.slice(-8);
      draw(last.map((x) => x.promos || 0), last.map((x) => (x.date || "").slice(5)), true);
    }
  }).catch(() => {});
})();

// ---------- 공용 ----------
function fnv(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const gLabelOf = (p) => { const g = brandGroups.find((x) => x.id === p.group); return g ? g.label : p.group; };
const gInkOf = (p) => { const g = brandGroups.find((x) => x.id === p.group); return g ? g.ink : "#888"; };

// ---------- 프로모션 캘린더 타임라인 ----------
(function calendar() {
  const wrap = document.getElementById("calWrap"), chips = document.getElementById("calChips");
  if (!wrap) return;
  const DAYS = 30, msDay = 86400000;
  const start = new Date(TODAY); start.setDate(start.getDate() - 6);
  const end = new Date(start.getTime() + DAYS * msDay);
  let cat = "all";

  chips.innerHTML = `<button class="cal-chip is-active" data-c="all">전체</button>` +
    brandGroups.map((g) => `<button class="cal-chip" data-c="${g.id}">${g.label}</button>`).join("");

  function draw() {
    let list = P.filter((p) => p.type === "brand");
    if (cat !== "all") list = list.filter((p) => p.group === cat);
    list = list.filter((p) => { const s = new Date(p.period.start), e = new Date(p.period.end); return e >= start && s <= end; });
    list.sort((a, b) => new Date(a.period.start) - new Date(b.period.start));
    list = list.slice(0, 18);

    // 날짜 눈금 (5개)
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((r) => {
      const d = new Date(start.getTime() + r * DAYS * msDay);
      return `<span class="cal-tick" style="left:${r * 100}%">${d.getMonth() + 1}/${d.getDate()}</span>`;
    }).join("");
    const todayLeft = ((TODAY - start) / msDay / DAYS) * 100;

    const rows = list.length ? list.map((p) => {
      const s = Math.max(0, (new Date(p.period.start) - start) / msDay);
      const e = Math.min(DAYS, (new Date(p.period.end) - start) / msDay + 1);
      const left = (s / DAYS) * 100, w = Math.max(2.5, ((e - s) / DAYS) * 100);
      return `<div class="cal-row"><span class="cal-lbl">${p.brand}</span><span class="cal-track"><span class="cal-bar" style="left:${left}%;width:${w}%;background:${gInkOf(p)}"><em>${p.title}</em></span></span></div>`;
    }).join("") : `<p class="rep-empty">해당 기간 프로모션이 없습니다.</p>`;

    wrap.innerHTML = `<div class="cal-scale"><span class="cal-lbl"></span><span class="cal-ticks">${ticks}<span class="cal-today" style="left:${todayLeft}%"></span></span></div>
      <div class="cal-rows" style="--today:${todayLeft}%">${rows}</div>
      <div class="cal-legend">▏ 오늘 기준 ±window · 막대 = 진행 기간</div>`;
  }
  chips.addEventListener("click", (e) => { const b = e.target.closest(".cal-chip"); if (!b) return; cat = b.dataset.c; chips.querySelectorAll(".cal-chip").forEach((x) => x.classList.toggle("is-active", x === b)); draw(); });
  draw();
})();

// ---------- 카테고리 포화도 (노출 경쟁 지수) ----------
(function saturation() {
  const wrap = document.getElementById("satWrap");
  if (!wrap) return;
  const rows = brandGroups.map((g) => ({ g, n: P.filter((p) => p.type === "brand" && p.group === g.id && !isEnded(p)).length }));
  const max = Math.max(...rows.map((r) => r.n), 1);
  rows.sort((a, b) => b.n - a.n);
  const meta = (n) => n >= 12 ? { k: "red", dot: "🔴", t: "포화", guide: "노출 경쟁이 치열합니다. 진입 시기를 조정하거나 강한 차별화 혜택이 필요합니다." }
    : n >= 7 ? { k: "amber", dot: "🟡", t: "보통", guide: "무난한 경쟁 강도. 확실한 훅(할인율·증정)이 있으면 진입 가능합니다." }
    : { k: "green", dot: "🟢", t: "여유", guide: "지금이 진입 적기입니다. 상대적으로 노출 확보가 유리합니다." };
  wrap.innerHTML = rows.map((r) => {
    const m = meta(r.n);
    return `<div class="sat-row sat-${m.k}">
      <div class="sat-top"><span class="sat-badge">${m.dot} ${m.t}</span><b>${r.g.label}</b><span class="sat-n">진행 ${r.n}건</span></div>
      <div class="sat-bar"><span style="width:${Math.round((r.n / max) * 100)}%"></span></div>
      <div class="sat-guide">${m.guide}</div>
    </div>`;
  }).join("");
})();

// ---------- 최고 효율 카피 TOP 3 (데모 CTR) ----------
(function copyTop() {
  const wrap = document.getElementById("copyWrap");
  if (!wrap) return;
  const ctr = (p) => 2 + (fnv(p.brand + p.title) % 850) / 100; // 2.00 ~ 10.50%
  const top = [...P].map((p) => ({ p, c: ctr(p) })).sort((a, b) => b.c - a.c).slice(0, 3);
  wrap.innerHTML = top.map(({ p, c }, i) => `
    <div class="copy-row">
      <span class="copy-rank">${i + 1}</span>
      <div class="copy-main"><div class="copy-title">"${p.title}"</div><div class="copy-meta">${p.brand} · ${gLabelOf(p)}</div></div>
      <span class="copy-ctr"><b>${c.toFixed(1)}%</b><span>CTR</span></span>
    </div>`).join("");
})();

// ---------- 신규 · 마감 임박 ----------
(function feeds() {
  const dleft = (end) => Math.round((new Date(end) - TODAY) / 86400000);
  const fmt = (p) => `<div class="feed-row"><b>${p.brand}</b><span>${p.title}</span></div>`;
  const news = P.filter((p) => p.posted === TODAY_STR).slice(0, 8);
  const ends = P.filter((p) => { const d = dleft(p.period.end); return d >= 0 && d <= 3; })
    .sort((a, b) => dleft(a.period.end) - dleft(b.period.end)).slice(0, 8);
  $("repNew").innerHTML = news.length ? news.map(fmt).join("") : `<p class="rep-empty">오늘 신규 없음</p>`;
  $("repEnd").innerHTML = ends.length
    ? ends.map((p) => `<div class="feed-row"><b>${p.brand}</b><span>${p.title}</span><em>D-${dleft(p.period.end)}</em></div>`).join("")
    : `<p class="rep-empty">마감 임박 없음</p>`;
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
