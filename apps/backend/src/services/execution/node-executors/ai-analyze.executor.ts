import { WorkflowNode } from '@flowops/schemas';
import { NodeExecutor } from '../node-executor';
import { ExecutionContext, NodeExecutionResult } from '../execution.types';
import { GeminiLlmClient, LlmClient } from '../../workflow-generator';
import { interpolateTemplate } from '../template.utils';

export class AiAnalyzeExecutor implements NodeExecutor {
  private llm: LlmClient;

  constructor(llm?: LlmClient) {
    this.llm = llm || new GeminiLlmClient();
  }

  async execute(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    try {
      const config = node.config as Record<string, unknown>;
      const rawPrompt = config.prompt as string;
      const outputKey = (config.outputKey as string) || 'ai_result';

      if (!rawPrompt) {
        return {
          status: 'FAILED',
          error: 'Missing prompt in AI Analyze configuration',
        };
      }

      const prompt = interpolateTemplate(rawPrompt, context.outputs);

      const systemPrompt = `You are an AI analysis node in a workflow. Perform the requested analysis based on the provided context. Return ONLY a valid JSON object with the results. Do not wrap it in markdown. Do not provide explanations.`;
      
      const userMessage = `
Prompt: ${prompt}

Context:
${JSON.stringify(context.outputs, null, 2)}
`;

      const rawOutput = await this.llm.generateText(systemPrompt, userMessage);
      
      let parsedOutput: any;
      try {
        // basic cleanup
        const clean = rawOutput.replace(/```(?:json)?\s*([\s\S]*?)```/, '$1').trim();
        parsedOutput = JSON.parse(clean);
      } catch (err) {
        // fallback if it didn't return json
        parsedOutput = { text: rawOutput };
      }

      return {
        status: 'SUCCESS',
        output: {
          [outputKey]: parsedOutput,
        },
      };
    } catch (error: any) {
      return {
        status: 'FAILED',
        error: error.message || 'Unknown AI execution error',
      };
    }
  }
}
