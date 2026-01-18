-- Migration: Allow bookmarks without collection
-- Date: 2025-12-28

ALTER TABLE bookmark ALTER COLUMN collection_id DROP NOT NULL;
ALTER TABLE bookmark ALTER COLUMN name DROP NOT NULL;
