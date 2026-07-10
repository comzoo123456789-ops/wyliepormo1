-- D1 스키마 (적용: npx wrangler d1 execute promoboard --file=schema.sql --remote)

-- 프로모션 저장
CREATE TABLE IF NOT EXISTS promos (
  id         TEXT PRIMARY KEY,
  end_date   TEXT NOT NULL,          -- 만료 자동삭제 기준 (YYYY-MM-DD)
  payload    TEXT NOT NULL,          -- 프로모션 전체 JSON
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_promos_end ON promos(end_date);

-- 클릭 로그 (실제 유입/클릭 지표의 기반)
CREATE TABLE IF NOT EXISTS clicks (
  promo_id TEXT NOT NULL,
  ts       TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_clicks_pid ON clicks(promo_id);

-- 일일 스냅샷 (추이·시즌성 리포트의 기반)
CREATE TABLE IF NOT EXISTS snapshots (
  date    TEXT PRIMARY KEY,
  clicks  INTEGER,
  promos  INTEGER
);
