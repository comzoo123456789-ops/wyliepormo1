// ============================================================
// 기업 인텔리전스 센터 — 브랜드별 대시보드
// ⚠️ 유입/클릭/연령대 지표는 "데모(시뮬레이션)" 입니다.
//    결정적(deterministic) 계산이라 값이 항상 동일하며,
//    실제 서비스에서는 애널리틱스(클릭 로깅)+로그인 인구통계로 대체됩니다.
// ============================================================
const $ = (id) => document.getElementById(id);

// 연령대 가중치(카테고리별 성향) + 기본 클릭률
const AGE_LABELS = ["20대", "30대", "40대", "50대"];
const AGE_W = {
  health: [0.10, 0.20, 0.30, 0.40], beauty: [0.42, 0.33, 0.18, 0.07],
  tech: [0.30, 0.34, 0.24, 0.12], food: [0.22, 0.30, 0.28, 0.20],
  fashion: [0.40, 0.33, 0.18, 0.09], sports: [0.36, 0.34, 0.20, 0.10],
  appliance: [0.14, 0.28, 0.32, 0.26],
  homedeco: [0.16, 0.34, 0.30, 0.20],
  "local-food": [0.30, 0.32, 0.24, 0.14], "local-beauty": [0.44, 0.32, 0.16, 0.08], "local-health": [0.30, 0.34, 0.24, 0.12],
};
const AGE_CTR = [0.092, 0.078, 0.061, 0.047];

function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const rng = (s) => (hash(s) % 1000) / 1000;

const groupById = (type, gid) => (CATEGORIES[type] || { groups: [] }).groups.find((g) => g.id === gid);
const groupLabel = (type, gid) => { const g = groupById(type, gid); return g ? g.label : gid; };
const groupOf = (p) => groupById(p.type, p.group) || { tint: "#eee", ink: "#555", label: "" };

// 공용 헬퍼
const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const mode = (a) => { const m = {}; a.forEach((x) => (m[x] = (m[x] || 0) + 1)); const e = Object.entries(m).sort((x, y) => y[1] - x[1])[0]; return e ? e[0] : null; };
const tl = (k) => (PROMO_TYPES[k] || {}).label || k;
const TODAY0 = new Date(); TODAY0.setHours(0, 0, 0, 0);
const isEnded = (p) => { const e = new Date(p.period.end); e.setHours(0, 0, 0, 0); return e < TODAY0; };
const dLeft = (end) => Math.round((new Date(end) - TODAY0) / 86400000);

// 브랜드 목록
const BRANDS = [...new Set(PROMOS.map((p) => p.brand))].sort((a, b) => a.localeCompare(b, "ko"));
const brandPromos = (b) => PROMOS.filter((p) => p.brand === b);
const brandPrimary = (b) => { const p = brandPromos(b)[0]; return { type: p.type, gid: p.group }; };
function brandSubs(b) {
  // 브랜드가 속한 그룹들의 세부 카테고리(제품군) 합집합
  const set = new Set();
  brandPromos(b).forEach((p) => { const g = groupById(p.type, p.group); (g ? g.sub : []).forEach((s) => set.add(s)); });
  return [...set];
}

const state = { brand: null, sub: "all" };

// ---------- 요일·시간대 피크타임 (데모) ----------
const PEAK_DAYS = ["월", "화", "수", "목", "금", "토", "일"];
const PEAK_BUCKETS = [["오전", "9–12시"], ["점심", "12–14시"], ["오후", "14–18시"], ["저녁", "18–22시"], ["심야", "22–2시"]];
// 요일×시간대 강도 행렬 + 피크 (데모, 결정적)
function peakMatrix(brand) {
  let peak = { v: -1, d: 0, b: 0 };
  const m = [];
  for (let d = 0; d < 7; d++) {
    const row = [];
    for (let b = 0; b < 5; b++) {
      let v = 28 + (hash(brand + "_" + d + "_" + b) % 60);
      if (b === 3) v += 26;          // 저녁 가중
      if (b === 1) v += 10;          // 점심
      if (d >= 5 && b === 3) v += 14; // 주말 저녁
      if (b === 4) v -= 18;          // 심야 저조
      v = Math.max(6, Math.min(100, v));
      row.push(v);
      if (v > peak.v) peak = { v, d, b };
    }
    m.push(row);
  }
  return { m, peak };
}
function renderPeak(brand) {
  const el = document.getElementById("coPeak");
  if (!el) return;
  const { m, peak } = peakMatrix(brand);
  const cells = PEAK_BUCKETS.map((bk, b) => {
    const row = PEAK_DAYS.map((_, d) => {
      const v = m[d][b], a = (0.08 + (v / 100) * 0.85).toFixed(2);
      const on = d === peak.d && b === peak.b;
      return `<span class="peak-cell ${on ? "is-peak" : ""}" style="background:rgba(181,86,59,${a})" title="${PEAK_DAYS[d]} ${bk[1]}"></span>`;
    }).join("");
    return `<div class="peak-brow"><span class="peak-bl">${bk[0]}</span>${row}</div>`;
  }).join("");
  const head = `<div class="peak-brow"><span class="peak-bl"></span>${PEAK_DAYS.map((d) => `<span class="peak-d">${d}</span>`).join("")}</div>`;
  el.innerHTML = `
    <div class="peak-grid">${head}${cells}</div>
    <div class="peak-rec">📣 가장 유입이 몰리는 시간은 <b>${PEAK_DAYS[peak.d]}요일 ${PEAK_BUCKETS[peak.b][0]}(${PEAK_BUCKETS[peak.b][1]})</b>입니다. 이 시간대에 <b>카카오톡 푸시·광고 집행</b>을 추천합니다.</div>`;
}

// ---------- 지표 계산 (데모) ----------
function metrics(brand, sub) {
  const prim = brandPrimary(brand);
  const factor = sub === "all" ? 1 : 0.55 + rng(brand + sub) * 0.8; // 제품군별 편차
  const visitors = Math.round((6000 + (hash(brand) % 14000)) * factor);

  const w = AGE_W[prim.gid] || [0.3, 0.3, 0.25, 0.15];
  const ages = w.map((wi, i) => {
    const v = Math.round(visitors * wi);
    const ctr = AGE_CTR[i] * (0.8 + rng(brand + sub + i) * 0.6);
    const clicks = Math.round(v * ctr);
    return { label: AGE_LABELS[i], visitors: v, clicks, ctr: v ? (clicks / v) * 100 : 0 };
  });
  const totalClicks = ages.reduce((a, x) => a + x.clicks, 0);
  const avgCtr = visitors ? (totalClicks / visitors) * 100 : 0;

  // 경쟁사 대비 유입 점유율(SoV) — 같은 카테고리 내 조회수 기반
  const catPromos = PROMOS.filter((p) => p.type === prim.type && p.group === prim.gid);
  const byBrand = {};
  catPromos.forEach((p) => (byBrand[p.brand] = (byBrand[p.brand] || 0) + (p.views || 0)));
  const totalV = Object.values(byBrand).reduce((a, b) => a + b, 0) || 1;
  const mine = byBrand[brand] || 0;
  const share = (mine / totalV) * 100;
  // 경쟁사 "식별정보"는 노출하지 않음 — 우리 위치만(순위·평균 대비)
  const posFrom = (map, mineViews) => {
    const tv = Object.values(map).reduce((a, b) => a + b, 0) || 1;
    const sh = (mineViews / tv) * 100;
    const arr = Object.keys(map).map((k) => (map[k] / tv) * 100);
    return { share: sh, rank: arr.filter((s) => s > sh).length + 1, total: arr.length, avgShare: arr.length ? 100 / arr.length : 0 };
  };
  const cat = posFrom(byBrand, byBrand[brand] || 0);

  // 전체 카테고리 기준 위치 (모든 프로모션 대상)
  const allByBrand = {};
  PROMOS.forEach((p) => (allByBrand[p.brand] = (allByBrand[p.brand] || 0) + (p.views || 0)));
  const overall = posFrom(allByBrand, allByBrand[brand] || 0);

  return { visitors, ages, totalClicks, avgCtr, share: cat.share, cat, overall, primGid: prim.gid, primType: prim.type };
}

// ---------- 렌더 ----------
function renderDash() {
  const b = state.brand;
  const g = groupOf(brandPromos(b)[0]);
  $("coAvatar").textContent = b.trim().charAt(0);
  $("coAvatar").style.background = g.ink;
  $("coName").textContent = b;
  const grpNames = [...new Set(brandPromos(b).map((p) => groupLabel(p.type, p.group)))];
  $("coGroups").textContent = "참여 카테고리: " + grpNames.join(", ");

  // 제품군 필터
  const subs = brandSubs(b);
  $("coSubs").innerHTML =
    `<button class="co-chip ${state.sub === "all" ? "is-active" : ""}" data-sub="all">전체</button>` +
    subs.map((s) => `<button class="co-chip ${state.sub === s ? "is-active" : ""}" data-sub="${s}">${s}</button>`).join("");

  const m = metrics(b, state.sub);

  // KPI (전주 대비 ▲▼ — 데모, 결정적)
  const fmt = (n) => n.toLocaleString();
  const wow = (key) => -9 + (hash(b + state.sub + key) % 29); // -9 ~ +19%
  $("coKpis").innerHTML = [
    { n: m.share.toFixed(1) + "%", l: "카테고리 유입 점유율", s: "경쟁사 대비", k: "share" },
    { n: fmt(m.visitors), l: "노출(방문자)", s: state.sub === "all" ? "전체 제품군" : state.sub, k: "visit" },
    { n: fmt(m.totalClicks), l: "URL 클릭수", s: "프로모션 유입", k: "click" },
    { n: m.avgCtr.toFixed(1) + "%", l: "평균 클릭률(CTR)", s: "클릭/방문", k: "ctr" },
  ].map((x) => {
    const d = wow(x.k), up = d >= 0;
    return `<div class="rep-kpi"><strong>${x.n}</strong><span class="co-delta ${up ? "co-up" : "co-down"}">${up ? "▲" : "▼"} ${Math.abs(d)}% <em>전주</em></span><span>${x.l}</span><small>${x.s}</small></div>`;
  }).join("");

  // 연령대 표
  const maxV = Math.max(...m.ages.map((a) => a.visitors), 1);
  $("coAge").innerHTML =
    `<thead><tr><th>연령대</th><th>방문자</th><th>URL 클릭</th><th>클릭률</th><th></th></tr></thead><tbody>` +
    m.ages.map((a) => `<tr>
      <th class="co-age__g">${a.label}</th>
      <td>${a.visitors.toLocaleString()}명</td>
      <td>${a.clicks.toLocaleString()}회</td>
      <td><b>${a.ctr.toFixed(1)}%</b></td>
      <td class="co-age__bar"><span style="width:${Math.round((a.visitors / maxV) * 100)}%;background:${g.ink}"></span></td>
    </tr>`).join("") + `</tbody>`;

  // 우리 위치 (경쟁사 식별정보 미노출) — 카테고리 기준 + 전체 기준
  $("coSovDesc").textContent = "경쟁사 식별정보 없이, 우리 브랜드의 상대적 위치만 표시";
  const posBlock = (title, x) => {
    const above = x.share >= x.avgShare;
    return `<div class="co-pos-col">
      <div class="co-pos-col__h">${title}</div>
      <div class="co-pos">
        <div class="co-pos__share">${x.share.toFixed(1)}<span>%</span></div>
        <div class="co-pos__rows">
          <div><span>순위</span><b>${x.rank}위 / ${x.total}개</b></div>
          <div><span>평균 점유율</span><b>${x.avgShare.toFixed(1)}%</b></div>
          <div><span>평가</span><b class="${above ? "co-up" : "co-down"}">${above ? "평균 이상 ▲" : "평균 이하 ▼"}</b></div>
        </div>
      </div>
    </div>`;
  };
  $("coSov").innerHTML = `<div class="co-pos-grid">
    ${posBlock(`${groupLabel(m.primType, m.primGid)} 카테고리 기준`, m.cat)}
    ${posBlock("전체 카테고리 기준", m.overall)}
  </div>`;

  // 내 프로모션 목록 (제품군 필터 적용)
  let mine = brandPromos(b);
  if (state.sub !== "all") mine = mine.filter((p) => p.sub === state.sub);
  $("coPromoDesc").textContent = `${mine.length}건`;
  $("coPromos").innerHTML = mine.length
    ? mine.map((p) => `<div class="co-promo">
        <span class="co-promo__type" style="background:${(PROMO_TYPES[p.promoType] || {}).color}">${(PROMO_TYPES[p.promoType] || {}).label}</span>
        <div class="co-promo__body"><b>${p.title}</b><span>${groupLabel(p.type, p.group)} · ${p.sub} · ${p.period.start}~${p.period.end}</span></div>
      </div>`).join("")
    : `<p class="rep-empty">해당 제품군 프로모션이 없습니다.</p>`;

  renderBrief(b, m);
  renderBench(b, m);
  renderTodo(b, m);

  $("coNote").textContent = "※ 유입·클릭·연령대·전주대비·CTR은 데모(시뮬레이션) 지표입니다. 벤치마크 진단·To-Do(마감·포화도)는 집계된 프로모션 데이터 기반의 실계산입니다.";
}

// ---------- 오늘의 브리핑 (한 줄 요약) ----------
function renderBrief(brand, m) {
  const el = $("coBrief");
  if (!el) return;
  const pk = peakMatrix(brand).peak;
  const soon = brandPromos(brand).filter((p) => { const d = dLeft(p.period.end); return d >= 0 && d <= 3; }).length;
  const above = m.cat.share >= m.cat.avgShare;
  el.innerHTML =
    `<span class="co-brief__dot"></span>오늘의 브리핑 · ` +
    `<b>SoV ${m.cat.share.toFixed(1)}%</b> <span class="${above ? "co-up" : "co-down"}">${above ? "평균 이상" : "평균 이하"}</span> · ` +
    `마감 임박 <b>${soon}건</b> · ` +
    `추천 푸시 <b>${PEAK_DAYS[pk.d]}요일 ${PEAK_BUCKETS[pk.b][0]}</b>`;
}

// ---------- 경쟁 벤치마크 진단 (카테고리 평균 대비) ----------
function renderBench(brand, m) {
  const el = $("coBench");
  if (!el) return;
  const prim = brandPrimary(brand);
  const cat = PROMOS.filter((p) => p.type === prim.type && p.group === prim.gid);
  const mineP = cat.filter((p) => p.brand === brand);
  const rows = [];

  // 할인율
  const catD = cat.filter((p) => p.discount).map((p) => p.discount);
  const myD = mineP.filter((p) => p.discount).map((p) => p.discount);
  if (myD.length && catD.length) {
    const ma = Math.round(avg(myD)), ca = Math.round(avg(catD)), up = ma >= ca;
    rows.push({ ok: up, t: `할인율 ${ma}% <small>(카테고리 평균 ${ca}%)</small>`,
      s: up ? "평균보다 강한 가격 혜택 — 가격 경쟁력이 우위입니다." : "평균보다 약합니다 — 할인 폭 확대나 증정 결합을 검토하세요." });
  }
  // 주력 방식(유형)
  const catType = mode(cat.map((p) => p.promoType)), myType = mode(mineP.map((p) => p.promoType));
  if (catType && myType) {
    const same = catType === myType;
    rows.push({ ok: same, t: `주력 방식 ${tl(myType)} <small>(카테고리 주력 ${tl(catType)})</small>`,
      s: same ? "시장 흐름과 같은 방식으로 경쟁하고 있습니다." : `카테고리는 ${tl(catType)} 중심입니다 — 혜택 방식 다변화를 검토하세요.` });
  }
  // 진행 물량
  const brands = new Set(cat.map((p) => p.brand)).size || 1;
  const avgCnt = cat.length / brands, myCnt = mineP.length, upC = myCnt >= avgCnt;
  rows.push({ ok: upC, t: `진행 물량 ${myCnt}건 <small>(브랜드당 평균 ${avgCnt.toFixed(1)}건)</small>`,
    s: upC ? "평균 이상으로 노출 물량을 확보하고 있습니다." : "노출 물량이 평균 이하 — 프로모션 수를 늘리면 SoV 개선에 유리합니다." });
  // 노출 점유율(SoV)
  const upS = m.cat.share >= m.cat.avgShare;
  rows.push({ ok: upS, t: `노출 점유율 ${m.cat.share.toFixed(1)}% <small>(평균 ${m.cat.avgShare.toFixed(1)}%)</small>`,
    s: upS ? "카테고리 평균 이상으로 노출되고 있습니다." : "노출이 평균 이하 — 카피·타이밍 최적화로 조회수를 끌어올리세요." });

  el.innerHTML = rows.map((r) =>
    `<div class="co-bench ${r.ok ? "is-ok" : "is-warn"}"><span class="co-bench__ic">${r.ok ? "✅" : "⚠️"}</span><div class="co-bench__body"><b>${r.t}</b><span>${r.s}</span></div></div>`).join("");
}

// ---------- 이번 주 액션 To-Do ----------
function renderTodo(brand, m) {
  const el = $("coTodo");
  if (!el) return;
  const todos = [];
  // 1) 마감 임박 내 프로모션
  brandPromos(brand).forEach((p) => { const d = dLeft(p.period.end); if (d >= 0 && d <= 3) todos.push(`⏰ '<b>${p.title}</b>' D-${d} — 마감 전 재노출·리마인드 발송`); });
  // 2) 내 참여 카테고리 중 여유(포화도 낮음) 진입 적기
  [...new Set(brandPromos(brand).map((p) => p.group))].forEach((gid) => {
    const n = PROMOS.filter((p) => p.type === "brand" && p.group === gid && !isEnded(p)).length;
    if (n < 7) todos.push(`🟢 <b>${groupLabel("brand", gid)}</b> 카테고리 여유(진행 ${n}건) — 지금이 노출 확보 적기`);
  });
  // 3) SoV 열위면 개선 권장
  if (m.cat.share < m.cat.avgShare) todos.push(`📉 노출 점유율이 평균 이하 — 대표 프로모션 카피·이미지 교체 A/B 검토`);
  // 4) 피크타임 푸시 예약
  const pk = peakMatrix(brand).peak;
  todos.push(`📣 <b>${PEAK_DAYS[pk.d]}요일 ${PEAK_BUCKETS[pk.b][0]}(${PEAK_BUCKETS[pk.b][1]})</b>에 카카오톡 푸시·광고 집행 예약`);

  el.innerHTML = todos.slice(0, 6).map((t, i) =>
    `<label class="co-todo"><input type="checkbox" /><span class="co-todo__box"></span><span class="co-todo__txt">${t}</span></label>`).join("")
    || `<p class="rep-empty">지금 급한 액션이 없습니다.</p>`;
}

// ---------- 이벤트 ----------
$("coSubs").addEventListener("click", (e) => { const c = e.target.closest(".co-chip"); if (!c) return; state.sub = c.dataset.sub; renderDash(); });

// 탭 전환
const coTabs = $("coTabs");
if (coTabs) coTabs.addEventListener("click", (e) => {
  const b = e.target.closest(".rtab"); if (!b) return;
  const t = b.dataset.tab;
  coTabs.querySelectorAll(".rtab").forEach((x) => x.classList.toggle("is-active", x === b));
  document.querySelectorAll("#coDash .rtab-panel").forEach((pn) => { pn.hidden = pn.dataset.panel !== t; });
});

// PDF 내보내기
const coPdf = $("coPdf");
if (coPdf) coPdf.addEventListener("click", () => window.print());

// ---------- 인증: 로그인한 사업자 브랜드만 ----------
const auth = window.AUTH && window.AUTH.get();
if (!auth || auth.role !== "business" || !auth.brand) {
  // (auth.js 가드가 리다이렉트하지만 이중 안전장치)
  location.href = "login.html";
} else if (!BRANDS.includes(auth.brand)) {
  // 로그인 브랜드가 아직 등록 프로모션이 없는 경우
  $("coDash").hidden = false;
  $("coAvatar").textContent = auth.brand.trim().charAt(0);
  $("coName").textContent = auth.brand;
  $("coGroups").textContent = "아직 집계된 프로모션이 없습니다.";
  $("coKpis").innerHTML = "";
  $("coPromos").innerHTML = '<p class="rep-empty">이 브랜드로 등록된 프로모션이 아직 없어 인텔리전스가 없습니다. 프로모션을 등록하면 생성됩니다.</p>';
  $("coNote").textContent = "";
  if (window.renderLiveDash) window.renderLiveDash($("coLive"), auth.brand);
  renderPeak(auth.brand);
} else {
  state.brand = auth.brand;
  state.sub = "all";
  $("coDash").hidden = false;
  renderDash();
  if (window.renderLiveDash) window.renderLiveDash($("coLive"), auth.brand);
  renderPeak(auth.brand);
}
