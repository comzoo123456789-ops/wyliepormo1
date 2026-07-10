// ============================================================
// PromoBoard main.js
// 좋아요 · 빠른필터 · 정렬 · 카드 직행 · 공유(URL복사)
// (모달 없음. 카드 클릭 시 해당 프로모션 페이지로 바로 이동)
// ============================================================

// ---------- 날짜 ----------
const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);
const TODAY_STR = `${TODAY.getFullYear()}-${String(TODAY.getMonth() + 1).padStart(2, "0")}-${String(TODAY.getDate()).padStart(2, "0")}`;

const daysLeft = (endStr) => {
  const e = new Date(endStr); e.setHours(0, 0, 0, 0);
  return Math.round((e - TODAY) / 86400000);
};
function ddayInfo(p) {
  const d = daysLeft(p.period.end);
  const s = new Date(p.period.start); s.setHours(0, 0, 0, 0);
  if (TODAY < s) return { text: "예정", upcoming: true };
  if (d < 0) return { text: "종료", ended: true };
  if (d === 0) return { text: "오늘마감", urgent: true };
  return { text: `D-${d}`, urgent: d <= 3 };
}
function fmtPeriod(p) {
  const f = (x) => { const d = new Date(x); return `${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`; };
  return `${f(p.period.start)} ~ ${f(p.period.end)}`;
}

// ---------- 로컬스토리지 ----------
const LS_LIKES = "pb_likes";
const LS_MINE = "pb_myPromos";
function loadLikes() { try { return new Set(JSON.parse(localStorage.getItem(LS_LIKES) || "[]")); } catch (e) { return new Set(); } }
function saveLikes(set) { try { localStorage.setItem(LS_LIKES, JSON.stringify([...set])); } catch (e) {} }
function loadMine() { try { return JSON.parse(localStorage.getItem(LS_MINE) || "[]"); } catch (e) { return []; } }
const liked = loadLikes();

// ---------- 데이터 병합 (정적 + 서버 D1 + 로컬 등록) ----------
let ALL = [];
function buildAll(server) {
  const mine = loadMine().map((p, i) => ({
    ...p, id: p.id || 9000 + i, isMine: true,
    likes: p.likes ?? 3, views: p.views ?? 12, posted: p.posted || TODAY_STR,
  }));
  const srv = (Array.isArray(server) ? server : []).map((p) => ({
    ...p, likes: p.likes ?? 4, views: p.views ?? 18, posted: p.posted || TODAY_STR,
  }));
  const merged = PROMOS.concat(srv, mine);
  const seen = new Set();
  ALL = [];
  for (const p of merged) if (!seen.has(p.id)) { seen.add(p.id); ALL.push(p); }
}
buildAll([]);
const likeCount = (p) => (p.likes || 0) + (liked.has(p.id) ? 1 : 0);

// ---------- 상태 ----------
const state = { type: "brand", group: "all", sub: "all", promoType: "all", sort: "popular", quick: null, keyword: "" };

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const $navbar = $("navbar"), $typebar = $("typebar"), $quickbar = $("quickbar");
const $grid = $("grid"), $empty = $("empty"), $listTitle = $("listTitle"), $listCount = $("listCount");
const $segBtns = document.querySelectorAll(".segment__btn");
const $sortBtns = document.querySelectorAll(".sort__btn");
const $search = $("searchInput");
const $toast = $("toast");

// ---------- 카테고리 유틸 ----------
const groupsOf = (type) => CATEGORIES[type].groups;
const currentGroups = () => groupsOf(state.type);
const groupById = (id) => currentGroups().find((g) => g.id === id);
const groupOf = (p) => groupsOf(p.type).find((g) => g.id === p.group) || { tint: "#eee", ink: "#555", icon: "", label: "" };

// ---------- 아이콘 ----------
const heartSVG = (filled) =>
  `<svg viewBox="0 0 24 24" width="15" height="15" fill="${filled ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 1 0-7.1 7.1L12 21l8.8-8.9a5 5 0 0 0 0-6.5Z"/></svg>`;
const shareSVG =
  `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7"/><path d="M16 6l-4-4-4 4"/><path d="M12 2v13"/></svg>`;
function faviconURL(link) {
  try { return `https://www.google.com/s2/favicons?domain=${new URL(link).hostname}&sz=64`; }
  catch (e) { return ""; }
}
const isExternal = (link) => link && link !== "#";

// ============================================================
// 렌더링
// ============================================================
function renderStats() {
  const ongoing = ALL.filter((p) => !ddayInfo(p).ended);
  const brands = new Set(ALL.filter((p) => p.type === "brand").map((p) => p.brand));
  $("statTotal").textContent = ongoing.length;
  $("statBrand").textContent = brands.size;
  $("statCat").textContent = CATEGORIES.brand.groups.length + CATEGORIES.local.groups.length;
}

function renderQuickbar() {
  const cLiked = ALL.filter((p) => liked.has(p.id)).length;
  const cNew = ALL.filter((p) => p.posted === TODAY_STR).length;
  const cEnd = ALL.filter((p) => p.period.end === TODAY_STR).length;
  const item = (key, label, count) =>
    `<button class="quick ${state.quick === key ? "is-active" : ""}" data-quick="${key}"><span class="quick__label">${label}</span><span class="quick__count">${count}</span></button>`;
  $quickbar.innerHTML =
    `<button class="quick quick--heart ${state.quick === "liked" ? "is-active" : ""}" data-quick="liked">${heartSVG(state.quick === "liked")}<span class="quick__label">찜한 프로모션</span><span class="quick__count">${cLiked}</span></button>` +
    item("newToday", "🆕 오늘 등록", cNew) +
    item("endToday", "⏰ 오늘 마감", cEnd);
}

function renderNav() {
  const subList = (g) =>
    `<div class="nav__subs"><button class="subitem ${state.sub === "all" ? "is-active" : ""}" data-sub="all">전체</button>` +
    g.sub.map((s) => `<button class="subitem ${state.sub === s ? "is-active" : ""}" data-sub="${s}">${s}</button>`).join("") + `</div>`;
  let html = `<button class="nav__item ${state.group === "all" && !state.quick ? "is-active" : ""}" data-group="all"><span class="nav__label">전체</span></button>`;
  html += currentGroups().map((g) => {
    const active = state.group === g.id && !state.quick;
    return `<button class="nav__item ${active ? "is-active" : ""}" data-group="${g.id}">${iconSVG(g.icon, 18)}<span class="nav__label">${g.label}</span></button>` + (active ? subList(g) : "");
  }).join("");
  $navbar.innerHTML = html;
}

function renderTypebar() {
  $typebar.innerHTML =
    `<button class="typechip ${state.promoType === "all" ? "is-active" : ""}" data-ptype="all">전체 유형</button>` +
    Object.entries(PROMO_TYPES).map(([k, t]) =>
      `<button class="typechip ${state.promoType === k ? "is-active" : ""}" data-ptype="${k}" style="--tc:${t.color}">${t.label}</button>`).join("");
}

function computeList() {
  let list;
  if (state.quick === "liked") list = ALL.filter((p) => liked.has(p.id));
  else if (state.quick === "newToday") list = ALL.filter((p) => p.posted === TODAY_STR);
  else if (state.quick === "endToday") list = ALL.filter((p) => p.period.end === TODAY_STR);
  else {
    list = ALL.filter((p) => p.type === state.type);
    if (state.group !== "all") list = list.filter((p) => p.group === state.group);
    if (state.sub !== "all") list = list.filter((p) => p.sub === state.sub);
    if (state.promoType !== "all") list = list.filter((p) => p.promoType === state.promoType);
  }
  if (state.keyword) {
    const kw = state.keyword.toLowerCase();
    list = list.filter((p) => [p.title, p.desc, p.brand, p.sub].some((f) => (f || "").toLowerCase().includes(kw)));
  }
  const byEnding = (a, b) => { const da = daysLeft(a.period.end), db = daysLeft(b.period.end); const ea = da < 0 ? 1 : 0, eb = db < 0 ? 1 : 0; return ea !== eb ? ea - eb : da - db; };
  if (state.sort === "popular") list.sort((a, b) => b.views - a.views);
  else if (state.sort === "likes") list.sort((a, b) => likeCount(b) - likeCount(a));
  else if (state.sort === "discount") list.sort((a, b) => (b.discount || -1) - (a.discount || -1));
  else if (state.sort === "latest") list.sort((a, b) => new Date(b.posted) - new Date(a.posted));
  else list.sort(byEnding);
  return list;
}

function renderGrid() {
  const list = computeList();
  let title = "진행 중인 프로모션";
  if (state.quick === "liked") title = "찜한 프로모션";
  else if (state.quick === "newToday") title = "오늘 등록된 프로모션";
  else if (state.quick === "endToday") title = "오늘 마감하는 프로모션";
  else if (state.group !== "all") { const g = groupById(state.group); title = g ? (state.sub !== "all" ? `${g.label} · ${state.sub}` : `${g.label} 프로모션`) : title; }
  $listTitle.textContent = title;
  $listCount.textContent = `${list.length}건`;

  if (!list.length) { $grid.innerHTML = ""; $empty.hidden = false; return; }
  $empty.hidden = true;
  const ranked = state.sort === "popular" || state.sort === "likes";
  $grid.innerHTML = list.map((p, i) => cardHTML(p, ranked ? i + 1 : 0)).join("");
}

function cardHTML(p, rank) {
  const g = groupOf(p);
  const pt = PROMO_TYPES[p.promoType];
  const dd = ddayInfo(p);
  const initial = (p.brand || "?").trim().charAt(0);
  const fav = faviconURL(p.link);
  const isLiked = liked.has(p.id);
  const ext = isExternal(p.link);

  const ddClass = "card__dday" + (dd.urgent ? " is-urgent" : dd.ended ? " is-ended" : dd.upcoming ? " is-upcoming" : "");
  const img = p.image ? `<img class="card__img" src="${p.image}" alt="${p.brand} 프로모션" loading="lazy" onerror="this.style.display='none'">` : "";
  const rankBadge = rank ? `<b class="card__rank">#${rank}</b> ` : "";
  const mine = p.isMine ? `<span class="card__mine">내 등록</span>` : "";
  const discountChip = p.discount ? `<span class="card__discount">${p.discount}%<b>OFF</b></span>` : "";
  const codeRow = p.code ? `<button class="card__code" data-code aria-label="쿠폰코드 복사">🎟 <span>${p.code}</span> <b>복사</b></button>` : "";

  return `
  <a class="card ${dd.ended ? "is-ended" : ""}" href="${p.link}" data-id="${p.id}"${ext ? ' target="_blank" rel="noopener noreferrer"' : ""}>
    <div class="card__thumb" style="--tint:${g.tint};--tink:${g.ink}">
      <span class="card__watermark">${iconSVG(g.icon, 30)}</span>
      <span class="card__mono">${initial}</span>
      ${img}
      <span class="card__ptype" style="--pc:${pt.color}">${pt.label}</span>
      <span class="${ddClass}">${dd.text}</span>
      ${discountChip}
    </div>
    <div class="card__body">
      <div class="card__eyebrow">
        <span class="card__cat">${rankBadge}${iconSVG(g.icon, 14)} ${g.label} · ${p.sub} ${mine}</span>
        <button class="card__share" data-share aria-label="공유·URL 복사" title="공유·URL 복사">${shareSVG}</button>
      </div>
      <h3 class="card__title">${p.title}</h3>
      <p class="card__desc">${p.desc}</p>
      ${codeRow}
      <div class="card__period">
        <svg class="ic" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="17" rx="2.5"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/></svg>
        ${fmtPeriod(p)}
      </div>
      <div class="card__footer">
        <span class="card__avatar" style="background:${g.ink}"><b>${initial}</b>${fav ? `<img src="${fav}" alt="" loading="lazy" onerror="this.remove()">` : ""}</span>
        <span class="card__brand">${p.brand}</span>
        <button class="card__like ${isLiked ? "is-liked" : ""}" data-like aria-label="좋아요">${heartSVG(isLiked)}<span>${likeCount(p)}</span></button>
      </div>
    </div>
  </a>`;
}

// ============================================================
// 좋아요 · 공유
// ============================================================
function toggleLike(id) {
  if (liked.has(id)) liked.delete(id); else liked.add(id);
  saveLikes(liked);
  renderQuickbar();
  renderGrid();
  renderHotroll(); // 실시간 반영
}

let toastTimer;
function toast(msg) {
  $toast.textContent = msg;
  $toast.hidden = false;
  requestAnimationFrame(() => $toast.classList.add("is-show"));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $toast.classList.remove("is-show"); setTimeout(() => ($toast.hidden = true), 300); }, 1900);
}
async function clip(text) {
  if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(text);
  else { const t = document.createElement("textarea"); t.value = text; document.body.appendChild(t); t.select(); document.execCommand("copy"); t.remove(); }
}
async function copyLink(id) {
  const p = ALL.find((x) => x.id === id);
  if (!p || !isExternal(p.link)) return toast("연결된 링크가 없는 항목입니다");
  try { await clip(p.link); toast("프로모션 링크가 복사되었습니다 📋"); } catch (e) { toast("복사 실패 — 주소를 직접 확인해 주세요"); }
}
async function copyCode(id) {
  const p = ALL.find((x) => x.id === id);
  if (!p || !p.code) return;
  try { await clip(p.code); toast(`쿠폰코드 ${p.code} 복사됨 🎟`); } catch (e) { toast("복사 실패"); }
}

// ============================================================
// 이벤트 (위임)
// ============================================================
$segBtns.forEach((b) => b.addEventListener("click", () => {
  $segBtns.forEach((x) => x.classList.remove("is-active"));
  b.classList.add("is-active");
  state.type = b.dataset.type; state.group = "all"; state.sub = "all"; state.quick = null;
  renderQuickbar(); renderNav(); renderGrid();
}));
$sortBtns.forEach((b) => b.addEventListener("click", () => {
  $sortBtns.forEach((x) => x.classList.remove("is-active"));
  b.classList.add("is-active");
  state.sort = b.dataset.sort; renderGrid();
}));
$search.addEventListener("input", (e) => { state.keyword = e.target.value.trim(); renderGrid(); });

$quickbar.addEventListener("click", (e) => {
  const btn = e.target.closest(".quick"); if (!btn) return;
  const k = btn.dataset.quick;
  state.quick = state.quick === k ? null : k;
  if (state.quick) { state.group = "all"; state.sub = "all"; }
  renderQuickbar(); renderNav(); renderGrid();
});
$navbar.addEventListener("click", (e) => {
  const item = e.target.closest(".nav__item"), sub = e.target.closest(".subitem");
  if (sub) { state.sub = sub.dataset.sub; renderNav(); renderGrid(); return; }
  if (item) { state.quick = null; state.group = item.dataset.group; state.sub = "all"; renderQuickbar(); renderNav(); renderGrid(); }
});
$typebar.addEventListener("click", (e) => {
  const c = e.target.closest(".typechip"); if (!c) return;
  state.promoType = c.dataset.ptype; renderTypebar(); renderGrid();
});

// 카드: 좋아요 / 공유 / (그 외) 해당 페이지로 직행
$grid.addEventListener("click", (e) => {
  const card = e.target.closest(".card"); if (!card) return;
  const id = Number(card.dataset.id);
  if (e.target.closest(".card__like")) { e.preventDefault(); toggleLike(id); return; }
  if (e.target.closest(".card__share")) { e.preventDefault(); copyLink(id); return; }
  if (e.target.closest(".card__code")) { e.preventDefault(); copyCode(id); return; }
  // 그 외 클릭 → 링크로 이동 (외부는 새 탭, 링크 없으면 막기)
  const p = ALL.find((x) => x.id === id);
  if (!p || !isExternal(p.link)) { e.preventDefault(); toast("등록된 링크가 아직 없는 항목입니다"); return; }
  // 클릭 로깅(실제 유입 지표 기반) — 서버 없으면 조용히 무시
  try { fetch("/api/click", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }), keepalive: true }); } catch (err) {}
});

// ============================================================
// 인기 TOP 캐러셀 (드래그 + 화살표 + 실시간 반영)
// ============================================================
const $hotTrack = $("hotTrack"), $hotDots = $("hotDots"), $hotViewport = $("hotViewport");
let hotList = [], hotIndex = 0, hotTimer = null;

function computeHot() {
  return ALL.filter((p) => !ddayInfo(p).ended)
    .map((p) => ({ p, score: p.views + likeCount(p) * 30 }))
    .sort((a, b) => b.score - a.score).slice(0, 6).map((x) => x.p);
}
function hotSlideHTML(p, rank) {
  const g = groupOf(p), pt = PROMO_TYPES[p.promoType], dd = ddayInfo(p);
  const style = p.image
    ? `background-image:linear-gradient(90deg, rgba(20,18,14,.9) 30%, rgba(20,18,14,.35)), url('${p.image}')`
    : `background:linear-gradient(120deg, ${g.ink}, ${g.tint})`;
  const disc = p.discount ? `<span class="hot__disc">${p.discount}% OFF</span>` : "";
  const ext = isExternal(p.link);
  return `<a class="hotslide" ${ext ? `href="${p.link}" target="_blank" rel="noopener noreferrer"` : 'href="#" onclick="return false"'} data-id="${p.id}" style="${style}">
    <div class="hot__inner">
      <div class="hot__top"><span class="hot__rank">TOP ${rank}</span><span class="hot__cat">${iconSVG(g.icon, 13)} ${g.label} · ${p.sub}</span></div>
      <h3 class="hot__title">${p.title}</h3>
      <p class="hot__brand">${p.brand}</p>
      <div class="hot__meta">
        <span class="hot__ptype" style="background:${pt.color}">${pt.label}</span>
        ${disc}
        <span class="hot__dday ${dd.urgent ? "is-urgent" : ""}">${dd.text}</span>
        <span class="hot__likes">${heartSVG(liked.has(p.id))} ${likeCount(p)}</span>
      </div>
    </div>
  </a>`;
}
function renderHotroll() {
  hotList = computeHot();
  if (hotIndex >= hotList.length) hotIndex = 0;
  $hotTrack.innerHTML = hotList.map((p, i) => hotSlideHTML(p, i + 1)).join("");
  $hotDots.innerHTML = hotList.map((_, i) => `<button class="hotdot" data-i="${i}" aria-label="${i + 1}번 슬라이드"></button>`).join("");
  updateHot();
}
function updateHot() {
  $hotTrack.style.transform = `translateX(-${hotIndex * 100}%)`;
  [...$hotDots.children].forEach((d, i) => d.classList.toggle("is-active", i === hotIndex));
}
function hotGo(i) { if (!hotList.length) return; hotIndex = (i + hotList.length) % hotList.length; updateHot(); }
function hotAuto() { clearInterval(hotTimer); hotTimer = setInterval(() => hotGo(hotIndex + 1), 5000); }

$("hotPrev").addEventListener("click", () => { hotGo(hotIndex - 1); hotAuto(); });
$("hotNext").addEventListener("click", () => { hotGo(hotIndex + 1); hotAuto(); });
$hotDots.addEventListener("click", (e) => { const d = e.target.closest(".hotdot"); if (d) { hotGo(+d.dataset.i); hotAuto(); } });
$hotViewport.addEventListener("pointerenter", () => clearInterval(hotTimer));
$hotViewport.addEventListener("pointerleave", hotAuto);

// 드래그/스와이프
let dragX = 0, dragging = false, moved = false;
$hotViewport.addEventListener("pointerdown", (e) => { dragging = true; moved = false; dragX = e.clientX; $hotTrack.style.transition = "none"; });
window.addEventListener("pointermove", (e) => {
  if (!dragging) return;
  const dx = e.clientX - dragX;
  if (Math.abs(dx) > 6) moved = true;
  $hotTrack.style.transform = `translateX(calc(-${hotIndex * 100}% + ${dx}px))`;
});
window.addEventListener("pointerup", (e) => {
  if (!dragging) return;
  dragging = false; $hotTrack.style.transition = "";
  const dx = e.clientX - dragX;
  if (dx < -60) hotGo(hotIndex + 1); else if (dx > 60) hotGo(hotIndex - 1); else updateHot();
  hotAuto();
});
$hotTrack.addEventListener("click", (e) => { if (moved) e.preventDefault(); }, true);

// ============================================================
// 초기화
// ============================================================
renderStats();
renderQuickbar();
renderNav();
renderTypebar();
renderGrid();

// 히어로 우측: 기업회원이면 실시간 대시보드, 아니면 인기 캐러셀
const _auth = window.AUTH && window.AUTH.get();
const _biz = !!(_auth && _auth.role === "business" && _auth.brand);
if (_biz && window.renderLiveDash) {
  const hc = document.getElementById("heroCarousel"), hd = document.getElementById("heroDash");
  if (hc) hc.hidden = true;
  if (hd) { hd.hidden = false; window.renderLiveDash(hd, _auth.brand); }
  else { renderHotroll(); hotAuto(); }
} else {
  renderHotroll();
  hotAuto();
}

// 서버(D1) 프로모션 병합 — 배포 환경에서만 동작, 실패/빈값이면 정적 데이터 유지
fetch("/api/promotions")
  .then((r) => (r.ok ? r.json() : null))
  .then((rows) => {
    if (Array.isArray(rows) && rows.length) {
      buildAll(rows);
      renderStats();
      renderQuickbar();
      renderGrid();
      renderHotroll();
    }
  })
  .catch(() => {});
