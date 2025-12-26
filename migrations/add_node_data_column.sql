-- Migration: Add data JSONB column to node table for storing images and other data
-- Date: 2024

ALTER TABLE node DROP COLUMN data;
ALTER TABLE node ADD COLUMN data JSONB;

