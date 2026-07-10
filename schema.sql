-- D1 스키마: 프로모션 저장 테이블
-- 적용: npx wrangler d1 execute promoboard --file=schema.sql --remote
CREATE TABLE IF NOT EXISTS promos (
  id         TEXT PRIMARY KEY,
  end_date   TEXT NOT NULL,          -- 만료 자동삭제 기준 (YYYY-MM-DD)
  payload    TEXT NOT NULL,          -- 프로모션 전체 JSON
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_promos_end ON promos(end_date);
