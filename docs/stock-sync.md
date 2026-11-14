# Stock sync API

The stock API stores operations in a group-wide sequence. Authenticated requests use the normal API headers: `Authorization`, `appId`, and `groupId`.

See the [interactive two-device dataflow animation](stock-sync-dataflow.html) for the end-to-end offline queue, push, backend commit, acknowledgment, and pull sequence.

The [textbook slide deck](stock-sync-textbook-slides.html) explains the protocol concepts, sequence values, request contracts, paging, and recovery behavior.

## Client state

Persist these values locally:

- A stable UUID `deviceId` for each app installation and group. The current database requires device IDs to be unique across groups.
- The next `deviceSeq` for that device and group. Allocate sequences in the same local transaction that stores the operation in the outbox.
- A group-wide `lastAppliedSeq` pull cursor.
- Each operation's `opId` and complete request body. A retry must reuse the same operation ID, device sequence, and payload.

## Push

Send queued operations in `deviceSeq` order, one request at a time:

```http
POST /api/stock/ops
```

Each body includes `deviceId`, `deviceSeq`, `baseSeq`, and `op`. `baseSeq` is the client's last known group sequence when the operation was created. It is recorded and checked to ensure it is not ahead of the server, but it does not by itself detect stale edits. `op.at` is an epoch timestamp in milliseconds. `deviceNow` is accepted for compatibility but optional and currently unused.

A successful response includes the accepted operation's `seq` and the current `latestSeq`. `seq` is the operation's position in the group log; `latestSeq` is a high-water mark that tells the client whether it should pull. The returned `onHand` values are snapshots at that operation's sequence. On an idempotent retry, those snapshots may be older than `latestSeq`.

Do not remove an outbox item until the server acknowledges it. If a request times out, retry the exact same body. A `409` with `expectedDeviceSeq` means the server is expecting a different sequence; reconcile the outbox before continuing. A count conflict returns `409` with a `conflicts` array. Pull current operations, refresh the count, and create a new operation with a new `opId`; the rejected count did not consume its device sequence.

## Pull

```http
GET /api/stock/ops?after=<lastAppliedSeq>
```

The response includes `latestSeq`, `nextAfter`, and `hasMore`. Apply `ops` in sequence order and persist the page effects and `nextAfter` cursor atomically. When `hasMore` is true, request the next page with `after=nextAfter`. When it is false, the client has caught up to the response's `latestSeq`; a concurrent later push will be visible on a subsequent sync.

Use each operation's `seq` to order state updates. `receive`, `sell`, and `move` are applied against current server quantities. A `count` sets the observed quantity only when each line's `expected` quantity still matches server on-hand; otherwise the operation is rejected instead of overwriting intervening stock changes. Sells may produce negative on-hand quantities.
