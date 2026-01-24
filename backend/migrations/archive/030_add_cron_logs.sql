-- 030_add_cron_logs.sql
CREATE TABLE IF NOT EXISTS cron_logs (
  id BIGSERIAL PRIMARY KEY,
  job_type TEXT NOT NULL,
  success_count INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- helpful index
CREATE INDEX IF NOT EXISTS idx_cron_logs_executed_at ON cron_logs (executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_cron_logs_job_type ON cron_logs (job_type);