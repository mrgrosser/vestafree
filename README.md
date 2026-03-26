# Vestafree minimal full-stack setup

## Services

- `backend/`: HTTP API service
  - `GET /health`
  - `GET /api/state`
  - `POST /api/message` with JSON body `{ "message": "..." }`
- `frontend/`: static frontend service with board rendering + message controls
- `shared/board.mjs`: shared board model, glyph set, and message mapping logic

## Local development (without Docker)

```bash
npm run dev:backend
npm run dev:frontend
```

Then open `http://localhost:5173`.

## Docker (local + production-style)

1. Copy the template and set values:

```bash
cp .env.example .env
```

2. Build and run both services:

```bash
docker compose up --build
```

3. Open the app:

- Frontend: `http://localhost:5173`
- Backend health endpoint: `http://localhost:3000/health`

### Docker services and networking

- `backend` listens on container port `3000` and is exposed to host `${BACKEND_PORT:-3000}`.
- `frontend` listens on container port `5173` and is exposed to host `${FRONTEND_PORT:-5173}`.
- Both services are attached to the `vestafree` bridge network.
- Frontend calls backend via `API_BASE_URL` (for Compose default: `http://backend:3000`).

### Configuration variables

Use `.env` (based on `.env.example`) to configure runtime values.

- Frontend:
  - `FRONTEND_PORT`
  - `API_BASE_URL`
  - `FRONTEND_REFRESH_INTERVAL_MS`
- Backend:
  - `BACKEND_PORT`
  - `ENABLED_PROVIDERS`
  - `DEFAULT_PROVIDER`
- Manual provider:
  - `MANUAL_MESSAGE`
  - `MANUAL_POLL_INTERVAL_MS`
- Weather provider:
  - `WEATHER_CITY` (required if weather provider is enabled)
  - `WEATHER_CONDITIONS`
  - `WEATHER_TEMP_F`
  - `WEATHER_POLL_INTERVAL_MS`
- Flight provider:
  - `FLIGHT_NUMBER` (required if flight provider is enabled)
  - `FLIGHT_STATUS`
  - `FLIGHT_GATE`
  - `FLIGHT_POLL_INTERVAL_MS`
