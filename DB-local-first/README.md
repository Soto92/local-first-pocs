# Simple Local-First IndexedDB App

This is a minimal **local-first** app that runs entirely in the browser using **IndexedDB** (no backend, no server). It lets you create items and list them from a local database.

## What this app does

- Stores data locally in **IndexedDB**
- Inserts seed rows on first run
- Lets you create items in the UI
- Lists all items from the local DB

## Demo

<img width="1904" height="676" alt="demo" src="https://github.com/user-attachments/assets/bcc98e12-fe8f-4e7b-a4bf-01c45bbbdafb" />

## How to run

You can simply open the file in a browser:

```
C:\Users\Mauricio\Git\local-first-pocs\DB-local-first\public\index.html
```

Optional: if you prefer a local static server, any simple static server will work.

## Files

- `public/index.html`: UI
- `public/app.js`: IndexedDB logic
- `public/styles.css`: styles

## Notes

- Writes are **confirmed locally** first (local-first style).
- There is **no server** and no network dependency in this demo.
