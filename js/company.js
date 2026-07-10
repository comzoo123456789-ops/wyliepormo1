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
  fashion: [0.40, 0.33, 0.18, 0.09], appliance: [0.14, 0.28, 0.32, 0.26],
  homedeco: [0.16, 0.34, 0.30, 0.20],
  "local-food": [0.30, 0.32, 0.24, 0.14], "local-beauty": [0.44, 0.32, 0.16, 0.08], "local-health": [0.30, 0.34, 0.24, 0.12],
};
const AGE_CTR = [0.092, 0.078, 0.061, 0.047];

function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
const rng = (s) => (hash(s) % 1000) / 1000;

const groupById = (type, gid) => (CATEGORIES[type] || { groups: [] }).groups.find((g) => g.id === gid);
const groupLabel = (type, gid) => { const g = groupById(type, gid); return g ? g.label : gid; };
const groupOf = (p) => groupById(p.type, p.group) || { tint: "#eee", ink: "#555", label: "" };

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
  const sharesArr = Object.keys(byBrand).map((b) => (byBrand[b] / totalV) * 100);
  const total = sharesArr.length;
  const rank = sharesArr.filter((s) => s > share).length + 1;
  const avgShare = total ? 100 / total : 0;

  return { visitors, ages, totalClicks, avgCtr, share, rank, total, avgShare, primGid: prim.gid, primType: prim.type };
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

  // KPI
  const fmt = (n) => n.toLocaleString();
  $("coKpis").innerHTML = [
    { n: m.share.toFixed(1) + "%", l: "카테고리 유입 점유율", s: "경쟁사 대비" },
    { n: fmt(m.visitors), l: "노출(방문자)", s: state.sub === "all" ? "전체 제품군" : state.sub },
    { n: fmt(m.totalClicks), l: "URL 클릭수", s: "프로모션 유입" },
    { n: m.avgCtr.toFixed(1) + "%", l: "평균 클릭률(CTR)", s: "클릭/방문" },
  ].map((k) => `<div class="rep-kpi"><strong>${k.n}</strong><span>${k.l}</span><small>${k.s}</small></div>`).join("");

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

  // 우리 위치 (경쟁사 식별정보 미노출)
  $("coSovDesc").textContent = `${groupLabel(m.primType, m.primGid)} 카테고리 내 우리 브랜드 위치`;
  const above = m.share >= m.avgShare;
  $("coSov").innerHTML = `
    <div class="co-pos">
      <div class="co-pos__share">${m.share.toFixed(1)}<span>%</span></div>
      <div class="co-pos__rows">
        <div><span>카테고리 내 순위</span><b>${m.rank}위 / ${m.total}개 브랜드</b></div>
        <div><span>카테고리 평균 점유율</span><b>${m.avgShare.toFixed(1)}%</b></div>
        <div><span>평가</span><b class="${above ? "co-up" : "co-down"}">${above ? "평균 이상 ▲" : "평균 이하 ▼"}</b></div>
      </div>
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

  $("coNote").textContent = "※ 유입·클릭·연령대는 데모(시뮬레이션) 지표입니다. 실제 서비스에서는 클릭 로깅과 로그인 인구통계 데이터로 산출됩니다. 유입 점유율은 집계된 조회수 기반으로 계산됩니다.";
}

// ---------- 이벤트 ----------
$("coSubs").addEventListener("click", (e) => { const c = e.target.closest(".co-chip"); if (!c) return; state.sub = c.dataset.sub; renderDash(); });

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
} else {
  state.brand = auth.brand;
  state.sub = "all";
  $("coDash").hidden = false;
  renderDash();
}
