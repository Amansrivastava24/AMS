
-- V3: Add CUSTODIAN role


INSERT INTO roles (name)
VALUES ('CUSTODIAN')
ON CONFLICT (name) DO NOTHING;

-- Ensure an index exists for filtering assets by custodian.
CREATE INDEX IF NOT EXISTS idx_assets_custodian
    ON assets(custodian_id);