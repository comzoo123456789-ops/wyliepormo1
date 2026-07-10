// ============================================================
// 실시간 대시보드 위젯 — 특정 브랜드의 라이브 지표 렌더
// KPI(방문자·클릭·CTR) + 목표 게이지 + 유입 스파크라인
// + 스크롤 깊이 퍼널(25/50/75/100%) + 실시간 인사이트/예측
// 가상 트래픽(TRAFFIC) 시작/중지 버튼 포함. "pb-traffic" 이벤트로 실시간 갱신.
// ============================================================
window.renderLiveDash = function (el, brand) {
  const T = window.TRAFFIC;
  if (!el || !T) return;
  const GOAL = 8000;
  const depths = [25, 50, 75, 100];

  function tmpl(s) {
    const gauge = Math.min(100, Math.round((s.visits / GOAL) * 100));
    const f = s.funnel;
    const insight = f[2] < 55
      ? `핵심 이벤트가 있는 <b>75% 지점</b> 도달률이 <b>${f[2].toFixed(0)}%</b>뿐 — 응모/혜택 영역을 위로 올리면 참여율이 오릅니다.`
      : `방문자 대부분이 핵심 영역(75% <b>${f[2].toFixed(0)}%</b>)까지 도달 — 지금은 전환 카피/CTA를 강화할 타이밍.`;
    const avgTick = s.series.length ? Math.round(s.series.reduce((a, b) => a + b, 0) / s.series.length) : 0;
    const predict = T.running()
      ? `현재 유입 추세(틱당 ~${avgTick}) 기준, 곧 목표의 <b>${gauge}%</b> 도달 중`
      : `가상 트래픽을 시작하면 유입 곡선이 실시간으로 변합니다.`;
    const spark = (s.series.length ? s.series : [0]).map((v) => `<span style="height:${Math.max(6, Math.min(100, (v / 32) * 100))}%"></span>`).join("");
    const bars = depths.map((d, i) => `
      <div class="ld-fbar">
        <span class="ld-fbar__l">${d}%</span>
        <span class="ld-fbar__t"><span style="width:${f[i].toFixed(1)}%"></span></span>
        <span class="ld-fbar__v">${f[i].toFixed(0)}%</span>
      </div>`).join("");
    const on = T.running();
    return `
    <div class="ld-head">
      <span class="ld-title">📊 ${brand} 실시간 대시보드 <span class="ld-live ${on ? "on" : ""}">LIVE</span></span>
      <button class="btn ld-toggle ${on ? "ld-toggle--on" : ""}" id="ldToggle">${on ? "⏸ 트래픽 중지" : "▶ 가상 트래픽 시작"}</button>
    </div>
    <div class="ld-kpis">
      <div><strong id="ldV">${s.visits.toLocaleString()}</strong><span>실시간 방문자</span></div>
      <div><strong>${s.clicks.toLocaleString()}</strong><span>클릭</span></div>
      <div><strong>${s.ctr.toFixed(1)}%</strong><span>CTR</span></div>
    </div>
    <div class="ld-gauge">
      <div class="ld-gauge__bar"><span style="width:${gauge}%"></span></div>
      <div class="ld-gauge__lb">오늘 목표 ${GOAL.toLocaleString()}명 · <b>${gauge}%</b></div>
    </div>
    <div class="ld-spark" aria-hidden="true">${spark}</div>
    <div class="ld-funnel">
      <div class="ld-funnel__h">스크롤 깊이 — 이벤트를 어디까지 읽고 이탈했나</div>
      ${bars}
    </div>
    <p class="ld-insight">${insight}</p>
    <p class="ld-predict">${predict}</p>`;
  }

  function paint() {
    el.innerHTML = tmpl(T.stats(brand));
    const t = el.querySelector("#ldToggle");
    if (t) t.addEventListener("click", () => { if (T.running()) T.stop(); else T.start(brand); paint(); });
  }
  paint();
  window.addEventListener("pb-traffic", (e) => { if (!e.detail || e.detail.brand === brand) paint(); });
};
