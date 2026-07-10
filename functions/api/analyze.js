// Cloudflare Pages Function — POST /api/analyze
// (Pages 배포 방식일 때 사용. Workers 배포는 worker.js 를 사용)
// 실제 분석 로직은 analyze-core.js 에 있습니다.
import { handleAnalyze } from "../../analyze-core.js";

export const onRequestPost = (context) => handleAnalyze(context.request, context.env);
