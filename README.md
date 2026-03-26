# Vestafree minimal full-stack setup

## Services

- `backend/`: HTTP API service
  - `GET /health`
  - `GET /api/state`
  - `POST /api/message` with JSON body `{ "message": "..." }`
- `frontend/`: static frontend service with board rendering + message controls
- `shared/board.mjs`: shared board model, glyph set, and message mapping logic

## Local development

```bash
npm run dev:backend
npm run dev:frontend
```

Then open `http://localhost:5173`.
