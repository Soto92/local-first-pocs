# Pixel Office Local-First

A local-first Pixel Office where models run in the browser with Web-LLM, while the backend only handles SSE orchestration.

## Demo

<img width="977" height="729" alt="Captura de tela 2026-04-07 175108" src="https://github.com/user-attachments/assets/36fe00f4-16c5-4322-a9b3-d2d10f9cc12c" />

<img width="1675" height="931" alt="Captura de tela 2026-04-07 175243" src="https://github.com/user-attachments/assets/96ff489c-0044-4b88-badd-5477ead67c9e" />

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
