import { Prisma } from '@prisma/client';
import prisma from '../db';

/**
 * Demo workflows seeded for every new guest user.
 *
 * Why per-guest, not one shared demo account: guest login creates a fresh
 * random user on every visit (`guest_<random>@flowops.local`), so seed data
 * attached to a single fixed user would never be seen. Seeding here means
 * every first-time visitor opens FlowOps to 3 working workflows and 1
 * finished run instead of "No workflows yet" and four 0s on the Overview.
 *
 * Every graph below is validated by `src/tests/demo-templates.test.ts`
 * against the shared Zod `WorkflowGraphSchema` — keep them in sync with
 * `packages/schemas` if node types change.
 */

export interface DemoWorkflowTemplate {
  name: string;
  description: string;
  status: 'DRAFT' | 'ACTIVE' | 'PAUSED';
  nodes: Array<{
    id: string;
    type: 'manual_trigger' | 'ai_analyze' | 'condition' | 'save_result' | 'http_request';
    position: { x: number; y: number };
    config: Record<string, unknown>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    sourceHandle?: string;
  }>;
}

export const DEMO_WORKFLOWS: DemoWorkflowTemplate[] = [
  {
    name: 'Customer Feedback Triage',
    description:
      'Analyzes incoming customer feedback with AI, routes urgent negative feedback for human follow-up, and saves the summary.',
    status: 'ACTIVE',
    nodes: [
      {
        id: 'trigger',
        type: 'manual_trigger',
        position: { x: 80, y: 200 },
        config: {
          sampleInput: {
            customer: 'Acme Corp',
            feedback: 'Checkout has been failing with a 500 error for the past hour and customers cannot complete orders!',
          },
        },
      },
      {
        id: 'analyze',
        type: 'ai_analyze',
        position: { x: 340, y: 200 },
        config: {
          prompt: 'Analyze this customer feedback from {{input.customer}}: "{{input.feedback}}". Return JSON with keys "summary" (one sentence), "sentiment" (positive|neutral|negative), and "urgency" (low|medium|high).',
          outputKey: 'summary',
        },
      },
      {
        id: 'is-urgent',
        type: 'condition',
        position: { x: 600, y: 200 },
        config: { field: 'summary.urgency', operator: '==', value: 'high' },
      },
      {
        id: 'save',
        type: 'save_result',
        position: { x: 860, y: 120 },
        config: { resultKey: 'triageSummary' },
      },
    ],
    edges: [
      { id: 'e1', source: 'trigger', target: 'analyze' },
      { id: 'e2', source: 'analyze', target: 'is-urgent' },
      { id: 'e3', source: 'is-urgent', target: 'save', sourceHandle: 'yes' },
    ],
  },
  {
    name: 'Slack Notification Workflow',
    description:
      'Sends a notification to a webhook (httpbin test endpoint) and saves the delivery result — a minimal end-to-end run.',
    status: 'ACTIVE',
    nodes: [
      { id: 'trigger', type: 'manual_trigger', position: { x: 80, y: 200 }, config: {} },
      {
        id: 'notify',
        type: 'http_request',
        position: { x: 340, y: 200 },
        config: {
          url: 'https://httpbin.org/post',
          method: 'POST',
          body: '{"text": "FlowOps workflow ran successfully"}',
          outputKey: 'notifyResponse',
        },
      },
      {
        id: 'save',
        type: 'save_result',
        position: { x: 600, y: 200 },
        config: { resultKey: 'delivery' },
      },
    ],
    edges: [
      { id: 'e1', source: 'trigger', target: 'notify' },
      { id: 'e2', source: 'notify', target: 'save' },
    ],
  },
  {
    name: 'Weekly Report Digest',
    description:
      'Draft workflow: summarizes the week’s activity with AI and saves the digest. Edit it to make it your own.',
    status: 'DRAFT',
    nodes: [
      { id: 'trigger', type: 'manual_trigger', position: { x: 80, y: 200 }, config: {} },
      {
        id: 'digest',
        type: 'ai_analyze',
        position: { x: 340, y: 200 },
        config: {
          prompt: 'Write a short weekly digest from the activity below: top 3 highlights and one thing to watch next week.',
          outputKey: 'digest',
        },
      },
      {
        id: 'save',
        type: 'save_result',
        position: { x: 600, y: 200 },
        config: { resultKey: 'weeklyDigest' },
      },
    ],
    edges: [
      { id: 'e1', source: 'trigger', target: 'digest' },
      { id: 'e2', source: 'digest', target: 'save' },
    ],
  },
];

/**
 * Creates the demo workflows for a user, plus a version + one successful
 * past run for the first workflow so the Overview stats are not all 0.
 * Best-effort by design: callers must never fail a login because seeding
 * failed — wrap in try/catch at the call site.
 */
export async function seedDemoWorkflowsForUser(userId: string): Promise<void> {
  const first = DEMO_WORKFLOWS[0];
  for (const template of DEMO_WORKFLOWS) {
    const workflow = await prisma.workflow.create({
      data: {
        name: template.name,
        description: template.description,
        status: template.status,
        nodes: template.nodes as unknown as Prisma.InputJsonValue,
        edges: template.edges as unknown as Prisma.InputJsonValue,
        userId,
      },
    });

    // One finished run for the first workflow only, so Overview shows
    // Total Workflows 3, Total Runs 1, Success Rate 100% on first open.
    if (template === first) {
      const version = await prisma.workflowVersion.create({
        data: {
          workflowId: workflow.id,
          version: 1,
          graph: { nodes: template.nodes, edges: template.edges } as unknown as Prisma.InputJsonValue,
        },
      });
      const execution = await prisma.execution.create({
        data: {
          workflowId: workflow.id,
          workflowVersionId: version.id,
          status: 'SUCCESS',
          startedAt: new Date(Date.now() - 60_000),
          completedAt: new Date(),
        },
      });
      for (const node of template.nodes) {
        await prisma.executionStep.create({
          data: {
            executionId: execution.id,
            nodeId: node.id,
            nodeType: node.type,
            status: 'SUCCESS',
            startedAt: new Date(Date.now() - 60_000),
            completedAt: new Date(),
          },
        });
      }
    }
  }
}
