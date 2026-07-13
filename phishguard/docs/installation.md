# Installation and Deployment Guide

This guide provides step-by-step instructions to clone PhishGuard, configure environment variables, deploy using Docker Compose in a production environment, run database migrations, and populate initial seed data.

---

## Prerequisites
Ensure the target server has the following installed:
- **Docker** (v20.10 or newer)
- **Docker Compose** (v2.0 or newer)
- **Git**
- **OpenSSL** (optional, for generating self-signed certificates for testing TLS termination locally)

---

## Step 1: Clone the Repository
Clone the PhishGuard codebase to your production server:
```bash
git clone https://github.com/your-org/phishguard.git
cd phishguard
```

---

## Step 2: Configure Environment Variables
1. Navigate to the infrastructure config folder:
   ```bash
   cd phishguard/infra
   ```
2. Copy the production environment example template to `.env.prod`:
   ```bash
   cp .env.prod.example .env.prod
   ```
3. Edit `.env.prod` using a text editor (e.g., `nano .env.prod`) and configure:
   - `POSTGRES_PASSWORD`: Use a strong, unique database password.
   - `JWT_SECRET_KEY`: Set a secure 32-byte hex key for cryptographically signing sessions (e.g., generate with `openssl rand -hex 32`).
   - `AI_PROVIDER` and `OPENAI_API_KEY`: Feed API details for AI narrative report summaries.
   - `SMTP_PASSWORD`: Seeding credentials for automated email alerts.

---

## Step 3: Establish SSL/TLS Certificates
Nginx is configured to serve assets securely over HTTPS (port 443).
Place your production SSL certificates at the following paths (which are volume-mounted to the Nginx container):
- Cert chain: `phishguard/infra/certs/live/phishguard.com/fullchain.pem`
- Private key: `phishguard/infra/certs/live/phishguard.com/privkey.pem`

### Generating Self-Signed Certificates (For Local Testing/Staging)
For staging or validation environments where Let's Encrypt is not active, generate a self-signed pair:
```bash
mkdir -p certs/live/phishguard.com/
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout certs/live/phishguard.com/privkey.pem \
  -out certs/live/phishguard.com/fullchain.pem \
  -subj "/CN=localhost"
```

---

## Step 4: Deploy Using Docker Compose
Launch the production stack in the background:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
This commands builds and launches 5 services:
1. `db`: Postgres database store (persistent data in `pgdata` volume).
2. `redis`: Broker and result backend for Celery queues.
3. `backend`: FastAPI Uvicorn engine running the endpoints.
4. `worker`: Celery background tasks worker handling report rendering and scoring alerts.
5. `nginx`: Reverse proxy serving built frontend assets and terminating TLS.

Verify all containers are up and running:
```bash
docker compose -f docker-compose.prod.yml ps
```

---

## Step 5: Run Database Migrations
Run Alembic migrations to construct database tables and schemas:
```bash
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

---

## Step 6: Populate Initial Demo Data (Seed Script)
Execute the database seed script to insert default system roles, departments, an admin user, and employee users:
```bash
docker compose -f docker-compose.prod.yml exec backend python scripts/seed.py
```

Seeded credentials to access the portals:
- **Admin Portal**:
  - Email: `admin@demo.com`
  - Password: `adminpassword123`
- **Employee Portal**:
  - Email: `alice.smith@demo.com` (Engineering) or `bob.jones@demo.com` (Engineering)
  - Password: `employeepassword123`

---

## Step 7: Verify the Deployed Application
Open your web browser and navigate to `https://localhost` (or your configured server domain).
- Verify the HTTP port 80 automatically redirects to HTTPS port 443.
- Verify the login screen is displayed.
- Test authentication with the admin and employee seed users.
- Inspect container logs to debug issues:
  ```bash
  docker compose -f docker-compose.prod.yml logs -f
  ```
