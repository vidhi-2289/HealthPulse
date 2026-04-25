# HealthPulse

Automated Application Health Monitoring & Alert System.

Start with `PROJECT_OVERVIEW.md` for complete project context, architecture, and rubric alignment.

## Workspace Structure

- `frontend` - React dashboard UI
- `backend` - Express API + scheduler + SQLite (Prisma)
- `demo-target-app` - Small target service to monitor
- `infra/terraform` - AWS infrastructure as code (next phase)
- `infra/ansible` - Deployment automation (next phase)

## Local Setup

### 1) Backend

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run dev
```

### 2) Demo Target App

```bash
cd demo-target-app
npm install
npm run dev
```

### 3) Frontend

```bash
cd frontend
npm install
npm run dev
```

## Default Ports

- Frontend: `5173`
- Backend: `4000`
- Demo target app: `5001`

## One-Command Startup (Docker Compose)

After Docker is installed:

```bash
docker compose up --build
```

Then open:

- Frontend: `http://localhost:5173`
- Backend health: `http://localhost:4000/api/health`
- Demo target health: `http://localhost:5001/health`
