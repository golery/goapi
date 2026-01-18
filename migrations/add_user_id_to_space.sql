-- Add user_id column to space table
ALTER TABLE space
ADD COLUMN IF NOT EXISTS user_id VARCHAR;

-- Backfill existing data with value 1
UPDATE space
SET
    user_id = '1'
WHERE
    user_id IS NULL;

-- Make user_id mandatory
ALTER TABLE space
ALTER COLUMN user_id
SET
    NOT NULL;