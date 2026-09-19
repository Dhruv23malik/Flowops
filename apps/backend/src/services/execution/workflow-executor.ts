import db from '../../db';
import { WorkflowGraph, validateWorkflowGraph, WorkflowNode, WorkflowEdge, StepStatus } from '@flowops/schemas';
import { ExecutionContext, NodeExecutionResult } from './execution.types';
import { NodeExecutor } from './node-executor';
import { ManualTriggerExecutor } from './node-executors/manual-trigger.executor';
import { AiAnalyzeExecutor } from './node-executors/ai-analyze.executor';
import { ConditionExecutor } from './node-executors/condition.executor';
import { SaveResultExecutor } from './node-executors/save-result.executor';
import { HttpRequestExecutor } from './node-executors/http-request.executor';
import { getIo } from '../socket';

export class WorkflowExecutor {
  private executors: Record<string, NodeExecutor>;

  constructor(aiLlmClient?: any) {
    this.executors = {
      manual_trigger: new ManualTriggerExecutor(),
      ai_analyze: new AiAnalyzeExecutor(aiLlmClient),
      condition: new ConditionExecutor(),
      save_result: new SaveResultExecutor(),
      http_request: new HttpRequestExecutor(),
    };
  }

  async run(workflowId: string, versionId: string, graph: WorkflowGraph, userId: string) {
    // 1. Validate workflow
    const validation = validateWorkflowGraph(graph);
    if (!validation.success) {
      throw new Error(`Invalid workflow graph: ${validation.errors.join(', ')}`);
    }

    // 2. Create Execution record
    const execution = await db.execution.create({
      data: {
        workflowId,
        workflowVersionId: versionId,
        status: 'RUNNING',
        startedAt: new Date(),
      },
    });

    try {
      getIo().to(`user:${userId}`).emit('execution:started', {
        executionId: execution.id,
        workflowId,
        status: 'RUNNING'
      });
    } catch (err) {
      console.warn('Could not emit execution:started', err);
    }

    try {
      const context: ExecutionContext = {
        input: {},
        outputs: {},
        variables: {},
      };

      // 3. Resolve starting node
      let currentNode = this.findStartingNode(graph);
      const visitedNodes = new Set<string>();
      
      while (currentNode) {
        // Safety net: prevent infinite loops from cyclic graphs
        if (visitedNodes.has(currentNode.id)) {
          throw new Error(`Cycle detected at node "${currentNode.id}". Execution aborted.`);
        }
        visitedNodes.add(currentNode.id);
        // Create step record
        const step = await db.executionStep.create({
          data: {
            executionId: execution.id,
            nodeId: currentNode.id,
            nodeType: currentNode.type,
            status: 'RUNNING',
            startedAt: new Date(),
            input: context.outputs as any, // snapshot of context before this step
          },
        });

        try {
          getIo().to(`user:${userId}`).emit('execution:step_started', {
            executionId: execution.id,
            step: {
              id: step.id,
              nodeId: currentNode.id,
              nodeType: currentNode.type,
              status: 'RUNNING'
            }
          });
        } catch (err) {
          console.warn('Could not emit execution:step_started', err);
        }

        const executor = this.executors[currentNode.type];
        if (!executor) {
          throw new Error(`Unsupported node type: ${currentNode.type}`);
        }

        // Execute node
        const result = await executor.execute(currentNode, context);

        // Update step record
        await db.executionStep.update({
          where: { id: step.id },
          data: {
            status: result.status,
            completedAt: new Date(),
            output: result.output as any,
            error: result.error,
          },
        });

        try {
          if (result.status === 'FAILED') {
            getIo().to(`user:${userId}`).emit('execution:step_failed', {
              executionId: execution.id,
              step: {
                id: step.id,
                nodeId: currentNode.id,
                nodeType: currentNode.type,
                status: 'FAILED',
                error: result.error ? { message: result.error } : undefined
              }
            });
          } else {
            getIo().to(`user:${userId}`).emit('execution:step_completed', {
              executionId: execution.id,
              step: {
                id: step.id,
                nodeId: currentNode.id,
                nodeType: currentNode.type,
                status: result.status as "SUCCESS" | "SKIPPED",
                duration: Date.now() - step.startedAt!.getTime()
              }
            });
          }
        } catch (err) {
          console.warn('Could not emit step completion event', err);
        }

        if (result.status === 'FAILED') {
          throw new Error(result.error || `Node ${currentNode.id} failed`);
        }

        // Merge output into context
        if (result.output) {
          context.outputs = { ...context.outputs, ...result.output };
        }

        // Find next node
        currentNode = this.findNextNode(currentNode, graph, result.branch);
      }

      // Mark execution successful
      await db.execution.update({
        where: { id: execution.id },
        data: {
          status: 'SUCCESS',
          completedAt: new Date(),
        },
      });

      try {
        getIo().to(`user:${userId}`).emit('execution:completed', {
          executionId: execution.id,
          workflowId,
          status: 'SUCCESS'
        });
      } catch (err) {
        console.warn('Could not emit execution:completed', err);
      }

      return await db.execution.findUnique({
        where: { id: execution.id },
        include: { steps: { orderBy: { createdAt: 'asc' } } }
      });

    } catch (error: any) {
      // Mark execution failed
      await db.execution.update({
        where: { id: execution.id },
        data: {
          status: 'FAILED',
          completedAt: new Date(),
        },
      });

      try {
        getIo().to(`user:${userId}`).emit('execution:failed', {
          executionId: execution.id,
          workflowId,
          status: 'FAILED'
        });
      } catch (err) {
        console.warn('Could not emit execution:failed', err);
      }

      return await db.execution.findUnique({
        where: { id: execution.id },
        include: { steps: { orderBy: { createdAt: 'asc' } } }
      });
    }
  }

  private findStartingNode(graph: WorkflowGraph): WorkflowNode | undefined {
    return graph.nodes.find(n => n.type === 'manual_trigger');
  }

  private findNextNode(currentNode: WorkflowNode, graph: WorkflowGraph, branch?: string): WorkflowNode | undefined {
    // Find all outgoing edges from the current node
    const outgoingEdges = graph.edges.filter(e => e.source === currentNode.id);

    if (outgoingEdges.length === 0) return undefined;

    // For condition nodes, branch dictates which edge to follow
    if (branch) {
      const edge = outgoingEdges.find(e => e.sourceHandle === branch);
      if (!edge) return undefined;
      return graph.nodes.find(n => n.id === edge.target);
    }

    // For linear nodes, just pick the first outgoing edge (builder enforces max 1 for non-conditions generally)
    const edge = outgoingEdges[0];
    return graph.nodes.find(n => n.id === edge.target);
  }
}
