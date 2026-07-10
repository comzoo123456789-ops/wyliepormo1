// 로그인 (데모) — 일반/사업자 탭 선택 후 아이디/비밀번호 인증
const $ = (id) => document.getElementById(id);
let role = "user";

// 최초 진입 시 데모 계정 시드 (테스트 편의)
(function seed() {
  const u = window.AUTH.users();
  if (u.length === 0) {
    window.AUTH.saveUsers([
      { role: "business", name: "나이키 담당자", userId: "nike", pw: "1234", email: "biz@nike.com", brand: "나이키" },
      { role: "user", name: "홍길동", userId: "user", pw: "1234", email: "user@example.com" },
    ]);
  }
})();
$("lgDemo").innerHTML = "데모 계정 — 사업자: <b>nike / 1234</b> · 일반: <b>user / 1234</b>";

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
  const user = window.AUTH.users().find((u) => u.userId === id && u.pw === pw && u.role === role);
  if (!user) return err(role === "business" ? "사업자 계정 정보가 일치하지 않습니다." : "일반 계정 정보가 일치하지 않습니다.");
  window.AUTH.set({ role: user.role, name: user.name, userId: user.userId, email: user.email, brand: user.brand || null });
  // 사업자는 기업센터, 일반은 홈으로
  location.href = user.role === "business" ? "company.html" : "index.html";
});

function err(m) { $("lgErr").textContent = m; $("lgErr").hidden = false; }
