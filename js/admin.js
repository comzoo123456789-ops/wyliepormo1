// ============================================================
// 운영자 페이지 — 등록된 프로모션 승인/반려/삭제
// ⚠️ 데모: 등록 데이터가 localStorage(브라우저) 기준입니다.
//    실서비스에서는 서버(D1)의 전체 등록 건을 대상으로 동작해야 합니다.
// ============================================================
const $ = (id) => document.getElementById(id);
const K = "pb_myPromos";
let filter = "all";

const load = () => { try { return JSON.parse(localStorage.getItem(K) || "[]"); } catch (e) { return []; } };
const save = (a) => localStorage.setItem(K, JSON.stringify(a));
const statusOf = (p) => p.status || "approved";
const gLabel = (p) => { const g = (CATEGORIES[p.type] || { groups: [] }).groups.find((x) => x.id === p.group); return g ? g.label : p.group; };
const ST = { pending: { t: "승인대기", c: "#A9782B" }, approved: { t: "노출중", c: "#3F7A5E" }, rejected: { t: "반려", c: "#B24A38" } };

function render() {
  const list = load();
  const counts = { all: list.length, pending: 0, approved: 0, rejected: 0 };
  list.forEach((p) => (counts[statusOf(p)] = (counts[statusOf(p)] || 0) + 1));

  const tab = (k, label) => `<button class="adm-tab ${filter === k ? "is-active" : ""}" data-f="${k}">${label} <span>${counts[k] || 0}</span></button>`;
  $("admTabs").innerHTML = tab("all", "전체") + tab("pending", "승인대기") + tab("approved", "노출중") + tab("rejected", "반려");

  const rows = list.map((p, i) => ({ p, i })).filter(({ p }) => filter === "all" || statusOf(p) === filter);
  $("admList").innerHTML = rows.length ? rows.map(({ p, i }) => {
    const s = ST[statusOf(p)] || ST.approved;
    return `<div class="adm-row">
      <div class="adm-row__main">
        <div class="adm-row__top"><span class="adm-badge" style="background:${s.c}">${s.t}</span><b>${p.brand}</b><span class="adm-cat">${gLabel(p)} · ${p.sub}</span></div>
        <div class="adm-row__title">${p.title}</div>
        <div class="adm-row__meta">${(PROMO_TYPES[p.promoType] || {}).label || ""} · ${p.period.start}~${p.period.end}${p._meta ? " · " + (p._meta.manager || "") + " " + (p._meta.email || "") : ""}</div>
      </div>
      <div class="adm-row__act">
        ${statusOf(p) !== "approved" ? `<button class="btn btn--primary adm-btn" data-act="approve" data-i="${i}">승인</button>` : ""}
        ${statusOf(p) !== "rejected" ? `<button class="btn btn--soft adm-btn" data-act="reject" data-i="${i}">반려</button>` : ""}
        <button class="btn adm-btn adm-del" data-act="delete" data-i="${i}">삭제</button>
      </div>
    </div>`;
  }).join("") : `<p class="rep-empty">해당 상태의 등록 프로모션이 없습니다. (사업자 로그인 → 프로모션 등록으로 생성)</p>`;

  $("admNote").textContent = "※ 데모: 이 브라우저에 등록된 프로모션 기준입니다. 실서비스에서는 서버(D1)의 전체 등록 건을 관리합니다.";
}

$("admTabs").addEventListener("click", (e) => { const t = e.target.closest(".adm-tab"); if (t) { filter = t.dataset.f; render(); } });
$("admList").addEventListener("click", (e) => {
  const b = e.target.closest(".adm-btn"); if (!b) return;
  const i = Number(b.dataset.i), act = b.dataset.act;
  const list = load(); if (!list[i]) return;
  if (act === "delete") { if (!confirm("이 프로모션을 삭제할까요?")) return; list.splice(i, 1); }
  else if (act === "approve") list[i].status = "approved";
  else if (act === "reject") list[i].status = "rejected";
  save(list); render();
});

render();
