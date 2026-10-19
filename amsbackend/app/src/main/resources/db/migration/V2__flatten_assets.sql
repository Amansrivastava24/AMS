-- ============================================================
-- V2: Flatten assets and remove asset_items dependency
-- Every row in assets represents one independent physical asset
-- ============================================================

-- 1. Add individual-item physical tracking fields to assets table
ALTER TABLE assets
    ADD COLUMN IF NOT EXISTS asset_tag VARCHAR(100),
    ADD COLUMN IF NOT EXISTS serial_number VARCHAR(150),
    ADD COLUMN IF NOT EXISTS serial_number_found VARCHAR(150),
    ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE',
    ADD COLUMN IF NOT EXISTS verification_status VARCHAR(20) NOT NULL DEFAULT 'NOT_CHECKED',
    ADD COLUMN IF NOT EXISTS gate_pass_number VARCHAR(100);

-- 2. Add validation check constraints for individual status
ALTER TABLE assets
    ADD CONSTRAINT chk_assets_status
        CHECK (status IN (
            'AVAILABLE',
            'ASSIGNED',
            'UNDER_REPAIR',
            'LOST',
            'DAMAGED',
            'RETIRED',
            'DISPOSED'
        )),
    ADD CONSTRAINT chk_assets_verification_status
        CHECK (verification_status IN (
            'NOT_CHECKED',
            'FOUND',
            'MISSING'
        ));

-- 3. Safely migrate existing asset_items records into assets before dropping asset_items
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'asset_items'
    ) THEN
        -- A: For assets with at least one item, copy the first item's details directly into the parent asset row
        WITH first_items AS (
            SELECT DISTINCT ON (asset_id)
                id,
                asset_id,
                asset_tag,
                serial_number,
                serial_number_found,
                status,
                custodian_id,
                location_id,
                verification_status,
                tagging_status,
                date_of_checking,
                gate_pass_number
            FROM asset_items
            ORDER BY asset_id, id ASC
        )
        UPDATE assets a
        SET
            asset_tag = fi.asset_tag,
            serial_number = fi.serial_number,
            serial_number_found = fi.serial_number_found,
            status = fi.status,
            custodian_id = COALESCE(fi.custodian_id, a.custodian_id),
            location_id = COALESCE(fi.location_id, a.location_id),
            verification_status = fi.verification_status,
            tagging_status = COALESCE(fi.tagging_status, a.tagging_status),
            date_of_checking = COALESCE(fi.date_of_checking, a.date_of_checking),
            gate_pass_number = fi.gate_pass_number,
            quantity = 1,
            actual_found = CASE 
                WHEN fi.verification_status = 'FOUND' THEN 1 
                WHEN fi.verification_status = 'MISSING' THEN 0 
                ELSE 1 
            END
        FROM first_items fi
        WHERE a.id = fi.asset_id;

        -- B: For assets that had multiple child items (2nd, 3rd...), insert each subsequent item as a separate independent asset
        WITH ranked_items AS (
            SELECT
                id,
                asset_id,
                asset_tag,
                serial_number,
                serial_number_found,
                status,
                custodian_id,
                location_id,
                verification_status,
                tagging_status,
                date_of_checking,
                gate_pass_number,
                ROW_NUMBER() OVER (PARTITION BY asset_id ORDER BY id ASC) as rn
            FROM asset_items
        )
        INSERT INTO assets (
            asset_code,
            asset_type_id,
            name,
            quantity,
            actual_found,
            cost_center,
            asset_owner_id,
            custodian_id,
            location_id,
            date_of_checking,
            tagging_status,
            make_model,
            remarks,
            asset_tag,
            serial_number,
            serial_number_found,
            status,
            verification_status,
            gate_pass_number
        )
        SELECT
            COALESCE(ri.asset_tag, a.asset_code || '-item-' || ri.id),
            a.asset_type_id,
            a.name,
            1,
            CASE 
                WHEN ri.verification_status = 'FOUND' THEN 1 
                WHEN ri.verification_status = 'MISSING' THEN 0 
                ELSE 1 
            END,
            a.cost_center,
            a.asset_owner_id,
            COALESCE(ri.custodian_id, a.custodian_id),
            COALESCE(ri.location_id, a.location_id),
            COALESCE(ri.date_of_checking, a.date_of_checking),
            COALESCE(ri.tagging_status, a.tagging_status),
            a.make_model,
            a.remarks,
            ri.asset_tag,
            ri.serial_number,
            ri.serial_number_found,
            ri.status,
            ri.verification_status,
            ri.gate_pass_number
        FROM ranked_items ri
        JOIN assets a ON ri.asset_id = a.id
        WHERE ri.rn > 1;

        -- C: Drop asset_items table and all its foreign keys / constraints
        DROP TABLE asset_items CASCADE;
    END IF;
END $$;

-- 4. Create unique constraint on asset_tag (ignoring nulls)
CREATE UNIQUE INDEX IF NOT EXISTS idx_assets_asset_tag
    ON assets(asset_tag)
    WHERE asset_tag IS NOT NULL;

-- 5. Create performance indexes for individual physical asset queries
CREATE INDEX IF NOT EXISTS idx_assets_serial_number
    ON assets(serial_number);

CREATE INDEX IF NOT EXISTS idx_assets_status
    ON assets(status);

CREATE INDEX IF NOT EXISTS idx_assets_verification_status
    ON assets(verification_status);
