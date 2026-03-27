# Local-First Points (IndexedDB + Local SQLite Sync)

This PoC is a **local-first** web app that writes ratings locally in **IndexedDB** and then syncs them to a **local backend** (Node + SQLite). The UI updates instantly after a local write, and a background sync sends pending ratings to the backend.

## Features

- Local-first writes (instant UI feedback)
- Local storage in IndexedDB
- Background sync to a local SQLite backend
- People list with details view
- Ratings with three faces:
  - green = +10
  - yellow = 0
  - red = -10

## How it works

1. User types a name (existing names show in the list)
2. User selects a face and saves
3. The rating is saved locally and marked as `pending`
4. A sync loop posts pending ratings to `/ratings`
5. The backend stores the rating in `points.db`
6. Once synced, the rating becomes `synced`

## Run

```bash
npm install
npm start
```

Open:

```
http://localhost:3000
```

## API

- `GET /people` -> list of known people (from SQLite)
- `POST /ratings` -> save a rating (idempotent by `client_id`)

Payload:

```json
{ "name": "Maria", "face": "green", "client_id": "uuid" }
```

## Files

- `index.js`: local backend (Express + SQLite)
- `public/index.html`: UI
- `public/app.js`: IndexedDB + sync logic
- `public/styles.css`: styles
- `points.db`: SQLite database (created at runtime)

## Notes

- This demo is **local-first** because the UI writes locally first and syncs later.
- The backend is **local** (running on the same machine), not remote.
- If the backend is down, the app continues to work locally and syncs later.
