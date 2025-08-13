-- Migration 006: Create Activity Logs table
-- Depends on: 001_create_users.sql, 002_create_companies.sql, 003_create_proposals.sql

CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    proposal_id UUID REFERENCES proposals(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for activity logs
CREATE INDEX idx_activity_user ON activity_logs(user_id);
CREATE INDEX idx_activity_company ON activity_logs(company_id);
CREATE INDEX idx_activity_proposal ON activity_logs(proposal_id);
CREATE INDEX idx_activity_created ON activity_logs(created_at DESC);
