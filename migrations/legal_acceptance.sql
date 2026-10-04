-- Record that a signed-in user accepted the terms and privacy documents shown to them.
-- Rollback (manual): drop table legal_acceptance;

CREATE TABLE IF NOT EXISTS legal_acceptance (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    app TEXT NOT NULL,
    terms TEXT NOT NULL,
    privacy TEXT NOT NULL,
    ip_address TEXT NOT NULL,
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_legal_acceptance_user_app
    ON legal_acceptance (user_id, app, accepted_at);
