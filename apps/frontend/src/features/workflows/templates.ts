import type { WorkflowNode, WorkflowEdge } from '../../services/workflow.api';

export interface WorkflowTemplate {
  id: string;
  name: string;
  category: string;
  description: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

export const REAL_WORLD_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'feedback-triage',
    name: 'Customer Feedback Triage',
    category: 'Support & Ops',
    description: 'Analyze customer feedback with AI for sentiment & urgency, then route high-priority alerts.',
    nodes: [
      {
        id: 'trigger',
        type: 'manual_trigger',
        position: { x: 80, y: 180 },
        config: {
          sampleInput: {
            customer: 'Acme Corp',
            feedback: 'Checkout fails with HTTP 500 for the last hour — blocking orders!',
          },
        },
      },
      {
        id: 'analyze',
        type: 'ai_analyze',
        position: { x: 340, y: 180 },
        config: {
          prompt:
            'Analyze feedback from {{input.customer}}: "{{input.feedback}}". Return JSON with "summary", "sentiment" (positive|neutral|negative), and "urgency" (low|medium|high).',
          outputKey: 'triage',
        },
      },
      {
        id: 'is_urgent',
        type: 'condition',
        position: { x: 600, y: 180 },
        config: {
          field: 'triage.urgency',
          operator: '==',
          value: 'high',
        },
      },
      {
        id: 'save_urgent',
        type: 'save_result',
        position: { x: 860, y: 100 },
        config: { resultKey: 'triage' },
      },
      {
        id: 'save_normal',
        type: 'save_result',
        position: { x: 860, y: 270 },
        config: { resultKey: 'triage' },
      },
    ],
    edges: [
      { id: 'e1', source: 'trigger', target: 'analyze' },
      { id: 'e2', source: 'analyze', target: 'is_urgent' },
      { id: 'e3', source: 'is_urgent', target: 'save_urgent', sourceHandle: 'yes' },
      { id: 'e4', source: 'is_urgent', target: 'save_normal', sourceHandle: 'no' },
    ],
  },
  {
    id: 'ticket-responder',
    name: 'Support Ticket Auto-Drafter',
    category: 'Customer Success',
    description: 'Classify an incoming ticket by category and draft a polite, ready-to-send customer reply.',
    nodes: [
      {
        id: 'trigger',
        type: 'manual_trigger',
        position: { x: 80, y: 180 },
        config: {
          sampleInput: {
            subject: 'Invoice missing VAT number',
            message: 'Hi, we need our March invoice re-issued with VAT ID DE123456789 for accounting.',
          },
        },
      },
      {
        id: 'draft_reply',
        type: 'ai_analyze',
        position: { x: 340, y: 180 },
        config: {
          prompt:
            'Classify this support ticket (Subject: {{input.subject}}, Message: {{input.message}}) and draft a helpful reply. Return JSON with "category" (billing|technical|account), "priority" (low|medium|high), and "draftReply".',
          outputKey: 'ticket_result',
        },
      },
      {
        id: 'save',
        type: 'save_result',
        position: { x: 600, y: 180 },
        config: { resultKey: 'ticket_result' },
      },
    ],
    edges: [
      { id: 'e1', source: 'trigger', target: 'draft_reply' },
      { id: 'e2', source: 'draft_reply', target: 'save' },
    ],
  },
  {
    id: 'api-health-monitor',
    name: 'API Endpoint Check & AI Summary',
    category: 'DevOps & Monitoring',
    description: 'Fetch a live JSON API endpoint, summarize the payload with AI, and archive the report.',
    nodes: [
      {
        id: 'trigger',
        type: 'manual_trigger',
        position: { x: 80, y: 180 },
        config: {
          sampleInput: {
            url: 'https://jsonplaceholder.typicode.com/todos/1',
          },
        },
      },
      {
        id: 'fetch_api',
        type: 'http_request',
        position: { x: 340, y: 180 },
        config: {
          url: '{{input.url}}',
          method: 'GET',
          outputKey: 'api_data',
        },
      },
      {
        id: 'summarize',
        type: 'ai_analyze',
        position: { x: 600, y: 180 },
        config: {
          prompt:
            'Inspect this API response {{api_data}} and return JSON with "statusSummary" and "keyFields".',
          outputKey: 'report',
        },
      },
      {
        id: 'save',
        type: 'save_result',
        position: { x: 860, y: 180 },
        config: { resultKey: 'report' },
      },
    ],
    edges: [
      { id: 'e1', source: 'trigger', target: 'fetch_api' },
      { id: 'e2', source: 'fetch_api', target: 'summarize' },
      { id: 'e3', source: 'summarize', target: 'save' },
    ],
  },
  {
    id: 'meeting-action-items',
    name: 'Meeting Notes → Action Items',
    category: 'Productivity',
    description: 'Turn messy meeting notes into structured decisions, owners, and action items.',
    nodes: [
      {
        id: 'trigger',
        type: 'manual_trigger',
        position: { x: 80, y: 180 },
        config: {
          sampleInput: {
            notes: 'Sarah will ship the auth fix by Thursday. Raj needs to update the pricing page before Monday launch. Agreed to defer dark mode to Q2.',
          },
        },
      },
      {
        id: 'extract',
        type: 'ai_analyze',
        position: { x: 340, y: 180 },
        config: {
          prompt:
            'Extract structured takeaways from these meeting notes: "{{input.notes}}". Return JSON with "summary", "decisions" (array), and "actionItems" (array of {owner, task, due}).',
          outputKey: 'meeting_summary',
        },
      },
      {
        id: 'save',
        type: 'save_result',
        position: { x: 600, y: 180 },
        config: { resultKey: 'meeting_summary' },
      },
    ],
    edges: [
      { id: 'e1', source: 'trigger', target: 'extract' },
      { id: 'e2', source: 'extract', target: 'save' },
    ],
  },
];
