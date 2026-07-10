// 회원가입 (데모) — 이름·아이디·패스워드·이메일 (+ 사업자는 회사 브랜드)
const $ = (id) => document.getElementById(id);
let role = "user";

// 사업자 회사(브랜드): 직접 입력 + 기존 브랜드 자동완성(datalist)
const BRANDS = [...new Set(PROMOS.map((p) => p.brand))].sort((a, b) => a.localeCompare(b, "ko"));
$("brandOptions").innerHTML = BRANDS.map((b) => `<option value="${b}"></option>`).join("");

document.querySelectorAll(".auth-tab").forEach((t) =>
  t.addEventListener("click", () => {
    document.querySelectorAll(".auth-tab").forEach((x) => x.classList.remove("is-active"));
    t.classList.add("is-active");
    role = t.dataset.role;
    $("suBrandRow").hidden = role !== "business";
    $("suErr").hidden = true;
  })
);

$("signupForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const v = (id) => $(id).value.trim();
  const name = v("suName"), id = v("suId"), pw = $("suPw").value, email = v("suEmail");
  if (!name || !id || !pw || !email) return err("모든 항목을 입력하세요.");
  if (!/^[^@]+@[^@]+\.[^@]+$/.test(email)) return err("이메일 형식을 확인하세요.");
  const users = window.AUTH.users();
  if (users.some((u) => u.userId === id)) return err("이미 사용 중인 아이디입니다.");

  const acc = { role, name, userId: id, pw, email };
  if (role === "business") {
    const brand = $("suBrand").value.trim();
    if (!brand) return err("회사(브랜드)명을 입력하세요.");
    acc.brand = brand;
  }

  users.push(acc);
  window.AUTH.saveUsers(users);
  window.AUTH.set({ role: acc.role, name: acc.name, userId: acc.userId, email: acc.email, brand: acc.brand || null });
  location.href = role === "business" ? "company.html" : "index.html";
});

function err(m) { $("suErr").textContent = m; $("suErr").hidden = false; }
