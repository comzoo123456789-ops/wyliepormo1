// ============================================================
// 프로모션 등록 (2단계)
//  1차: 프로모션 URL 입력 → AI가 내용을 두 번 확인해 자동 작성
//  2차: 담당자가 검토·수정 후 등록 → localStorage(pb_myPromos)
//  ※ 데모 분석기: 알려진 브랜드는 DB 매칭, 그 외는 도메인/키워드 휴리스틱.
//     실서비스에서는 서버의 Claude API가 페이지 본문을 읽어 채웁니다.
// ============================================================
const LS_MINE = "pb_myPromos";
const $ = (id) => document.getElementById(id);

const form = $("regForm");
const $group = $("fGroup"), $sub = $("fSub"), $promoType = $("fPromoType");
const $reviewRow = $("reviewRow"), $reviewNo = $("fReviewNo");
const $err = $("regErr"), $done = $("done");
const $step1 = $("step1"), $banner = $("reviewBanner");

let curType = "brand";

// ---------- 셀렉트 ----------
function fillGroups() {
  const groups = CATEGORIES[curType].groups;
  $group.innerHTML = groups.map((g) => `<option value="${g.id}">${g.label}</option>`).join("");
  fillSubs();
}
function fillSubs() {
  const g = CATEGORIES[curType].groups.find((x) => x.id === $group.value);
  $sub.innerHTML = (g ? g.sub : []).map((s) => `<option value="${s}">${s}</option>`).join("");
  toggleReview();
}
function fillPromoTypes() {
  $promoType.innerHTML = Object.entries(PROMO_TYPES).map(([k, t]) => `<option value="${k}">${t.label}</option>`).join("");
}
function toggleReview() {
  const need = $group.value === "health" || $group.value === "local-health";
  $reviewRow.hidden = !need;
  $reviewNo.required = need;
}
function setType(t) {
  curType = t;
  document.querySelectorAll('input[name="ftype"]').forEach((r) => (r.checked = r.value === t));
  document.querySelectorAll(".seg2__opt").forEach((o) => o.classList.toggle("is-active", o.querySelector("input").value === t));
  fillGroups();
}

// ---------- AI 분석 (데모) ----------
function hostOf(url) { try { return new URL(url).hostname.replace(/^www\./, ""); } catch (e) { return ""; } }
function sameHost(a, b) { const h = hostOf(a), k = hostOf(b); if (!h || !k) return false; const base = (x) => x.split(".").slice(-2).join("."); return base(h) === base(k); }

const GUESS = [
  { g: "beauty", kw: ["beauty", "cosmetic", "clio", "innisfree", "amore", "sulwhasoo", "laneige", "olive", "tamburins", "drjart", "missha", "tonymoly", "ableshop", "skin", "makeup"] },
  { g: "food", kw: ["kurly", "cjthemarket", "ottoki", "otokimall", "dak", "imdak", "chicken", "coffee", "cafe", "starbucks", "paris", "baskin", "gong-cha", "pulmuone", "hyfresh", "fresh", "mart", "food", "eat"] },
  { g: "tech", kw: ["apple", "danawa", "coupang", "compuzone", "bose", "logitech", "razer", "abko", "jbl", "sony", "gram", "tech", "digital"] },
  { g: "fashion", kw: ["musinsa", "29cm", "ssf", "lfmall", "kolon", "wconcept", "zigzag", "whoau", "spao", "topten", "goodwear", "fashion", "wear", "style", "cloth"] },
  { g: "appliance", kw: ["dyson", "coway", "winix", "balmuda", "cuckoo", "tcl", "electronics", "appliance"] },
  { g: "homedeco", kw: ["ikea", "ohou", "livart", "hanssem", "iloom", "desker", "sidiz", "furniture", "deco", "living", "home"] },
  { g: "health", kw: ["nutri", "ckd", "kgc", "gnm", "esther", "ildong", "dongwon", "gnc", "vita", "supplement", "health"] },
];
function guessGroup(url) {
  const s = (hostOf(url) + " " + url).toLowerCase();
  for (const row of GUESS) if (row.kw.some((k) => s.includes(k))) return row.g;
  return "tech";
}
function guessPromoType(url) {
  let s = url.toLowerCase();
  try { s += " " + decodeURIComponent(url).toLowerCase(); } catch (e) {}
  if (/(coupon|쿠폰)/.test(s)) return "coupon";
  if (/(gift|증정|사은|welcome)/.test(s)) return "gift";
  if (/(launch|new|신제품|출시|예약)/.test(s)) return "launch";
  if (/(limited|기간|한정)/.test(s)) return "limited";
  if (/(review|체험|서포터)/.test(s)) return "review";
  return "sale";
}
function prettyBrand(url) {
  const skip = ["m", "store", "shop", "mall", "event", "display", "front", "app"];
  const parts = hostOf(url).split(".");
  let label = parts[0];
  if (skip.includes(label) && parts[1]) label = parts[1];
  return label ? label.charAt(0).toUpperCase() + label.slice(1) : "브랜드";
}

// 분석 결과 → 초안 객체
function analyzeDraft(url) {
  const match = PROMOS.find((p) => p.link && p.link !== "#" && sameHost(p.link, url));
  if (match) {
    return { type: match.type, group: match.group, sub: match.sub, promoType: match.promoType,
      brand: match.brand, title: match.title, desc: match.desc, image: match.image || "",
      discount: match.discount || "", code: match.code || "", matched: true };
  }
  const group = guessGroup(url);
  const g = CATEGORIES.brand.groups.find((x) => x.id === group) || CATEGORIES.brand.groups[0];
  const brand = prettyBrand(url);
  return { type: "brand", group: g.id, sub: g.sub[0], promoType: guessPromoType(url),
    brand, title: `${brand} 프로모션`, desc: `${brand}에서 진행 중인 프로모션입니다. 상세 내용을 확인·수정해 주세요.`, image: "", matched: false };
}

function applyDraft(d, url) {
  setType(d.type);
  $group.value = d.group; fillSubs(); $sub.value = d.sub;
  $promoType.value = d.promoType;
  $("fBrand").value = d.brand;
  $("fTitle").value = d.title;
  $("fDesc").value = d.desc;
  $("fLink").value = url || "";
  if (d.image) $("fImage").value = d.image;
  $("fDiscount").value = d.discount || "";
  $("fCode").value = d.code || "";
  toggleReview();
}

// ---------- 단계 전환 ----------
function showStep2(fromAI) { $step1.hidden = true; $banner.hidden = !fromAI; form.hidden = false; window.scrollTo({ top: 0, behavior: "smooth" }); }
function showStep1() {
  $step1.hidden = false; form.hidden = true; $banner.hidden = true;
  $("aiProgress").hidden = true;
  document.querySelectorAll(".ai-pstep").forEach((s) => s.classList.remove("is-done", "is-active"));
  $("aiBtn").disabled = false;
}

// ---------- AI 분석 호출 (배포 시 서버 API, 로컬은 휴리스틱 폴백) ----------
async function analyze(url) {
  try {
    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) throw new Error("api");
    const d = await res.json();
    if (d.error) throw new Error(d.error);
    return d; // 서버(Claude API) 분석 결과
  } catch (e) {
    return analyzeDraft(url); // 로컬 폴백: 알려진 브랜드 매칭 / 도메인 휴리스틱
  }
}

// ---------- AI 버튼 ----------
$("aiBtn").addEventListener("click", async () => {
  const url = $("aiUrl").value.trim();
  if (!url || !/^https?:\/\//.test(url)) { $("aiUrl").focus(); $("aiUrl").placeholder = "http:// 또는 https:// 로 시작하는 주소를 입력하세요"; return; }
  $("aiBtn").disabled = true;
  $("aiProgress").hidden = false;
  const s1 = document.querySelector('.ai-pstep[data-k="1"]'), s2 = document.querySelector('.ai-pstep[data-k="2"]');
  s1.classList.add("is-active");
  setTimeout(() => { s1.classList.replace("is-active", "is-done"); s2.classList.add("is-active"); }, 800);

  // 분석 (최소 1.7초 표시 + 실제 분석 병렬)
  const [draft] = await Promise.all([analyze(url), new Promise((r) => setTimeout(r, 1700))]);
  s2.classList.replace("is-active", "is-done");
  setTimeout(() => { applyDraft(draft, url); showStep2(true); }, 400);
});
$("aiSkip").addEventListener("click", () => { setType("brand"); showStep2(false); });
$("reAnalyze").addEventListener("click", showStep1);

// ---------- 폼 이벤트 ----------
document.querySelectorAll('input[name="ftype"]').forEach((r) => r.addEventListener("change", (e) => setType(e.target.value)));
$group.addEventListener("change", fillSubs);

// ---------- 제출 ----------
form.addEventListener("submit", (e) => {
  e.preventDefault();
  $err.hidden = true;
  const val = (id) => $(id).value.trim();
  const req = ["fBrand", "fTitle", "fDesc", "fStart", "fEnd", "fManager", "fPhone", "fEmail"];
  for (const id of req) if (!val(id)) return showErr("필수 항목을 모두 입력해 주세요.");
  if (val("fEnd") < val("fStart")) return showErr("종료일이 시작일보다 빠릅니다.");
  if (!$reviewRow.hidden && !val("fReviewNo")) return showErr("건강 카테고리는 광고 심의번호가 필요합니다.");
  if (!$("fAgree").checked) return showErr("광고 준수사항 동의가 필요합니다.");

  const promo = {
    type: curType, group: $group.value, sub: $sub.value, promoType: $promoType.value,
    brand: val("fBrand"), title: val("fTitle"), desc: val("fDesc"),
    period: { start: val("fStart"), end: val("fEnd") },
    link: val("fLink") || "#", posted: new Date().toISOString().slice(0, 10),
    status: "pending", // 운영자 승인 후 노출
    _meta: { manager: val("fManager"), phone: val("fPhone"), email: val("fEmail"), bizno: val("fBizno"), reviewNo: val("fReviewNo") },
  };
  if (val("fImage")) promo.image = val("fImage");
  if (val("fDiscount")) promo.discount = Number(val("fDiscount"));
  if (val("fCode")) promo.code = val("fCode").trim();

  try {
    const list = JSON.parse(localStorage.getItem(LS_MINE) || "[]");
    promo.id = 9000 + list.length;
    list.push(promo);
    localStorage.setItem(LS_MINE, JSON.stringify(list));
  } catch (e2) { return showErr("저장 중 오류가 발생했습니다."); }

  // 서버(D1)에도 저장 시도 (배포 환경) — 실패해도 로컬 저장은 유지
  fetch("/api/promotions", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(promo),
  }).catch(() => {});

  form.hidden = true; $banner.hidden = true; $done.hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
  setTimeout(() => (location.href = "index.html"), 1600);
});
function showErr(msg) { $err.textContent = msg; $err.hidden = false; $err.scrollIntoView({ behavior: "smooth", block: "center" }); }

// ---------- 초기화 ----------
fillPromoTypes();
setType("brand");
const today = new Date(), plus = new Date(); plus.setDate(plus.getDate() + 14);
$("fStart").value = today.toISOString().slice(0, 10);
$("fEnd").value = plus.toISOString().slice(0, 10);
