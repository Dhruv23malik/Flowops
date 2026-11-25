# FlowOps — AI Workflow Automation

**Live demo:** https://flowops-azure.vercel.app/ — opens straight in as a guest, no sign-up needed. Three demo workflows are pre-loaded, so you can run one on first click.

FlowOps is a full-stack platform for creating, managing, and executing AI-powered workflows. Describe a workflow in plain language and Gemini generates the graph; run it and watch each step execute live over WebSockets. An AI debugger diagnoses failed runs and proposes fixes you can apply with one click.

## What it does

- **React Flow builder:** visually design workflows by connecting nodes.
- **AI workflow generation:** natural-language prompt → validated workflow graph (Zod-validated, DAG cycle detection, up to 4 self-correcting retries).
- **AI debugger:** diagnoses a failed execution and proposes a schema-validated fix (whitelisted actions only).
- **Live execution monitoring:** step-by-step status streamed via Socket.IO, with immutable version snapshots per run.
- **Execution engine:** 7 pluggable node types (manual trigger, AI analyze, condition branching, HTTP request with SSRF protection, save result, delay, set variable).
- **Dashboard stats:** real runs, failures, success rate and average run time for the month — computed from execution history, not placeholders.
- **Workflow export/import:** download any workflow as a `.flowops.json` file and import it back (validated before it is created).
- **Account settings:** a real Settings page — guest accounts can upgrade to a free registered account to keep their work, and anyone can sign out.
- **Auth:** JWT + bcrypt, with one-click guest mode.

## Tech stack

- **Frontend:** React 19, Vite, TypeScript, React Flow, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript, Prisma, PostgreSQL, Socket.IO, Google Gemini
- **Shared:** npm-workspaces monorepo with shared Zod schemas (`packages/schemas`) for end-to-end type safety
- **Tests:** 98 backend tests (Vitest + Supertest, DB mocked) and 17 frontend smoke tests (Vitest) — run `npm run test --workspace=apps/backend` and `npm run test --workspace=apps/frontend`. CI runs both plus the frontend build on every push.

## Try it locally

```bash
npm install
npm run build:schemas
```

Set up the backend environment (`apps/backend/.env`):

```env
DATABASE_URL=postgresql://user:password@localhost:5432/flowops
JWT_SECRET=your-secret
GEMINI_API_KEY=your-gemini-key
```

```bash
cd apps/backend
npx prisma migrate dev
npm run seed        # demo user + 3 demo workflows (idempotent)
npm run dev         # API on :3001

# in a second terminal, from the repo root:
npm run dev --workspace=apps/frontend
```

Or run the whole stack with Docker Compose (Postgres + API on :3001 + frontend on :4173):

```bash
docker compose up
```

To run just the database and the app locally instead:

```bash
docker compose up -d db
```

## Project structure

- `/apps/frontend`: React (Vite) + TypeScript + React Flow + Tailwind CSS frontend.
- `/apps/backend`: Express.js + Prisma + Socket.IO + AI agent backend.
- `/packages/schemas`: shared Zod schemas for workflows, node configs, executions, and AI payloads.

## Architecture

See [architecture.md](./architecture.md) for the system design, node lifecycle, and data flow.
