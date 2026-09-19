# FlowOps Architecture

This document describes the high-level architecture and data flow of the FlowOps system.

## Overview

FlowOps uses a monolithic backend (Express.js) managing a PostgreSQL database (via Prisma) paired with a React frontend. The codebase is organized as a monorepo for easy sharing of domain logic and schemas.

- **Monorepo Manager:** npm workspaces
- **Shared Schemas:** `packages/schemas` containing Zod definitions for workflows, node configs, executions, and AI payloads.

## System Components

### 1. Frontend (`apps/frontend`)
- **Framework:** React 19, Vite, TypeScript.
- **Routing:** React Router.
- **Workflow Builder:** Built on top of `@xyflow/react` (React Flow). Translates API nodes into FlowNodes and vice-versa.
- **State Management:** React hooks and Context (for Auth). Local component state for builder.
- **Real-time:** `socket.io-client` for receiving live execution updates from the backend.

### 2. Backend (`apps/backend`)
- **API:** Express.js REST API providing CRUD for workflows, executions, and AI endpoints.
- **Database:** PostgreSQL + Prisma ORM.
- **Execution Engine:** A service (`apps/backend/src/services/execution/workflow-executor.ts`) responsible for executing workflow graphs sequentially, managing context, resolving conditions, and saving per-step results.
- **AI Services:** 
  - `WorkflowGenerator`: Converts a natural language prompt into a structured Workflow Graph (nodes & edges) using Google Gemini. Uses a retry loop that feeds Zod validation errors back to the model (up to 4 attempts). Every attempt is logged to `LlmGenerationLog`.
  - `WorkflowDebugger`: Analyzes a failed execution trace, identifies the root cause, and provides actionable fixes limited to whitelisted actions (`update_node_config` or `no_safe_fix`).
- **WebSockets:** Socket.IO server emitting execution lifecycle events (`execution:started`, `execution:step_completed`, etc.) to authenticated user rooms.

## Data Models (Prisma)

- **User:** Authentication and ownership.
- **Workflow:** High-level metadata (name, description, status) plus the current graph (`nodes`, `edges` as JSON columns).
- **WorkflowVersion:** Immutable snapshot of the workflow graph. Created automatically when a workflow is run (if the graph has changed since the last version). Executions are tied to a specific version.
- **Execution:** A single run of a WorkflowVersion. Tracks overall status and timestamps.
- **ExecutionStep:** Logs the result (status, duration, error, output) of a specific node within an Execution.
- **ExecutionLog / retryCount:** These columns and tables exist in the schema as placeholders for future per-step logging but are not currently populated by any code.

## Node Types

The system supports 5 pluggable node types:

| Type | Purpose | Config |
|------|---------|--------|
| `manual_trigger` | Entry point that starts the workflow | `{}` |
| `ai_analyze` | Analyzes input using an LLM | `{ prompt, outputKey }` |
| `condition` | Branches workflow based on a comparison | `{ field, operator, value }` |
| `save_result` | Stores a result in the execution context | `{ resultKey }` |
| `http_request` | Makes an external API call (with DNS-resolved private-address blocking) | `{ url, method, headers?, body?, outputKey? }` |

## Execution Lifecycle

1. **Trigger:** A user clicks "Run" on the frontend.
2. **Snapshot:** The backend compares the current `Workflow.nodes`/`edges` with the latest `WorkflowVersion`. If the graph has changed (or no version exists), a new immutable version is created.
3. **Initialize:** An `Execution` record is created with status `RUNNING`.
4. **Execution Engine:** The engine finds the `manual_trigger` node and walks the graph sequentially, following outgoing edges. For `condition` nodes, the engine follows the edge matching the evaluated branch (`yes`/`no`).
5. **Cycle Guard:** Both the schema (DFS cycle detection) and the executor (visited-node set) prevent infinite loops.
6. **Real-time Updates:** As each node starts and completes, the engine emits Socket.IO events to the user's specific room (`user:${userId}`).
7. **Completion:** The Execution is marked `SUCCESS` or `FAILED` and a final event is emitted.

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
2. Add the node executor class in `apps/backend/src/services/execution/node-executors/`.
3. Register the executor in `apps/backend/src/services/execution/workflow-executor.ts`.
4. Create a frontend visual node component in `apps/frontend/src/features/workflows/builder/nodes/`.
5. Register the frontend component in `apps/frontend/src/features/workflows/builder/WorkflowCanvas.tsx` and `types.ts`.
6. Add config validation in `apps/frontend/src/features/workflows/builder/utils/validation.ts`.
