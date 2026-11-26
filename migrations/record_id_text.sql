-- Phone-supplied record ids are not always UUIDs. Built-in custom field
-- ids are plain strings like 'expiry-date', which the old uuid column
-- rejected and failed the whole sync. Store ids as text instead.
-- Existing uuid values cast to text without change.
-- Rollback (manual):
--   ALTER TABLE record ALTER COLUMN id TYPE UUID USING id::uuid;
ALTER TABLE record ALTER COLUMN id TYPE TEXT USING id::text;
