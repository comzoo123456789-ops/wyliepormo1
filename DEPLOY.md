# 배포 가이드 — Cloudflare Pages + Functions

프로모보드를 Cloudflare에 올리고, "AI 자동채움"을 실제 Claude API로 동작시키는 절차입니다.
정적 사이트(HTML/CSS/JS)와 서버리스 함수(`functions/api/analyze.js`)가 **한 번에** 배포됩니다.

## 사전 준비
- Cloudflare 계정 (있음)
- Node.js 설치 (wrangler CLI 실행용)
- Anthropic API 키 — https://console.anthropic.com/settings/keys 에서 발급

---

## 1. wrangler CLI 로그인
```bash
npx wrangler login          # 브라우저로 Cloudflare 인증 (설치 없이 npx 권장)
```
> 전역 설치를 원하면: `npm i -g wrangler` 후 `wrangler login`

## 2. 로컬에서 먼저 테스트
1) 프로젝트 폴더에 `.dev.vars` 파일 생성 (`.dev.vars.example` 복사) 후 키 입력:
```
ANTHROPIC_API_KEY=sk-ant-실제키
```
2) 로컬 서버 실행 (함수까지 같이 구동):
```bash
npx wrangler pages dev .
```
→ 안내되는 주소(예: http://localhost:8788) 접속 → `프로모션 등록` → URL 넣고 "AI로 분석하기"
→ 실제 Claude가 그 페이지를 읽고 카테고리·유형·제목·설명을 자동 작성합니다.

## 3. 배포
```bash
npx wrangler pages deploy . --project-name promoboard
```
→ 처음이면 프로젝트가 생성되고, `https://promoboard.pages.dev` 같은 URL이 나옵니다.

## 4. 배포 환경에 API 키(시크릿) 등록
```bash
npx wrangler pages secret put ANTHROPIC_API_KEY --project-name promoboard
```
프롬프트에 키를 붙여넣으면 됩니다. (또는 대시보드 → Pages → promoboard → Settings → Variables and Secrets)
> 시크릿 등록 후 다시 배포(3번)하면 반영됩니다.

---

## 동작 방식
- 등록폼에서 URL 입력 → 브라우저가 `/api/analyze` 로 POST
- Cloudflare 함수가 **서버에서** 그 URL을 읽어(브라우저 CORS 없음) 본문·메타를 뽑고 → Claude API 호출 → 구조화 JSON 반환
- 담당자는 자동 채워진 값을 검토·수정 후 등록

## 참고
- 로컬에서 `file://` 로 열면 `/api/analyze` 가 없으므로 **기존 규칙기반 분석으로 자동 폴백**됩니다(에러 아님).
- 모델은 `claude-opus-4-8`(가장 강력)로 설정돼 있습니다. 비용을 낮추려면 `functions/api/analyze.js` 의 `model` 을 `claude-haiku-4-5` 로 바꾸면 됩니다.
- **API 키는 절대 코드/깃에 넣지 마세요.** `.dev.vars`(로컬)와 Pages 시크릿(배포)만 사용하며, `.gitignore` 에 이미 제외돼 있습니다.
- 좋아요/알림/등록 데이터를 서버에 저장하려면 다음 단계로 **Cloudflare KV 또는 D1**을 붙이면 됩니다. (원하면 이어서 구성)
