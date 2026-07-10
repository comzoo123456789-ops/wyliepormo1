// ============================================================
// 가상 트래픽 엔진 (데모 시연용)
// 시작하면 유입·클릭·스크롤깊이 이벤트를 무작위로 생성해
// localStorage에 누적하고 window "pb-traffic" 이벤트로 대시보드에 알립니다.
// 외부 연동 없이 유입 곡선이 실시간으로 출렁이는 시연이 가능합니다.
// ============================================================
window.TRAFFIC = (function () {
  const K = "pb_traffic";
  let timer = null, focus = null;

  function fnv(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function load() { try { return JSON.parse(localStorage.getItem(K)) || null; } catch (e) { return null; } }
  function save() { try { localStorage.setItem(K, JSON.stringify(S)); } catch (e) {} }
  let S = load(); if (!S || !S.brands) S = { brands: {}, series: [] };

  // 브랜드별 기준(baseline) — 트래픽 시작 전에도 그럴듯한 값 표시 (결정적)
  function ensure(b) {
    if (!S.brands[b]) {
      const h = fnv(b), v = 600 + (h % 1600);
      S.brands[b] = {
        visits: v,
        clicks: Math.round(v * (0.05 + (h % 40) / 1000)),
        d: [Math.round(v * 0.9), Math.round(v * (0.5 + (h % 20) / 200)), Math.round(v * (0.28 + (h % 16) / 200)), Math.round(v * (0.15 + (h % 10) / 200))],
      };
    }
    return S.brands[b];
  }

  function stats(b) {
    const x = ensure(b);
    const f = x.d.map((d) => (x.visits ? (d / x.visits) * 100 : 0));
    return { visits: x.visits, clicks: x.clicks, ctr: x.visits ? (x.clicks / x.visits) * 100 : 0, funnel: f, series: S.series.slice(-40) };
  }

  function tick() {
    if (!focus) return;
    const x = ensure(focus);
    const nv = 6 + Math.floor(Math.random() * 26); // 이번 틱 유입
    x.visits += nv;
    for (let i = 0; i < nv; i++) {
      x.d[0]++;                                   // 25% 도달 ~ 대부분
      if (Math.random() < 0.68) x.d[1]++;         // 50%
      if (Math.random() < 0.42) x.d[2]++;         // 75%
      if (Math.random() < 0.24) x.d[3]++;         // 100%
    }
    x.clicks += Math.round(nv * (0.04 + Math.random() * 0.07));
    S.series.push(nv); if (S.series.length > 40) S.series.shift();
    save();
    try { window.dispatchEvent(new CustomEvent("pb-traffic", { detail: { brand: focus } })); } catch (e) {}
  }

  return {
    stats,
    start(brand) { focus = brand; ensure(brand); if (timer) clearInterval(timer); timer = setInterval(tick, 1200); tick(); },
    stop() { if (timer) clearInterval(timer); timer = null; try { window.dispatchEvent(new CustomEvent("pb-traffic", { detail: { brand: focus } })); } catch (e) {} },
    running() { return !!timer; },
  };
})();
