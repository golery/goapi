-- Multi-user groups: names, membership roles, invites
-- Rollback (manual): drop table group_invite; alter user_group drop column role;
--   alter "group" drop column name;

ALTER TABLE "group" ADD COLUMN IF NOT EXISTS name TEXT;

ALTER TABLE user_group ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'owner';

CREATE TABLE IF NOT EXISTS group_invite (
    id SERIAL PRIMARY KEY,
    code VARCHAR(6) NOT NULL UNIQUE,
    group_id INTEGER NOT NULL REFERENCES "group"(id),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    used_by_user_id INTEGER,
    revoked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_group_invite_group_id ON group_invite(group_id);
