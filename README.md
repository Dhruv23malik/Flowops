# FlowOps

FlowOps is a modern platform for creating, managing, and executing AI-powered workflows.

## Features

- **React Flow Builder:** Visually design workflows by connecting nodes.
- **AI Workflow Generation:** Let FlowOps generate the perfect workflow graph based on your prompt.
- **AI Debugger:** Automatically diagnose and fix failed workflow executions using an intelligent AI agent.
- **Live Execution Monitoring:** Watch your workflows execute in real-time with WebSockets.
- **Extensible Architecture:** Easily add new node types with strict schema validation using Zod.

## Project Structure

This is an npm workspace monorepo.

- `/apps/frontend`: React (Vite) + TypeScript + React Flow + Tailwind CSS frontend.
- `/apps/backend`: Express.js + Prisma + Socket.IO + AI Agent backend.
- `/packages/schemas`: Shared Zod schemas for end-to-end type safety.

## Getting Started

### Prerequisites

- Node.js (v18+)
- PostgreSQL (running locally or remotely)
- API Keys for AI features (Google Gemini)

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment variables in `apps/backend/.env`:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/flowops?schema=public"
   JWT_SECRET="your_secret_here"
   GEMINI_API_KEY="your_api_key_here"
   FRONTEND_ORIGIN="http://localhost:3000"
   ```

3. Initialize the database:
   ```bash
   cd apps/backend
   npx prisma migrate dev
   ```

4. Build shared packages:
   ```bash
   npm run build -w packages/schemas
   ```

### Running the App

Start both frontend and backend concurrently from the root:
```bash
npm run dev
```

Or run them individually:
- Frontend: `cd apps/frontend && npm run dev`
- Backend: `cd apps/backend && npm run dev`

### Testing

Run backend tests:
```bash
cd apps/backend
npm run test
```

## Architecture

See [architecture.md](./architecture.md) for a detailed overview of the system design, node lifecycle, and data flow.
