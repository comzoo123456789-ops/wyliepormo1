// ============================================================
// 공용 AI 분석 로직 — Worker(worker.js)와 Pages Function 양쪽에서 사용
// 프로모션 URL을 서버에서 읽어 Claude API로 분류합니다.
// 필요한 시크릿: ANTHROPIC_API_KEY (env)
// ============================================================

const CATEGORIES = {
  brand: {
    health: ["건강식품", "건강기기", "의료용품", "헬스케어"],
    beauty: ["스킨케어", "메이크업", "향수", "헤어/바디"],
    tech: ["스마트폰/주변기기", "노트북/PC", "웨어러블", "음향기기"],
    food: ["신선식품", "가공식품", "간편식", "음료"],
    fashion: ["여성의류", "남성의류", "언더웨어", "패션잡화"],
    appliance: ["대형가전", "주방가전", "생활가전", "계절가전"],
    homedeco: ["가구", "조명", "인테리어소품", "침구"],
  },
  local: {
    "local-food": ["맛집/식당", "카페/디저트", "배달전문", "밀키트"],
    "local-beauty": ["미용실", "네일샵", "피부관리", "왁싱/눈썹"],
    "local-health": ["헬스장", "PT/트레이닝", "요가/필라테스", "크로스핏"],
  },
};
const ALL_GROUPS = { ...CATEGORIES.brand, ...CATEGORIES.local };
const GROUP_IDS = Object.keys(ALL_GROUPS);
const PROMO_TYPES = ["sale", "gift", "coupon", "review", "launch", "limited"];

const json = (obj, status = 200) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });

export async function handleAnalyze(request, env) {
  try {
    const { url } = await request.json();
    if (!url || !/^https?:\/\//.test(url)) return json({ error: "invalid_url" }, 400);
    if (!env || !env.ANTHROPIC_API_KEY) return json({ error: "no_api_key" }, 500);

    const meta = await fetchMeta(url);
    const draft = await classify(meta, url, env.ANTHROPIC_API_KEY);
    draft.image = meta.ogImage || "";
    return json(draft);
  } catch (e) {
    return json({ error: String((e && e.message) || e) }, 500);
  }
}

async function fetchMeta(url) {
  const res = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; PromoBoardBot/1.0)" },
  });
  const html = (await res.text()).slice(0, 400000);
  const pick = (re) => (html.match(re) || [])[1] || "";
  const title = pick(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const ogTitle = pick(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  const ogDesc = pick(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  const ogImage = pick(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
  const desc = pick(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 5000);
  return { title, ogTitle, ogDesc: ogDesc || desc, ogImage, text };
}

async function classify(meta, url, apiKey) {
  const system =
    "너는 한국 이커머스/브랜드 프로모션 페이지를 분석해 구조화하는 도우미다. " +
    "주어진 페이지 정보를 읽고, 어떤 브랜드가 어떤 프로모션을 하는지 아래 스키마로 정확히 분류해라. " +
    "group은 반드시 목록의 id 중 하나. sub는 그 group에 맞는 한국어 세부 카테고리. " +
    "promoType: sale(할인) gift(증정/1+1) coupon(쿠폰) review(체험단) launch(신제품) limited(기간한정). " +
    "title은 25자 내외의 프로모션 제목, desc는 60자 내외 한 문장 설명. " +
    "discount는 % 숫자(없으면 0), code는 쿠폰코드 문자열(없으면 빈 문자열). " +
    "자영업/동네 가게면 type=local, 그 외 브랜드는 type=brand.\n\n" +
    "카테고리(id: 세부목록):\n" +
    Object.entries(ALL_GROUPS)
      .map(([id, subs]) => `- ${id}: ${subs.join(", ")}`)
      .join("\n");

  const user =
    `URL: ${url}\n` +
    `제목: ${meta.title}\n` +
    `og:title: ${meta.ogTitle}\n` +
    `og:description: ${meta.ogDesc}\n` +
    `본문 발췌:\n${meta.text}`;

  const schema = {
    type: "object",
    additionalProperties: false,
    properties: {
      type: { type: "string", enum: ["brand", "local"] },
      group: { type: "string", enum: GROUP_IDS },
      sub: { type: "string" },
      promoType: { type: "string", enum: PROMO_TYPES },
      brand: { type: "string" },
      title: { type: "string" },
      desc: { type: "string" },
      discount: { type: "integer" },
      code: { type: "string" },
    },
    required: ["type", "group", "sub", "promoType", "brand", "title", "desc", "discount", "code"],
  };

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-opus-4-8",
      max_tokens: 1024,
      system,
      messages: [{ role: "user", content: user }],
      output_config: { format: { type: "json_schema", schema } },
    }),
  });

  const data = await res.json();
  if (data.type === "error") throw new Error(data.error?.message || "anthropic_error");
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
  const draft = JSON.parse(text);
  const subs = ALL_GROUPS[draft.group] || [];
  if (subs.length && !subs.includes(draft.sub)) draft.sub = subs[0];
  return draft;
}
