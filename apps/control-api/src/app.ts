// SPDX-License-Identifier: MPL-2.0
import { createHash, timingSafeEqual } from 'node:crypto';
import Fastify from 'fastify';
import { DISCOVERY_API_VERSION, parseServerRegistration } from '@rivexmp/protocol';
import { ServerRegistry } from './registry.js';

function constantTimeEqual(a: string, b: string): boolean {
  const left = createHash('sha256').update(a).digest();
  const right = createHash('sha256').update(b).digest();
  return timingSafeEqual(left, right);
}

function bearerToken(value: string | undefined): string | null {
  if (!value?.startsWith('Bearer ')) return null;
  const token = value.slice(7);
  return token.length > 0 && token.length <= 512 ? token : null;
}

export interface ApiOptions {
  registryToken: string;
  allowedOrigins?: string[];
  registry?: ServerRegistry;
  logger?: boolean;
}

export function buildApp(options: ApiOptions) {
  if (options.registryToken.length < 24 || options.registryToken === 'change-me-to-a-long-random-secret') {
    throw new Error('Set a strong RIVEX_REGISTRY_TOKEN (at least 24 characters)');
  }
  const registry = options.registry ?? new ServerRegistry();
  const allowedOrigins = new Set(options.allowedOrigins ?? []);
  const app = Fastify({ logger: options.logger ?? false, bodyLimit: 16 * 1024, trustProxy: false });

  app.addHook('onRequest', async (request, reply) => {
    const origin = request.headers.origin;
    if (origin && allowedOrigins.has(origin)) {
      reply.header('access-control-allow-origin', origin);
      reply.header('vary', 'Origin');
      reply.header('access-control-allow-methods', 'GET,POST,PATCH,OPTIONS');
      reply.header('access-control-allow-headers', 'Content-Type,Authorization');
    }
  });
  app.options('/*', async (_request, reply) => reply.code(204).send());

  app.get('/health', async () => ({ status: 'ok' as const, service: 'rivexmp-control-api', version: '0.1.0' }));
  app.get('/v1/servers', async () => ({ version: DISCOVERY_API_VERSION, servers: registry.list() }));

  app.post('/v1/servers', async (request, reply) => {
    const token = bearerToken(request.headers.authorization);
    if (!token || !constantTimeEqual(token, options.registryToken)) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    const parsed = parseServerRegistration(request.body);
    if (!parsed.ok) return reply.code(400).send({ error: parsed.error });
    const result = registry.register(parsed.value);
    reply.header('cache-control', 'no-store');
    return reply.code(201).send(result);
  });

  app.patch<{ Params: { id: string }; Body: { players?: unknown } }>(
    '/v1/servers/:id/heartbeat',
    async (request, reply) => {
      const token = bearerToken(request.headers.authorization);
      if (!token || typeof request.body?.players !== 'number') {
        return reply.code(400).send({ error: 'Invalid heartbeat' });
      }
      const record = registry.heartbeat(request.params.id, token, request.body.players);
      if (!record) return reply.code(404).send({ error: 'Unknown server, expired registration or invalid heartbeat' });
      return { server: record };
    }
  );
  return app;
}
