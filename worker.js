// ============================================================
// Cloudflare Worker 진입점 (wrangler deploy 로 배포)
// - /api/analyze  → AI 분석 함수
// - 그 외 모든 경로 → 정적 파일(ASSETS) 서빙 (index.html 등)
// ============================================================
import { handleAnalyze } from "./analyze-core.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/analyze") {
      if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
      return handleAnalyze(request, env);
    }

    // 정적 자산 (index.html, css, js, data, register.html, report.html …)
    return env.ASSETS.fetch(request);
  },
};
