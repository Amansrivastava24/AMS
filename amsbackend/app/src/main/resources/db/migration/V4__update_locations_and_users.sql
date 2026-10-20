-- ============================================================
-- V4: Update locations table schema and add city/country to users
-- ============================================================

-- 1. Add city and country to users table for authenticated admin profile
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS city VARCHAR(100),
    ADD COLUMN IF NOT EXISTS country VARCHAR(100);

-- Populate existing users with default corporate city & country if null
UPDATE users
SET 
    city = COALESCE(city, 'Noida'),
    country = COALESCE(country, 'India')
WHERE city IS NULL OR country IS NULL;

-- 2. Safely update locations table schema
-- Add new columns: description, seat_no, floor_no
ALTER TABLE locations
    ADD COLUMN IF NOT EXISTS description VARCHAR(255),
    ADD COLUMN IF NOT EXISTS seat_no VARCHAR(50),
    ADD COLUMN IF NOT EXISTS floor_no VARCHAR(50);

-- Migrate existing data:
-- Use room_location as preferred source for description, with name as fallback
UPDATE locations
SET
    description = COALESCE(NULLIF(TRIM(room_location), ''), NULLIF(TRIM(name), ''), 'Location ' || id),
    floor_no = floor
WHERE description IS NULL OR TRIM(description) = '';

-- Ensure any remaining locations have a valid non-empty description
UPDATE locations
SET description = 'Location ' || id
WHERE description IS NULL OR TRIM(description) = '';

ALTER TABLE locations
    ALTER COLUMN description SET NOT NULL;

-- 3. Drop obsolete columns: name, address, building (if exists), room_location, floor
ALTER TABLE locations
    DROP COLUMN IF EXISTS name,
    DROP COLUMN IF EXISTS address,
    DROP COLUMN IF EXISTS building,
    DROP COLUMN IF EXISTS room_location,
    DROP COLUMN IF EXISTS floor;

-- 4. Create performance indexes for location lookups and searching
CREATE INDEX IF NOT EXISTS idx_locations_floor_no
    ON locations(floor_no);

CREATE INDEX IF NOT EXISTS idx_locations_city
    ON locations(city);

CREATE INDEX IF NOT EXISTS idx_locations_country
    ON locations(country);
