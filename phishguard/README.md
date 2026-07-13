# PhishGuard Monorepo

Welcome to the **PhishGuard** phishing-awareness training platform scaffolding. This monorepo compiles the full local development setup, containing the FastAPI backend, Celery async task workers, Vite React + TypeScript + Tailwind CSS frontend portal, and the Manifest V3 Chrome extension simulator.

## Directory Structure

```text
phishguard/
├── backend/          # FastAPI App factory, DB config, Models, Celery Tasks, Alembic
├── frontend/         # React 18 + TS + Tailwind (Vite Dev Environment)
├── extension/        # Chrome Manifest V3 extension simulator skeleton
├── infra/            # docker-compose.yml & nginx.conf proxy configs
└── docs/             # Product and system documentation
```

## Running the Platform Locally

To spin up the local development containers:

1. Ensure you have **Docker** and **Docker Compose** installed on your system.
2. Navigate to the infrastructure folder:
   ```bash
   cd phishguard/infra
   ```
3. Run the compose environment:
   ```bash
   docker compose up --build
   ```

### Routing & Port Mappings (Via Nginx)

All traffic runs through the Nginx reverse-proxy on **Port 8080**:

- **Frontend Portal**: `http://localhost:8080/`
  - Switch between **Admin Dashboard** (`/admin`) and **Employee Portal** (`/employee`) on the main selection interface.
- **Backend API**: `http://localhost:8080/api/`
  - **Healthcheck Route**: `http://localhost:8080/api/health`

### Directly Exposed Ports (For debugging)
- **FastAPI Backend**: `http://localhost:8000` (Direct health check: `http://localhost:8000/health`)
- **Vite React Dev Server**: `http://localhost:3000`
- **PostgreSQL**: `localhost:5432` (User: `postgres`, Password: `postgres`, DB: `phishguard`)
- **Redis Broker**: `localhost:6379`

---

## Chrome Manifest V3 Extension Setup

To load the simulated reporting extension helper:

1. Open Google Chrome and go to `chrome://extensions/`.
2. Toggle **Developer mode** in the top-right corner.
3. Click **Load unpacked** in the top-left corner.
4. Select the `phishguard/extension` folder.
5. Pins the **PhishGuard Simulator Assistant** to your extensions bar, allowing you to run simulated reporting tasks.
