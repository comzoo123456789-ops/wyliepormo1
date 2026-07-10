// ============================================================
// Cloudflare Worker 진입점 (wrangler deploy 로 배포)
// - GET  /api/promotions  → D1에 저장된 프로모션 목록 (없으면 [])
// - POST /api/promotions  → 프로모션 등록 (등록 폼에서 저장)
// - POST /api/analyze     → 프로모션 URL AI 분석 (ANTHROPIC_API_KEY 필요)
// - 그 외 경로            → 정적 파일(ASSETS) 서빙
// - scheduled(cron)       → 매일 만료된 프로모션 자동 삭제
// ============================================================
import { handleAnalyze } from "./analyze-core.js";

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

const TODAY_STR = () => new Date().toISOString().slice(0, 10);

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/api/analyze") {
      if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
      return handleAnalyze(request, env);
    }

    if (path === "/api/promotions") {
      if (request.method === "GET") return listPromos(env);
      if (request.method === "POST") return createPromo(request, env);
      return new Response("Method Not Allowed", { status: 405 });
    }

    if (path === "/api/click" && request.method === "POST") {
      return logClick(request, env);
    }
    if (path === "/api/clicks" && request.method === "GET") {
      return clickCounts(env);
    }

    // 정적 자산
    return env.ASSETS.fetch(request);
  },

  // 매일: 만료 프로모션 자동 삭제 + 일일 스냅샷 적재 (cron)
  async scheduled(event, env, ctx) {
    if (!env.DB) return;
    ctx.waitUntil((async () => {
      await env.DB.prepare("DELETE FROM promos WHERE end_date < ?").bind(TODAY_STR()).run();
      // 추이 리포트용 일일 스냅샷 (누적되면 시계열 분석 가능)
      await env.DB.prepare(
        "INSERT OR REPLACE INTO snapshots (date, clicks, promos) VALUES (?, (SELECT COUNT(*) FROM clicks), (SELECT COUNT(*) FROM promos))"
      ).bind(TODAY_STR()).run();
    })());
  },
};

// ---------- 클릭 로깅 (실제 유입/CTR 기반) ----------
async function logClick(request, env) {
  if (!env.DB) return json({ ok: false });
  try {
    const { id } = await request.json();
    if (id != null) await env.DB.prepare("INSERT INTO clicks (promo_id) VALUES (?)").bind(String(id)).run();
    return json({ ok: true });
  } catch (e) {
    return json({ ok: false });
  }
}

// 프로모션별 클릭 수 { id: count }
async function clickCounts(env) {
  if (!env.DB) return json({});
  try {
    const { results } = await env.DB.prepare("SELECT promo_id, COUNT(*) c FROM clicks GROUP BY promo_id").all();
    const out = {};
    (results || []).forEach((r) => (out[r.promo_id] = r.c));
    return json(out);
  } catch (e) {
    return json({});
  }
}

// ---------- 목록 조회 ----------
async function listPromos(env) {
  if (!env.DB) return json([]); // DB 미설정 시 빈 배열 → 프론트는 정적 데이터로 폴백
  try {
    const { results } = await env.DB
      .prepare("SELECT payload FROM promos WHERE end_date >= ? ORDER BY created_at DESC")
      .bind(TODAY_STR())
      .all();
    return json((results || []).map((r) => JSON.parse(r.payload)));
  } catch (e) {
    return json([]);
  }
}

// ---------- 등록 ----------
async function createPromo(request, env) {
  if (!env.DB) return json({ error: "no_db" }, 503);
  try {
    const p = await request.json();
    const req = ["type", "group", "sub", "promoType", "brand", "title", "desc"];
    for (const k of req) if (!p[k]) return json({ error: "missing_field", field: k }, 400);
    if (!p.period || !p.period.start || !p.period.end) return json({ error: "missing_period" }, 400);

    const id = "u" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const promo = {
      id,
      type: p.type, group: p.group, sub: p.sub, promoType: p.promoType,
      brand: String(p.brand).slice(0, 60), title: String(p.title).slice(0, 120),
      desc: String(p.desc).slice(0, 300),
      period: { start: p.period.start, end: p.period.end },
      link: p.link || "#",
      posted: TODAY_STR(),
      isServer: true,
    };
    if (p.image) promo.image = String(p.image).slice(0, 500);
    if (p.discount) promo.discount = Number(p.discount) || 0;
    if (p.code) promo.code = String(p.code).slice(0, 40);

    await env.DB
      .prepare("INSERT INTO promos (id, end_date, payload) VALUES (?, ?, ?)")
      .bind(id, promo.period.end, JSON.stringify(promo))
      .run();
    return json({ ok: true, id });
  } catch (e) {
    return json({ error: String((e && e.message) || e) }, 500);
  }
}
