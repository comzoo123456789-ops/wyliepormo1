// ============================================================
// 공용 인증 (데모 · 클라이언트 localStorage)
// ⚠️ 실제 서비스는 백엔드 + 비밀번호 해싱 + 세션이 필요합니다.
//    지금은 UX/권한 흐름 데모용으로 localStorage에 저장합니다.
// 역할(role): "user"(일반) | "business"(사업자)
// 사업자 계정은 brand(회사 브랜드)를 가지며, 그 브랜드 데이터만 봅니다.
// ============================================================
window.AUTH = (function () {
  const SKEY = "pb_auth", UKEY = "pb_users";
  const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k) || d); } catch (e) { return JSON.parse(d); } };
  return {
    users: () => read(UKEY, "[]"),
    saveUsers: (u) => localStorage.setItem(UKEY, JSON.stringify(u)),
    get: () => read(SKEY, "null"),
    set: (a) => localStorage.setItem(SKEY, JSON.stringify(a)),
    logout: () => localStorage.removeItem(SKEY),
    isBusiness: function () { const a = this.get(); return !!(a && a.role === "business"); },
  };
})();

(function initAuthUI() {
  function apply() {
    const a = window.AUTH.get();
    const role = a ? a.role : null;
    document.body.classList.toggle("is-biz", role === "business");
    document.body.classList.toggle("is-admin", role === "admin");
    document.body.classList.toggle("is-auth", !!a);

    const box = document.getElementById("authArea");
    if (box) {
      if (a) {
        const tag = role === "business" ? "🏢" : role === "admin" ? "🛡️" : "👤";
        box.innerHTML = `<span class="auth-name">${tag} ${a.name || a.userId}${a.brand ? " · " + a.brand : ""}</span><a href="#" class="header__link" id="authLogout">로그아웃</a>`;
        const lo = document.getElementById("authLogout");
        if (lo) lo.addEventListener("click", (e) => { e.preventDefault(); window.AUTH.logout(); location.href = "index.html"; });
      } else {
        box.innerHTML = `<a href="login.html" class="header__link">로그인</a><a href="signup.html" class="header__link">회원가입</a>`;
      }
    }

    // 페이지 접근 가드: <body data-require="business"> / "admin"
    const req = document.body.getAttribute("data-require");
    if (req && role !== req) {
      alert(req === "admin" ? "운영자 전용 페이지입니다." : "기업(사업자) 회원 전용 페이지입니다. 로그인해 주세요.");
      location.href = "login.html";
    }
  }
  if (document.readyState !== "loading") apply();
  else document.addEventListener("DOMContentLoaded", apply);
})();

// ============================================================
// 헤더 햄버거 메뉴 (모바일에서 nav를 드롭다운으로 최소화)
// 모든 페이지 공통 — auth.js가 헤더를 관리하므로 여기서 주입
// ============================================================
(function hamburger() {
  function build() {
    const inner = document.querySelector(".header__inner");
    const nav = document.querySelector(".header__nav");
    if (!inner || !nav || inner.querySelector(".hmenu")) return;

    const btn = document.createElement("button");
    btn.className = "hmenu";
    btn.setAttribute("aria-label", "메뉴 열기");
    btn.setAttribute("aria-expanded", "false");
    btn.innerHTML = "<span></span><span></span><span></span>";
    inner.appendChild(btn);

    const close = () => { document.body.classList.remove("nav-open"); btn.classList.remove("is-open"); btn.setAttribute("aria-expanded", "false"); };
    const toggle = () => { const open = !document.body.classList.contains("nav-open"); document.body.classList.toggle("nav-open", open); btn.classList.toggle("is-open", open); btn.setAttribute("aria-expanded", String(open)); };

    btn.addEventListener("click", (e) => { e.stopPropagation(); toggle(); });
    // 링크/버튼 누르면 닫기
    nav.addEventListener("click", (e) => { if (e.target.closest("a,button")) close(); });
    // 바깥 클릭 / ESC 로 닫기
    document.addEventListener("click", (e) => { if (document.body.classList.contains("nav-open") && !nav.contains(e.target) && e.target !== btn) close(); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
  }
  if (document.readyState !== "loading") build();
  else document.addEventListener("DOMContentLoaded", build);
})();
