# Pixel Office Local-First

A local-first Pixel Office where models run in the browser with Web-LLM, while the backend only handles SSE orchestration.

## Structure

- `frontend/` React 19 + Web-LLM + pixel-art canvas
- `backend/` Node HTTP SSE

## Run

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open: http://localhost:5173

## Chat Commands

- `Mark what is 2+2`
- `go to desk 2`
- `start a conversation with agent 2`
- `John talk to Mark`
- `John ask Mark what is 3x3`
