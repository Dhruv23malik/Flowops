import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WorkflowGenerator, LlmClient } from '../services/workflow-generator';

// ─── Mock DB to avoid needing a real database connection ───────────
vi.mock('../db', () => ({
  default: {
    llmGenerationLog: {
      create: vi.fn().mockResolvedValue({}),
    },
  },
}));

// ─── Mock LLM Client ────────────────────────────────────────────
class MockLlmClient implements LlmClient {
  private responses: string[];
  private callIndex = 0;

  constructor(responses: string[]) {
    this.responses = responses;
  }

  async generateText(_systemPrompt: string, _userMessage: string): Promise<string> {
    const response = this.responses[this.callIndex] ?? this.responses[this.responses.length - 1];
    this.callIndex++;
    return response;
  }

  getCallCount() {
    return this.callIndex;
  }
}

// ─── Valid Graph (matches @flowops/schemas NodeType enum) ──────────
const VALID_GRAPH = JSON.stringify({
  name: "My Workflow",
  description: "This is a mocked valid workflow",
  nodes: [
    {
      id: "trigger_1",
      type: "manual_trigger",
      config: {},
      position: { x: 0, y: 0 },
    },
    {
      id: "analyze_1",
      type: "ai_analyze",
      config: {
        prompt: "Analyze the input data",
        outputKey: "analysis_result",
      },
      position: { x: 200, y: 0 },
    },
    {
      id: "save_1",
      type: "save_result",
      config: {
        resultKey: "final_result",
      },
      position: { x: 400, y: 0 },
    },
  ],
  edges: [
    { id: "e1", source: "trigger_1", target: "analyze_1" },
    { id: "e2", source: "analyze_1", target: "save_1" },
  ],
});

const MALFORMED_JSON = "This is not JSON at all, sorry!";

const MISSING_REQUIRED_FIELDS = JSON.stringify({
  nodes: [
    {
      id: "step_1",
      // missing type, config
    },
  ],
  edges: [],
});

const INVALID_EDGE_REFERENCE = JSON.stringify({
  nodes: [
    {
      id: "trigger_1",
      type: "manual_trigger",
      config: {},
    },
  ],
  edges: [
    { id: "e1", source: "trigger_1", target: "nonexistent_node" },
  ],
});

const INVALID_CONFIG = JSON.stringify({
  nodes: [
    {
      id: "analyze_bad",
      type: "ai_analyze",
      config: {
        // missing required 'prompt' field
        outputKey: "result",
      },
    },
  ],
  edges: [],
});

// ─── Tests ──────────────────────────────────────────────────────

describe('WorkflowGenerator (mocked LLM)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should accept a valid graph on first try', async () => {
    const mockLlm = new MockLlmClient([VALID_GRAPH]);
    const generator = new WorkflowGenerator(mockLlm);

    const result = await generator.generate('Trigger → analyze → save result');

    expect(result.success).toBe(true);
    expect(result.workflow).toBeDefined();
    expect(result.workflow!.nodes).toHaveLength(3);
    expect(result.attempts).toBe(1);
    expect(mockLlm.getCallCount()).toBe(1);
  });

  it('should retry on malformed JSON and succeed on second try', async () => {
    const mockLlm = new MockLlmClient([MALFORMED_JSON, VALID_GRAPH]);
    const generator = new WorkflowGenerator(mockLlm);

    const result = await generator.generate('Build a data pipeline');

    expect(result.success).toBe(true);
    expect(result.workflow).toBeDefined();
    expect(result.attempts).toBe(2);
    expect(mockLlm.getCallCount()).toBe(2);
  });

  it('should retry on missing fields and succeed after correction', async () => {
    const mockLlm = new MockLlmClient([MISSING_REQUIRED_FIELDS, VALID_GRAPH]);
    const generator = new WorkflowGenerator(mockLlm);

    const result = await generator.generate('Process some data');

    expect(result.success).toBe(true);
    expect(result.attempts).toBe(2);
  });

  it('should retry on invalid edge reference and succeed after correction', async () => {
    const mockLlm = new MockLlmClient([INVALID_EDGE_REFERENCE, VALID_GRAPH]);
    const generator = new WorkflowGenerator(mockLlm);

    const result = await generator.generate('Build a workflow with steps');

    expect(result.success).toBe(true);
    expect(result.attempts).toBe(2);
  });

  it('should retry on invalid config and succeed after correction', async () => {
    const mockLlm = new MockLlmClient([INVALID_CONFIG, VALID_GRAPH]);
    const generator = new WorkflowGenerator(mockLlm);

    const result = await generator.generate('Make an AI analysis');

    expect(result.success).toBe(true);
    expect(result.attempts).toBe(2);
  });

  it('should fail after MAX_RETRIES (4 total attempts) with persistent errors', async () => {
    const mockLlm = new MockLlmClient([
      MALFORMED_JSON,
      MALFORMED_JSON,
      MALFORMED_JSON,
      MALFORMED_JSON,
    ]);
    const generator = new WorkflowGenerator(mockLlm);

    const result = await generator.generate('Build something impossible to parse');

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.attempts).toBe(4); // 1 initial + 3 retries
    expect(result.workflow).toBeUndefined();
  });

  it('should handle markdown-fenced JSON output', async () => {
    const fencedResponse = "```json\n" + VALID_GRAPH + "\n```";
    const mockLlm = new MockLlmClient([fencedResponse]);
    const generator = new WorkflowGenerator(mockLlm);

    const result = await generator.generate('Trigger and save result');

    expect(result.success).toBe(true);
    expect(result.workflow).toBeDefined();
    expect(result.attempts).toBe(1);
  });

  it('should succeed on third try after two failures', async () => {
    const mockLlm = new MockLlmClient([
      INVALID_EDGE_REFERENCE,
      MISSING_REQUIRED_FIELDS,
      VALID_GRAPH,
    ]);
    const generator = new WorkflowGenerator(mockLlm);

    const result = await generator.generate('Multi-step workflow');

    expect(result.success).toBe(true);
    expect(result.attempts).toBe(3);
    expect(mockLlm.getCallCount()).toBe(3);
  });
});
