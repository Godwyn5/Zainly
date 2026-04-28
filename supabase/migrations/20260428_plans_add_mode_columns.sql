-- Migration: add plan mode columns to plans table
-- Additive only — no existing columns modified, no data deleted
-- Existing rows receive safe defaults via DEFAULT, no UPDATE needed

ALTER TABLE plans
  ADD COLUMN IF NOT EXISTS plan_mode               text    DEFAULT 'recommended',
  ADD COLUMN IF NOT EXISTS known_surahs            jsonb   DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS starting_surah          integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS custom_surah_order      jsonb   DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS pace_type               text    DEFAULT 'ayahs',
  ADD COLUMN IF NOT EXISTS pace_label              text    DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS pedagogical_order_version text  DEFAULT 'v1',
  -- Partially mastered surahs: { "<surahNumber>": { "from": 1, "to": N } }
  -- "from" is always 1 (user knows from the start), "to" is the last known ayah
  -- Zainly will start these surahs at ayah to+1 instead of ayah 1
  ADD COLUMN IF NOT EXISTS partial_known_surahs    jsonb   DEFAULT '{}';

-- Optional: add a check constraint to keep plan_mode values controlled
-- (comment out if ALTER TABLE ... ADD CONSTRAINT is not supported in your migration tool)
ALTER TABLE plans
  DROP CONSTRAINT IF EXISTS plans_plan_mode_check;

ALTER TABLE plans
  ADD CONSTRAINT plans_plan_mode_check
    CHECK (plan_mode IN ('recommended', 'start_surah', 'custom_order'));
