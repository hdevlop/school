-- TRACKER SCHEMA SIMPLIFICATION MIGRATION
-- This script migrates from the complex tracker schema to the simplified one

-- Step 1: Check current state
SELECT 
    COUNT(*) as total_trackers,
    COUNT(CASE WHEN vehicle_id IS NULL THEN 1 END) as unassigned_trackers
FROM trackers;

-- Step 2: Handle trackers without vehicles (assign to first available vehicle)
-- This ensures all trackers have a vehicle before making vehicleId required
UPDATE trackers 
SET vehicle_id = (
    SELECT id 
    FROM vehicles 
    WHERE status = 'active' 
    LIMIT 1
) 
WHERE vehicle_id IS NULL;

-- Verify no unassigned trackers remain
SELECT COUNT(*) as remaining_unassigned FROM trackers WHERE vehicle_id IS NULL;

-- Step 3: Remove unnecessary columns
ALTER TABLE trackers 
DROP COLUMN IF EXISTS operator_id,
DROP COLUMN IF EXISTS reporting_interval,
DROP COLUMN IF EXISTS battery_threshold;

-- Step 4: Make vehicleId required
ALTER TABLE trackers 
ALTER COLUMN vehicle_id SET NOT NULL;

-- Step 5: Update the enum type to simplified version (optional - can be done later)
-- Note: This requires careful handling in production as it affects existing data
/*
-- Create new enum
CREATE TYPE tracker_status_new AS ENUM ('active', 'inactive');

-- Update existing maintenance status to inactive
UPDATE trackers SET status = 'inactive' WHERE status = 'maintenance';

-- Change column type
ALTER TABLE trackers ALTER COLUMN status TYPE tracker_status_new USING status::text::tracker_status_new;

-- Drop old enum and rename new one
DROP TYPE tracker_status;
ALTER TYPE tracker_status_new RENAME TO tracker_status;
*/

-- Step 6: Add constraints to ensure data integrity
ALTER TABLE trackers 
ADD CONSTRAINT unique_active_tracker_per_vehicle 
EXCLUDE (vehicle_id WITH =) 
WHERE (status = 'active');

-- Step 7: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_trackers_vehicle_status ON trackers(vehicle_id, status);
CREATE INDEX IF NOT EXISTS idx_trackers_device_id ON trackers(device_id);
CREATE INDEX IF NOT EXISTS idx_trackers_online_status ON trackers(is_online, status);

-- Step 8: Verify final state
SELECT 
    t.status,
    COUNT(*) as count,
    COUNT(CASE WHEN t.vehicle_id IS NOT NULL THEN 1 END) as with_vehicle,
    COUNT(CASE WHEN v.id IS NOT NULL THEN 1 END) as valid_vehicle_refs
FROM trackers t
LEFT JOIN vehicles v ON t.vehicle_id = v.id
GROUP BY t.status;

-- Step 9: Show vehicles with multiple trackers (should be none after constraint)
SELECT 
    v.name as vehicle_name,
    v.id as vehicle_id,
    COUNT(t.id) as tracker_count
FROM vehicles v
INNER JOIN trackers t ON v.id = t.vehicle_id
WHERE t.status = 'active'
GROUP BY v.id, v.name
HAVING COUNT(t.id) > 1;

-- Step 10: Show vehicles without trackers
SELECT 
    v.id,
    v.name,
    v.type,
    v.status
FROM vehicles v
LEFT JOIN trackers t ON v.id = t.vehicle_id AND t.status = 'active'
WHERE v.status = 'active' AND t.id IS NULL;
