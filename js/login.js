// 로그인 (데모) — 일반/사업자 탭 선택 후 아이디/비밀번호 인증
const $ = (id) => document.getElementById(id);
let role = "user";

// 최초 진입 시 데모 계정 시드 (테스트 편의)
(function seed() {
  const u = window.AUTH.users();
  const need = { nike: 0, user: 0, admin: 0 };
  u.forEach((x) => { if (x.userId in need) need[x.userId] = 1; });
  const add = [];
  if (!need.nike) add.push({ role: "business", name: "나이키 담당자", userId: "nike", pw: "1234", email: "biz@nike.com", brand: "나이키" });
  if (!need.user) add.push({ role: "user", name: "홍길동", userId: "user", pw: "1234", email: "user@example.com" });
  if (!need.admin) add.push({ role: "admin", name: "운영자", userId: "admin", pw: "1234", email: "admin@promoboard" });
  if (add.length) window.AUTH.saveUsers(u.concat(add));
})();
$("lgDemo").innerHTML = "데모 — 사업자: <b>nike/1234</b> · 일반: <b>user/1234</b> · 운영자: <b>admin/1234</b>";

document.querySelectorAll(".auth-tab").forEach((t) =>
  t.addEventListener("click", () => {
    document.querySelectorAll(".auth-tab").forEach((x) => x.classList.remove("is-active"));
    t.classList.add("is-active");
    role = t.dataset.role;
    $("lgErr").hidden = true;
  })
);

$("loginForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const id = $("lgId").value.trim(), pw = $("lgPw").value;
  if (!id || !pw) return err("아이디와 비밀번호를 입력하세요.");
  // 아이디+비번으로 인증(계정의 실제 역할 사용). 탭은 안내용.
  const user = window.AUTH.users().find((u) => u.userId === id && u.pw === pw);
  if (!user) return err("아이디 또는 비밀번호가 일치하지 않습니다.");
  window.AUTH.set({ role: user.role, name: user.name, userId: user.userId, email: user.email, brand: user.brand || null });
  location.href = user.role === "admin" ? "admin.html" : user.role === "business" ? "company.html" : "index.html";
});

function err(m) { $("lgErr").textContent = m; $("lgErr").hidden = false; }
