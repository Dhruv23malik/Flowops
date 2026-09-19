import { WorkflowNode } from '@flowops/schemas';
import { NodeExecutor } from '../node-executor';
import { ExecutionContext, NodeExecutionResult } from '../execution.types';
import dns from 'node:dns';
import { isIP } from 'node:net';

export class HttpRequestExecutor implements NodeExecutor {
  /**
   * Patterns matching private/reserved IP addresses.
   * Applied against both the raw hostname AND every resolved IP.
   */
  private static readonly BLOCKED_IP_PATTERNS = [
    /^127\.\d+\.\d+\.\d+$/,           // IPv4 loopback
    /^0\.0\.0\.0$/,                    // Unspecified
    /^10\.\d+\.\d+\.\d+$/,            // RFC 1918
    /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/, // RFC 1918
    /^192\.168\.\d+\.\d+$/,           // RFC 1918
    /^169\.254\.\d+\.\d+$/,           // Link-local / AWS metadata
    /^::1$/,                           // IPv6 loopback
    /^\[::1\]$/,                       // IPv6 loopback (bracketed)
    /^::ffff:127\.\d+\.\d+\.\d+$/i,   // IPv4-mapped IPv6 loopback
    /^::ffff:10\.\d+\.\d+\.\d+$/i,    // IPv4-mapped RFC 1918
    /^::ffff:172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/i,
    /^::ffff:192\.168\.\d+\.\d+$/i,
    /^::ffff:169\.254\.\d+\.\d+$/i,
    /^fe80:/i,                         // IPv6 link-local
    /^fc00:/i,                         // IPv6 ULA
    /^fd/i,                            // IPv6 ULA
  ];

  private static readonly BLOCKED_HOSTNAMES = [
    /^localhost$/i,
    /^.*\.localhost$/i,
  ];

  /** Check if a single IP string matches any private pattern */
  static isPrivateIp(ip: string): boolean {
    return HttpRequestExecutor.BLOCKED_IP_PATTERNS.some(p => p.test(ip));
  }

  /** Check if a hostname is blocklisted (localhost variants) */
  private static isBlockedHostname(hostname: string): boolean {
    return HttpRequestExecutor.BLOCKED_HOSTNAMES.some(p => p.test(hostname));
  }

  /**
   * Validates a URL is safe to fetch:
   * 1. Reject blocklisted hostnames (localhost etc.)
   * 2. If hostname is already a literal IP, check it directly.
   * 3. Otherwise, DNS-resolve the hostname and check every resolved IP.
   */
  async isBlockedUrl(urlString: string): Promise<boolean> {
    let parsed: URL;
    try {
      parsed = new URL(urlString);
    } catch {
      return true; // Block unparseable URLs
    }

    const hostname = parsed.hostname;

    // 1. Blocked hostname patterns (localhost etc.)
    if (HttpRequestExecutor.isBlockedHostname(hostname)) {
      return true;
    }

    // 2. If hostname is a literal IP, check directly
    if (isIP(hostname)) {
      return HttpRequestExecutor.isPrivateIp(hostname);
    }

    // 3. DNS-resolve the hostname and check every IP
    try {
      const resolver = new dns.promises.Resolver();
      const addresses = await resolver.resolve4(hostname).catch(() => [] as string[]);
      const addresses6 = await resolver.resolve6(hostname).catch(() => [] as string[]);
      const allIps = [...addresses, ...addresses6];

      // If no IPs resolve, block (can't verify safety)
      if (allIps.length === 0) {
        return true;
      }

      return allIps.some(ip => HttpRequestExecutor.isPrivateIp(ip));
    } catch {
      return true; // DNS failure → block
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

    if (await this.isBlockedUrl(config.url)) {
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

      // Prepare request options — redirect: 'manual' prevents following
      // 3xx redirects to internal hosts that would bypass the SSRF check
      const reqOptions: RequestInit = {
        method: config.method || 'GET',
        headers,
        redirect: 'manual',
      };

      if (config.body && config.method !== 'GET') {
        reqOptions.body = config.body;
        // Auto-set content type to JSON if not specified and body looks like JSON
        if (!headers['Content-Type'] && config.body.trim().startsWith('{')) {
          headers['Content-Type'] = 'application/json';
        }
      }

      const response = await fetch(config.url, reqOptions);

      // Manual redirect handling: report redirect as a controlled failure
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get('location');
        return {
          status: 'FAILED',
          error: `HTTP ${response.status} redirect to ${location ?? 'unknown'}. Redirects are disabled for security.`,
        };
      }
      
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
