-- Stock operation log. On-hand quantity is the result of these rows.
-- Rollback (manual):
--   drop table stock_position;
--   drop table stock_op;
--   drop table stock_device;
--   drop table stock_counter;

CREATE TABLE IF NOT EXISTS stock_counter (
    group_id INTEGER PRIMARY KEY REFERENCES "group"(id),
    next_seq BIGINT NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS stock_device (
    device_id UUID PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES "group"(id),
    user_id INTEGER NOT NULL,
    last_device_seq BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_device_group ON stock_device(group_id);

CREATE TABLE IF NOT EXISTS stock_op (
    group_id INTEGER NOT NULL REFERENCES "group"(id),
    seq BIGINT NOT NULL,
    op_id UUID NOT NULL,
    device_id UUID NOT NULL REFERENCES stock_device(device_id),
    user_id INTEGER NOT NULL,
    device_seq BIGINT NOT NULL,
    base_seq BIGINT NOT NULL,
    v SMALLINT NOT NULL,
    type TEXT NOT NULL,
    payload JSONB NOT NULL,
    device_at TIMESTAMPTZ NOT NULL,
    result TEXT NOT NULL,
    on_hand JSONB NOT NULL,
    PRIMARY KEY (group_id, seq),
    UNIQUE (op_id),
    UNIQUE (device_id, device_seq)
);

CREATE TABLE IF NOT EXISTS stock_position (
    group_id INTEGER NOT NULL REFERENCES "group"(id),
    product_id TEXT NOT NULL,
    storage_id TEXT NOT NULL,
    on_hand NUMERIC(14, 3) NOT NULL,
    PRIMARY KEY (group_id, product_id, storage_id)
);
