// SPDX-License-Identifier: Apache-2.0
import { DISCOVERY_API_VERSION } from '@rivexmp/protocol';
import type { HealthResponse, ServerListResponse, ServerRecord } from '@rivexmp/protocol';

export type { HealthResponse, ServerListResponse, ServerRecord } from '@rivexmp/protocol';

export class RivexApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = 'RivexApiError';
  }
}

export interface RivexClientOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

/** Unprivileged browser-safe SDK; administrative secrets never reach the client. */
export class RivexClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: RivexClientOptions) {
    const url = new URL(options.baseUrl);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('HTTP(S) is required');
    this.baseUrl = url.toString().replace(/\/$/, '');
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  private async get<T>(route: string, signal?: AbortSignal): Promise<T> {
    const response = await this.fetchImpl(`${this.baseUrl}${route}`, {
      method: 'GET',
      headers: { accept: 'application/json' },
      ...(signal ? { signal } : {})
    });
    if (!response.ok) throw new RivexApiError(response.status, `API returned HTTP ${response.status}`);
    return response.json() as Promise<T>;
  }

  health(signal?: AbortSignal): Promise<HealthResponse> {
    return this.get<HealthResponse>('/health', signal);
  }

  async listServers(signal?: AbortSignal): Promise<ServerRecord[]> {
    const result = await this.get<ServerListResponse>('/v1/servers', signal);
    if (result.version !== DISCOVERY_API_VERSION || !Array.isArray(result.servers)) {
      throw new Error('Unsupported discovery protocol response');
    }
    return result.servers;
  }
}
