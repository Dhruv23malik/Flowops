# FlowOps Architecture

This document describes the high-level architecture and data flow of the FlowOps system.

## Overview

FlowOps uses a monolithic backend (Express.js) managing a PostgreSQL database (via Prisma) paired with a React frontend. The codebase is organized as a monorepo for easy sharing of domain logic and schemas.

- **Monorepo Manager:** npm workspaces
- **Shared Schemas:** `packages/schemas` containing Zod definitions for workflows, node configs, executions, and AI payloads.

## System Components

### 1. Frontend (`apps/frontend`)
- **Framework:** React 18, Vite, TypeScript.
- **Routing:** React Router.
- **Workflow Builder:** Built on top of `@xyflow/react` (React Flow). Translates API nodes into FlowNodes and vice-versa.
- **State Management:** React hooks and Context (for Auth). Local component state for builder.
- **Real-time:** `socket.io-client` for receiving live execution updates from the backend.

### 2. Backend (`apps/backend`)
- **API:** Express.js REST API providing CRUD for workflows, executions, and AI endpoints.
- **Database:** PostgreSQL + Prisma ORM.
- **Execution Engine:** A service (`apps/backend/src/services/execution-engine.ts`) responsible for executing workflow graphs in topological order, managing context, resolving conditions, and saving results.
- **AI Services:** 
  - `WorkflowGenerator`: Converts a natural language prompt into a structured Workflow Graph (nodes & edges).
  - `WorkflowDebugger`: Analyzes a failed execution trace, identifies the root cause, and provides actionable fixes (e.g. `update_node_config`).
- **WebSockets:** Socket.IO server emitting execution lifecycle events (`execution:started`, `execution:step_completed`, etc.) to authenticated user rooms.

## Data Models (Prisma)

- **User:** Authentication and ownership.
- **Workflow:** High-level metadata (name, description, status).
- **WorkflowVersion:** Immutable snapshot of the workflow graph (nodes, edges). Executions are tied to a specific version.
- **Execution:** A single run of a WorkflowVersion. Tracks overall status and timestamps.
- **ExecutionStep:** Logs the result (status, duration, error, output) of a specific node within an Execution.

## Execution Lifecycle

1. **Trigger:** A user clicks "Run" on the frontend.
2. **Snapshot:** The backend checks for changes. If the workflow is unmodified since the last run, it reuses the latest `WorkflowVersion`. Otherwise, it saves a new `WorkflowVersion`.
3. **Initialize:** An `Execution` record is created with status `RUNNING`.
4. **Execution Engine:** The engine topologically sorts the graph and begins executing nodes sequentially.
5. **Real-time Updates:** As each node starts and completes, the engine emits Socket.IO events to the user's specific room (`user:${userId}`).
6. **Completion:** The Execution is marked `SUCCESS` or `FAILED` and a final event is emitted.

## AI Debugging Flow

1. User views a failed execution and clicks "Ask FlowOps".
2. The frontend requests debugging from `POST /api/ai/debug-execution`.
3. The backend `WorkflowDebugger` service fetches the execution, graph, and logs.
4. It prompts the LLM to diagnose the failure based on strict instructions, ensuring the output is purely JSON.
5. The LLM responds with a `diagnosis`, `probableCause`, and `suggestedFix` (validated by Zod schemas).
6. The frontend's `AIDebuggerPanel` displays the diagnosis and allows the user to click "Apply Fix", which patches the graph config in memory.

## Adding a New Node Type

To add a new node type:
1. Define the node configuration schema in `packages/schemas/src/index.ts`.
2. Add the node execution logic in `apps/backend/src/services/execution-engine.ts`.
3. Create a frontend visual node component in `apps/frontend/src/features/workflows/builder/nodes/`.
4. Register the frontend component in `apps/frontend/src/features/workflows/builder/WorkflowCanvas.tsx` and `types.ts`.
