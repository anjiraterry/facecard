# 11 — Social, Community & Leaderboards

## 1. Social & Circle Features

| Feature | Current State | Source Evidence & Notes |
|---|---|---|
| **Friends / Following** | **Partially Implemented** | Stored in `AuditLog` (`actorId = userId`, `action = 'ADD_FRIEND'`, `targetId = friendId`). Instant one-way add (no request/accept state, despite `/friends/add` toast saying `"Friend request sent"`). |
| **Remove Friend** | **API Implemented, UI Mocked** | `DELETE /api/friends/[id]` deletes `AuditLog` row, but `src/app/profile/page.tsx:214-218` only adds ID to local `removedFriendIds` state without calling the API! |
| **Friend Discovery (`/friends/add`)** | **Implemented** | `GET /api/friends?suggested=true` returns all other users in DB (excluding `sessionUser.id`). Does not exclude `DELETED`/`BANNED` users or already-added friends. |
| **Public Profiles (`/friends/[id]`, `/u/[id]`)** | **Implemented** | `GET /api/friends/[id]` looks up by UUID or `@handle`, returns latest score, tier, streak, H2H duel record, and subscores. |
| **Point Gifting** | **Mocked** | `src/app/friends/[id]/page.tsx:183-194` (`handleGiftPoints`) uses `setTimeout` + toast; no API, no ledger transfer. |
| **Referral Invites** | **Hardcoded / Unimplemented** | `src/app/friends/add/page.tsx:110,119` shows static `FC-8821-ATELIER` and promises `+100 PTS`. |
| **Feeds, Posts, Comments, Reactions** | **Missing** | Only local `isLiked` state on `/home` (`src/app/home/page.tsx:33,287`). |
| **Notifications** | **Static Placeholder** | `/home` bell icon (`home/page.tsx:96-105`) links to `/scan` with `myDuels.length || 1` badge; no notification system. |
| **Blocking, Reporting, Messaging** | **Missing** | No models, APIs, or UI. |

---

## 2. Leaderboards (`/leaderboard`, `GET /api/leaderboard`)

- **Data Source:** `db.user.findMany({ orderBy: { lifetimePoints: 'desc' }, take: 50 })` (`src/app/api/leaderboard/route.ts:13-23`).
- **UI Tabs (`src/app/leaderboard/page.tsx:26,60-74`):** Renders `Global`, `Circle`, and `This Week` tabs, **but changing tabs does not filter or re-fetch data** — all 3 tabs display the exact same global `lifetimePoints` top-50 array.
- **Issues & Scalability:**
  1. **Deleted/Banned Users Visible:** `findMany` has no `where: { status: 'ACTIVE' }` filter, so `DELETED` users (`"Deleted Contender"`) appear in standings.
  2. **No Pagination or Personal Rank Outside Top 50:** `currentUserEntry` is `undefined` if user is ranked > 50.
  3. **No Tie-Breaking:** Relies on implicit Postgres row order when `lifetimePoints` are equal.
  4. **N+1 / Heavy Include:** Fetches latest `Scan` and `Streak` for all 50 users on every request with no caching.
