import { z } from "zod";

// ─── Node Types ─────────────────────────────────────────────────

export const NodeType = z.enum([
  "manual_trigger",
  "ai_analyze",
  "condition",
  "save_result",
  "http_request",
]);
export type NodeType = z.infer<typeof NodeType>;

// ─── Per-Type Config Schemas ────────────────────────────────────

export const ManualTriggerConfigSchema = z.object({});

export const AiAnalyzeConfigSchema = z.object({
  prompt: z.string().min(1, "Prompt is required"),
  outputKey: z.string().optional(),
});

export const ConditionConfigSchema = z.object({
  field: z.string().min(1, "Field is required"),
  operator: z.enum([">", "<", ">=", "<=", "==", "!="]),
  value: z.union([z.string(), z.number(), z.boolean()]),
});

export const SaveResultConfigSchema = z.object({
  resultKey: z.string().min(1, "Result key is required"),
});

export const HttpRequestConfigSchema = z.object({
  url: z.string().url("Must be a valid URL"),
  method: z.enum(["GET", "POST", "PUT", "DELETE"]).default("GET"),
  headers: z.string().optional(), // JSON string
  body: z.string().optional(), // JSON string
  outputKey: z.string().optional(),
});

// Discriminated union mapping type → config
export const NodeConfigSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("manual_trigger"), config: ManualTriggerConfigSchema }),
  z.object({ type: z.literal("ai_analyze"), config: AiAnalyzeConfigSchema }),
  z.object({ type: z.literal("condition"), config: ConditionConfigSchema }),
  z.object({ type: z.literal("save_result"), config: SaveResultConfigSchema }),
  z.object({ type: z.literal("http_request"), config: HttpRequestConfigSchema }),
]);

// ─── Workflow Node ──────────────────────────────────────────────

export const WorkflowNodeSchema = z.object({
  id: z.string().min(1, "Node id is required"),
  type: NodeType,
  position: z.object({ x: z.number(), y: z.number() }),
  config: z.record(z.any()), // strict validation done via NodeConfigSchema in superRefine
});
export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>;

// ─── Workflow Edge ──────────────────────────────────────────────
export const WorkflowEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
});
export type WorkflowEdge = z.infer<typeof WorkflowEdgeSchema>;

// ─── Workflow Graph ─────────────────────────────────────────────

export const WorkflowGraphSchema = z
  .object({
    nodes: z.array(WorkflowNodeSchema).min(1, "Workflow must have at least one node"),
    edges: z.array(WorkflowEdgeSchema).default([]),
  })
  .superRefine((graph, ctx) => {
    const nodeIds = new Set(graph.nodes.map((n) => n.id));

    // 1. Unique node IDs
    if (nodeIds.size !== graph.nodes.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "All node IDs must be unique",
      });
    }

    // 2. At most one manual_trigger
    const triggerCount = graph.nodes.filter((n) => n.type === "manual_trigger").length;
    if (triggerCount > 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A workflow can have at most one Manual Trigger node",
      });
    }

    // 3. Validate Edges
    for (const edge of graph.edges) {
      if (!nodeIds.has(edge.source)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Edge "${edge.id}" points to unknown source node "${edge.source}"`,
        });
      }
      if (!nodeIds.has(edge.target)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Edge "${edge.id}" points to unknown target node "${edge.target}"`,
        });
      }
      // 4. No self-loops
      if (edge.source === edge.target) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Edge "${edge.id}" is a self-loop (source and target are the same node "${edge.source}")`,
        });
      }
    }

    // 5. Cycle detection (DFS)
    const adj = new Map<string, string[]>();
    for (const id of nodeIds) adj.set(id, []);
    for (const edge of graph.edges) {
      if (nodeIds.has(edge.source) && nodeIds.has(edge.target)) {
        adj.get(edge.source)!.push(edge.target);
      }
    }

    const visited = new Set<string>();
    const inStack = new Set<string>();

    function hasCycle(nodeId: string): boolean {
      visited.add(nodeId);
      inStack.add(nodeId);
      for (const neighbor of adj.get(nodeId) ?? []) {
        if (!visited.has(neighbor)) {
          if (hasCycle(neighbor)) return true;
        } else if (inStack.has(neighbor)) {
          return true;
        }
      }
      inStack.delete(nodeId);
      return false;
    }

    for (const nodeId of nodeIds) {
      if (!visited.has(nodeId) && hasCycle(nodeId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Workflow graph contains a cycle. Workflows must be acyclic (DAG).",
        });
        break;
      }
    }

    // 6. Per-node type-specific config validation
    for (const node of graph.nodes) {
      const result = NodeConfigSchema.safeParse({ type: node.type, config: node.config });
      if (!result.success) {
        for (const issue of result.error.issues) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Node "${node.id}" (${node.type}): ${issue.message} at ${issue.path.join(".")}`,
          });
        }
      }
    }
  });

export type WorkflowGraph = z.infer<typeof WorkflowGraphSchema>;

// ─── Standalone Validation Function ─────────────────────────────

export interface WorkflowValidationResult {
  success: boolean;
  errors: string[];
}

/**
 * Validate a workflow graph and return structured results.
 * Can be used by both frontend and backend.
 */
export function validateWorkflowGraph(
  graph: { nodes: unknown[]; edges: unknown[] },
): WorkflowValidationResult {
  const result = WorkflowGraphSchema.safeParse(graph);
  if (result.success) {
    return { success: true, errors: [] };
  }
  return {
    success: false,
    errors: result.error.issues.map((issue) => issue.message),
  };
}

// ─── Execution Status Types ─────────────────────────────────────

export const ExecutionStatusSchema = z.enum(["QUEUED", "RUNNING", "SUCCESS", "FAILED"]);
export type ExecutionStatus = z.infer<typeof ExecutionStatusSchema>;

export const StepStatusSchema = z.enum(["PENDING", "RUNNING", "SUCCESS", "FAILED", "SKIPPED", "RETRYING"]);
export type StepStatus = z.infer<typeof StepStatusSchema>;

// ─── AI Debugger Response ───────────────────────────────────────

export const AiDebuggerFixSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("update_node_config"),
    nodeId: z.string().min(1),
    changes: z.record(z.any()),
  }),
  z.object({
    type: z.literal("no_safe_fix"),
  }),
]);
export type AiDebuggerFix = z.infer<typeof AiDebuggerFixSchema>;

export const AiDebugResponseSchema = z.object({
  diagnosis: z.string().min(1),
  probableCause: z.string().min(1),
  suggestedFix: AiDebuggerFixSchema,
});
export type AiDebugResponse = z.infer<typeof AiDebugResponseSchema>;

export const AiDebugExecutionRequestSchema = z.object({
  executionId: z.string().min(1),
});
export type AiDebugExecutionRequest = z.infer<typeof AiDebugExecutionRequestSchema>;

// ─── Workflow Status ────────────────────────────────────────────

export const WorkflowStatusSchema = z.enum(["DRAFT", "ACTIVE", "PAUSED"]);
export type WorkflowStatus = z.infer<typeof WorkflowStatusSchema>;

// ─── Auth Schemas ───────────────────────────────────────────────

export const RegisterRequestSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  email: z.string().email("Valid email address required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});
export type RegisterRequest = z.infer<typeof RegisterRequestSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().email("Valid email address required"),
  password: z.string().min(1, "Password is required"),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

// ─── Workflow API Schemas ───────────────────────────────────────

export const CreateWorkflowRequestSchema = z.object({
  name: z.string().min(1, "Workflow name is required").max(200),
  description: z.string().max(1000).optional(),
  status: WorkflowStatusSchema.optional().default("DRAFT"),
  nodes: z.array(WorkflowNodeSchema).optional().default([]),
  edges: z.array(WorkflowEdgeSchema).optional().default([]),
});
export type CreateWorkflowRequest = z.infer<typeof CreateWorkflowRequestSchema>;

export const UpdateWorkflowRequestSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional(),
  status: WorkflowStatusSchema.optional(),
  nodes: z.array(WorkflowNodeSchema).optional(),
  edges: z.array(WorkflowEdgeSchema).optional(),
});
export type UpdateWorkflowRequest = z.infer<typeof UpdateWorkflowRequestSchema>;

export const WorkflowSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  status: WorkflowStatusSchema,
  nodes: z.array(z.record(z.any())).optional(),
  edges: z.array(z.record(z.any())).optional(),
  createdAt: z.string().or(z.date()),
  updatedAt: z.string().or(z.date()),
});
export type Workflow = z.infer<typeof WorkflowSchema>;

export const GenerateWorkflowRequestSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(10, "Please describe your workflow in more detail (at least 10 characters)")
    .max(2000, "Prompt is too long (maximum 2000 characters)"),
  workflowId: z.string().optional(),
});
export type GenerateWorkflowRequest = z.infer<typeof GenerateWorkflowRequestSchema>;

// ─── Socket Event Types ─────────────────────────────────────────

export interface ExecutionStartedEvent {
  executionId: string;
  workflowId: string;
  status: ExecutionStatus;
}

export interface ExecutionStepStartedEvent {
  executionId: string;
  step: {
    id: string;
    nodeId: string;
    nodeType: string;
    status: StepStatus;
  };
}

export interface ExecutionStepCompletedEvent {
  executionId: string;
  step: {
    id: string;
    nodeId: string;
    nodeType: string;
    status: "SUCCESS" | "SKIPPED";
    duration?: number;
  };
}

export interface ExecutionStepFailedEvent {
  executionId: string;
  step: {
    id: string;
    nodeId: string;
    nodeType: string;
    status: "FAILED";
    error: any;
  };
}

export interface ExecutionCompletedEvent {
  executionId: string;
  workflowId: string;
  status: "SUCCESS";
}

export interface ExecutionFailedEvent {
  executionId: string;
  workflowId: string;
  status: "FAILED";
}

