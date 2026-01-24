-- Create cron_logs table for system cron job monitoring
-- This replaces the incorrect use of ticket_transactions for cron logging

CREATE TABLE IF NOT EXISTS cron_logs (
    id SERIAL PRIMARY KEY,
    job_type VARCHAR(50) NOT NULL,
    success_count INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    duration_ms INTEGER NOT NULL,
    description TEXT,
    metadata JSONB,
    error_message TEXT,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for efficient querying by job type and execution time
CREATE INDEX IF NOT EXISTS idx_cron_logs_job_type_executed_at 
ON cron_logs(job_type, executed_at);

-- Add index for recent logs lookup
CREATE INDEX IF NOT EXISTS idx_cron_logs_executed_at 
ON cron_logs(executed_at DESC);