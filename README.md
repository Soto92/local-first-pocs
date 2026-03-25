# Local-First: concept and sync decisions

This README explains, in practical terms, what **local-first** means, when synchronization is required, when it is not, and the key tradeoffs.

## What is local-first

Local-first is an approach where the app **reads and writes primarily to local data** (on the user’s device), and **sync is secondary and eventual**. In other words, the server is for **replication** and **reconciliation**, not a mandatory hop in the critical path.

Key benefits:

- Works offline by default
- Fast responses (no network dependency)
- More user control and privacy
- Automatic sync when connectivity is available

In practice, local-first usually involves:

- A local database (SQLite, IndexedDB, Realm, etc.)
- A sync queue (pending changes to send)
- A conflict strategy (CRDTs, OT, timestamp merges, etc.)

## Local writes and sync

In local-first, a **write is confirmed locally first**, then synced later. This is **eventual consistency**.

Example:

- The user changes a status
- The UI shows success immediately
- The backend has not applied the change yet

This is expected, as long as you have:

- A sync queue with retries
- Clear UI state (pending, syncing, done, error)
- Conflict handling if the server also changed the data

## When sync is required

Even in local-first apps, there are cases where **remote confirmation is required** before an action is considered “done.” Examples:

- Payments and financial transactions
- Inventory / ticket reservations
- Permission or security changes
- Legal or irreversible actions
- Real-time collaboration with high conflict risk

In these cases, you can:

- Apply the local write as “pending”
- Require server confirmation to finalize
- Show explicit “awaiting confirmation” states

## When NOT to use sync (or when it’s optional)

There are situations where sync adds complexity without enough value:

- Strictly personal apps with no multi-device use
- Disposable or temporary data (cache, short-lived preferences)
- Local prototypes or internal tools with no replication need
- Pure offline experiences where a server doesn’t make sense

In these cases, local-first can simply be **local-only**.

## Signs local-first makes sense

- The app must work offline
- Users can tolerate eventual consistency
- Conflicts are rare or resolvable
- Read/write performance is critical

## Implementation checklist

- Well-defined local database
- Change log / sync queue
- Conflict resolution strategy
- UI sync indicators
- Clear policy for critical operations

## Quick summary

- **Local-first**: local reads/writes, eventual sync
- **Sync required**: critical, irreversible operations
- **Sync optional**: personal, non-critical, disposable data
