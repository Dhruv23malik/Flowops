/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * NOTE: This file uses `(db as any).workflow` casts because the Prisma client
 * was generated from the old schema (before the Phase 2 migration).
 * After running `prisma migrate dev`, the generated client will include
 * the new fields (name, passwordHash, status, nodes, edges, WorkflowStatus enum)
 * and these casts can be removed.
 */
import db from '../db';

export type WorkflowStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED';

export interface WorkflowListItem {
  id: string;
  name: string;
  description: string | null;
  status: WorkflowStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowDetail {
  id: string;
  name: string;
  description: string | null;
  status: WorkflowStatus;
  nodes: unknown;
  edges: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWorkflowData {
  name: string;
  description?: string;
  status?: WorkflowStatus;
  nodes?: unknown[];
  edges?: unknown[];
}

export interface UpdateWorkflowData {
  name?: string;
  description?: string;
  status?: WorkflowStatus;
  nodes?: unknown[];
  edges?: unknown[];
}

function makeAppError(message: string, statusCode: number, code: string): Error {
  const err = new Error(message) as Error & { statusCode: number; code: string };
  err.statusCode = statusCode;
  err.code = code;
  return err;
}

function toListItem(w: any): WorkflowListItem {
  return {
    id: w.id,
    name: w.name,
    description: w.description,
    status: (w.status ?? 'DRAFT') as WorkflowStatus,
    createdAt: w.createdAt,
    updatedAt: w.updatedAt,
  };
}

function toDetail(w: any): WorkflowDetail {
  return {
    id: w.id,
    name: w.name,
    description: w.description,
    status: (w.status ?? 'DRAFT') as WorkflowStatus,
    nodes: w.nodes ?? [],
    edges: w.edges ?? [],
    createdAt: w.createdAt,
    updatedAt: w.updatedAt,
  };
}

export async function listWorkflows(userId: string): Promise<WorkflowListItem[]> {
  const workflows = await (db as any).workflow.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      name: true,
      description: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  return (workflows as any[]).map(toListItem);
}

export async function getWorkflow(id: string, userId: string): Promise<WorkflowDetail> {
  const workflow = await (db as any).workflow.findFirst({
    where: { id, userId },
  });

  if (!workflow) {
    throw makeAppError('Workflow not found', 404, 'WORKFLOW_NOT_FOUND');
  }

  return toDetail(workflow);
}

export async function createWorkflow(
  userId: string,
  data: CreateWorkflowData,
): Promise<WorkflowDetail> {
  const workflow = await (db as any).workflow.create({
    data: {
      userId,
      name: data.name,
      description: data.description ?? null,
      status: data.status ?? 'DRAFT',
      nodes: (data.nodes ?? []) as object[],
      edges: (data.edges ?? []) as object[],
    },
  });
  return toDetail(workflow);
}

export async function updateWorkflow(
  id: string,
  userId: string,
  data: UpdateWorkflowData,
): Promise<WorkflowDetail> {
  // Verify ownership first
  const existing = await (db as any).workflow.findFirst({ where: { id, userId } });
  if (!existing) {
    throw makeAppError('Workflow not found', 404, 'WORKFLOW_NOT_FOUND');
  }

  const workflow = await (db as any).workflow.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.nodes !== undefined && { nodes: data.nodes as object[] }),
      ...(data.edges !== undefined && { edges: data.edges as object[] }),
    },
  });
  return toDetail(workflow);
}

export async function deleteWorkflow(id: string, userId: string): Promise<void> {
  const existing = await (db as any).workflow.findFirst({ where: { id, userId } });
  if (!existing) {
    throw makeAppError('Workflow not found', 404, 'WORKFLOW_NOT_FOUND');
  }

  await (db as any).workflow.delete({ where: { id } });
}
