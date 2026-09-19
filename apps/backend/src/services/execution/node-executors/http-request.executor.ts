import { WorkflowNode } from '@flowops/schemas';
import { NodeExecutor } from '../node-executor';
import { ExecutionContext, NodeExecutionResult } from '../execution.types';

export class HttpRequestExecutor implements NodeExecutor {
  private static readonly BLOCKED_HOSTNAME_PATTERNS = [
    /^localhost$/i,
    /^127\.\d+\.\d+\.\d+$/,
    /^0\.0\.0\.0$/,
    /^::1$/,
    /^\[::1\]$/,
    /^10\.\d+\.\d+\.\d+$/,
    /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/,
    /^192\.168\.\d+\.\d+$/,
    /^169\.254\.\d+\.\d+$/, // AWS metadata / link-local
  ];

  private isBlockedUrl(urlString: string): boolean {
    try {
      const parsed = new URL(urlString);
      return HttpRequestExecutor.BLOCKED_HOSTNAME_PATTERNS.some(p => p.test(parsed.hostname));
    } catch {
      return true; // Block unparseable URLs
    }
  }

  async execute(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<NodeExecutionResult> {
    const config = node.config as {
      url: string;
      method: 'GET' | 'POST' | 'PUT' | 'DELETE';
      headers?: string;
      body?: string;
      outputKey?: string;
    };

    if (!config.url) {
      return {
        status: 'FAILED',
        error: 'HTTP Request node missing URL configuration',
      };
    }

    if (this.isBlockedUrl(config.url)) {
      return {
        status: 'FAILED',
        error: 'Requests to internal or private network addresses are not allowed',
      };
    }

    try {
      // Parse headers
      let headers: Record<string, string> = {};
      if (config.headers) {
        try {
          headers = JSON.parse(config.headers);
        } catch (e) {
          return {
            status: 'FAILED',
            error: 'Failed to parse headers JSON',
          };
        }
      }

      // Prepare request options
      const reqOptions: RequestInit = {
        method: config.method || 'GET',
        headers,
      };

      if (config.body && config.method !== 'GET') {
        reqOptions.body = config.body;
        // Auto-set content type to JSON if not specified and body looks like JSON
        if (!headers['Content-Type'] && config.body.trim().startsWith('{')) {
          headers['Content-Type'] = 'application/json';
        }
      }

      const response = await fetch(config.url, reqOptions);
      
      let responseData: any;
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      if (!response.ok) {
        return {
          status: 'FAILED',
          error: `HTTP Error ${response.status}: ${
            typeof responseData === 'string' ? responseData : JSON.stringify(responseData)
          }`,
        };
      }

      const outputKey = config.outputKey || 'http_response';

      return {
        status: 'SUCCESS',
        output: {
          [outputKey]: responseData,
        },
      };
    } catch (error: any) {
      return {
        status: 'FAILED',
        error: error.message || 'Unknown HTTP Request error',
      };
    }
  }
}
