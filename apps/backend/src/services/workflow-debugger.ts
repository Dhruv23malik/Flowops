import fs from "fs";
import path from "path";
import { AiDebugResponseSchema, AiDebugResponse } from "@flowops/schemas";
import { LlmClient, GeminiLlmClient } from "./workflow-generator";
import db from "../db";

const MAX_RETRIES = 2; // For V1, max 2 attempts

const PROMPTS_DIR = path.resolve(__dirname, "../../../../prompts");

function loadPrompt(filename: string): string {
  try {
    return fs.readFileSync(path.join(PROMPTS_DIR, filename), "utf-8");
  } catch (err) {
    console.error(`Failed to load prompt ${filename}`, err);
    return "";
  }
}

export interface DebuggerResult {
  success: boolean;
  diagnosis?: AiDebugResponse;
  error?: string;
}

export class WorkflowDebugger {
  private llm: LlmClient;
  private systemPrompt: string;
  private retryPromptTemplate: string;

  constructor(llm?: LlmClient) {
    this.llm = llm || new GeminiLlmClient();
    this.systemPrompt = loadPrompt("workflow-debugger.md");
    this.retryPromptTemplate = loadPrompt("workflow-generator-retry.md"); // Reuse the retry prompt template, as it just says "Here are the validation errors: {{VALIDATION_ERRORS}} Please fix them and output JSON."
  }

  async debugExecution(executionId: string, userId: string): Promise<DebuggerResult> {
    // 1. Fetch execution context securely
    const execution = await db.execution.findUnique({
      where: { id: executionId },
      include: {
        workflow: true,
        workflowVersion: true,
        steps: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!execution || execution.workflow.userId !== userId) {
      return { success: false, error: "Execution not found or access denied." };
    }

    if (execution.status !== "FAILED") {
       return { success: false, error: "Only failed executions can be debugged." };
    }

    // 2. Identify the failed step
    const failedStep = execution.steps.find(s => s.status === "FAILED");
    if (!failedStep) {
      return { success: false, error: "No failed step found in execution." };
    }

    // 3. Compile context
    const graph = typeof execution.workflowVersion.graph === 'string' 
      ? JSON.parse(execution.workflowVersion.graph)
      : execution.workflowVersion.graph;

    const failedNode = (graph as any)?.nodes?.find((n: any) => n.id === failedStep.nodeId);

    const context = {
      workflowName: execution.workflow.name,
      failedNodeId: failedStep.nodeId,
      failedNodeType: failedStep.nodeType,
      failedNodeConfig: failedNode?.config,
      errorMessage: failedStep.error,
      stepInput: failedStep.input,
      previousStepOutputs: execution.steps
        .filter(s => s.status === "SUCCESS")
        .map(s => ({ nodeId: s.nodeId, output: s.output }))
    };

    const userMessage = JSON.stringify(context, null, 2);
    
    // 4. Retry loop
    let lastErrors = "";

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        let msg: string;
        if (attempt === 0) {
          msg = `Analyze this failed execution:\n\n${userMessage}`;
        } else {
          msg = this.retryPromptTemplate.replace("{{VALIDATION_ERRORS}}", lastErrors);
        }

        const rawOutput = await this.llm.generateText(this.systemPrompt, msg);
        const jsonStr = this.extractJson(rawOutput);
        const parsed = JSON.parse(jsonStr);

        const result = AiDebugResponseSchema.safeParse(parsed);

        if (result.success) {
          return {
            success: true,
            diagnosis: result.data,
          };
        }

        lastErrors = result.error.issues
          .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
          .join("\n");

      } catch (err: any) {
        lastErrors = err instanceof SyntaxError
          ? `JSON parse error: ${err.message}`
          : err.message;
      }
    }

    return {
      success: false,
      error: `AI_DEBUGGER_FAILED: Unable to generate valid diagnosis after ${MAX_RETRIES} attempts. Last error: ${lastErrors}`,
    };
  }

  private extractJson(raw: string): string {
    const fenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      return fenceMatch[1].trim();
    }
    return raw.trim();
  }
}
