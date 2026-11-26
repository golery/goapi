# Record sync API

The record API syncs the phone's inventory tables with the backend. It is two endpoints that replace the old `PUT /api/record/sync`:

- Push local changes: `PUT /api/records` (commit, blind upsert — the phone always wins).
- Pull remote changes: `GET /api/records/delta` (per-table keyset pages).

All calls send the normal authenticated headers: `Authorization: Bearer <token>`, `appId`, and `groupId`. Both endpoints scope by the `groupId` header and return `400` when it is missing.

## Commit

```http
PUT /api/records
```

Body keys are the phone's table names, exactly these eight:

`products`, `categories`, `transactions`, `orders`, `suppliers`, `customers`, `storages`, `customFields`.

Any other key is rejected with `400 Unknown commit table <name>`. Each value must be an array of row objects, or `400`. Rows are stored verbatim — including tombstones (`deleted: true`), which is how deletes propagate to other devices.

Example request:

```json
{
  "records": {
    "products": [
      {
        "id": "2c9d8bb4-30c2-4d6b-9c3f-e79ad2d0416c",
        "name": "Live Widget",
        "tags": [],
        "fieldIds": [],
        "fields": {},
        "updateTime": 1795396940281,
        "createTime": 1795396940281,
        "deleted": false
      }
    ],
    "suppliers": [],
    "customers": [],
    "customFields": [
      {
        "id": "expiry-date",
        "name": "Expiry date",
        "type": "DATE",
        "allProducts": true,
        "standard": true,
        "options": null,
        "order": -40,
        "updateTime": 1795396940276,
        "createTime": 1795396940276
      }
    ]
  }
}
```

Notes on the payload:

- `id` is optional. When absent the server generates a UUID. Ids are free-form text, not only UUIDs — built-in custom field ids are plain strings such as `expiry-date`.
- `id` is the **global** primary key (see storage below). Always generate a fresh UUID for a new row; reusing an id overwrites that row, even across groups.
- There is no timestamp comparison. Committing the same id twice keeps the second body, even if its `updateTime` is older. The phone is responsible for not committing stale rows.

Example response:

```json
{
  "accepted": { "products": 1, "suppliers": 0, "customers": 0, "customFields": 1 },
  "timestamp": 1795396940500
}
```

`accepted` counts committed rows per table key. `timestamp` is the server time in milliseconds. Committing only stores rows — run a delta pull afterwards to converge on server state.

## Delta

```http
GET /api/records/delta?table=<table>&since=<ms>&limit=<n>&after=<id>
```

`table` is one of `products`, `categories`, `transactions`, `orders`, `order_lines`, `contacts`, `storages`, `field_defs`. Unknown tables get `400`. `since` is server milliseconds (`0` for a full pull). `limit` defaults to 200 and is clamped to 1–1000. `after` is the last row id of the previous page; omit it on the first page.

Paging protocol:

1. First page: `since=<cursor>` with no `after`.
2. While `hasMore` is true, request the next page with `after=<last row id>`. The `limit` counts parent rows, so a page is never split mid-order.
3. When `hasMore` is false, persist `serverTimestamp` as the next `since` cursor. Do not use `max(updateTime)` — the cursor is server time.
4. Boundary rows may repeat across pages. Merge by `id` (upsert), so repeats are harmless.

Example response:

```json
{
  "records": [
    {
      "id": "2c9d8bb4-30c2-4d6b-9c3f-e79ad2d0416c",
      "deleted": false,
      "updateTime": 1795396940281,
      "createTime": 1795396940281,
      "name": "Live Widget",
      "tags": [],
      "fieldIds": [],
      "fields": {}
    }
  ],
  "serverTimestamp": 1795396940600,
  "hasMore": false
}
```

Row details by table:

- Every row carries the stored body plus `id`, `deleted`, `updateTime`, and `createTime`. `updateTime`/`createTime` are the phone-supplied values from the committed body; the server write time is used only for paging, never surfaced.
- `deleted: true` rows are tombstones. Apply them as deletes locally, then keep them — they are ordinary rows, not errors.
- `contacts` merges two stored types. Each row adds `role`: `customer` for committed `customers` rows, `supplier` for `suppliers` rows. Split them back into the two local tables by `role`.
- `order_lines` explodes each committed `orders` row: one entry per element of its `lines` array, shaped `{ orderId, id, line }` where `id` and `orderId` are the parent order id. Orders without a `lines` array contribute nothing to this table; the order itself comes from the `orders` table.
- `field_defs` reads committed `customFields` rows unchanged.

## Frontend sync loop

Push before pull, per group:

1. Commit each dirty table in one `PUT /api/records` call. Empty arrays are fine and reported as `0` in `accepted`.
2. For each of the eight delta tables, page through `GET /api/records/delta` from the persisted cursor until `hasMore` is false, then persist `serverTimestamp` as the new cursor.
3. Merge every page by `id`: insert new rows, overwrite changed rows, delete rows with `deleted: true`.
4. Split `contacts` by `role` into local suppliers/customers; expand `order_lines` per line; treat `field_defs` as the local custom-fields table.

Retries are safe: commit is a blind upsert of the same bodies, and delta merge is idempotent. If a commit times out, resend the exact same body — never regenerate ids on retry, or the retry creates duplicates.

## Storage

All tables share one Postgres table, `record`:

| Column | Type | Notes |
|---|---|---|
| `id` | `text`, primary key | Phone-supplied id verbatim, or a server UUID when absent. Global across groups — not scoped by `group_id`. |
| `data` | `jsonb` | The committed row body verbatim, including `updateTime`, `createTime`, and `deleted`. |
| `type` | `text` | The commit body key verbatim: `products`, `suppliers`, `customers`, `customFields`, and so on. |
| `group_id` | integer | From the `groupId` header. |
| `app_id` | integer | From the `appId` header. |
| `user_id` | integer | The committing user. |
| `created_at` | timestamp | Server time of first insert; never surfaced to the phone. |
| `updated_at` | timestamp | Server time of last write; drives delta paging only. |

The delta table names are a read-time mapping over `type`: `products`, `categories`, `transactions`, `orders`, and `storages` map to themselves; `contacts` reads `suppliers` + `customers`; `field_defs` reads `customFields`; `order_lines` reads `orders` and explodes `data.lines`.

Because `id` is a single global primary key, two groups committing the same id share one row and the later write wins (including its `group_id`). Fresh UUIDs for new rows keep groups isolated.
