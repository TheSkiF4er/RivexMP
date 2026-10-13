// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../dist/app.js';
import { ServerRegistry } from '../dist/registry.js';

const ADMIN = 'test-admin-token-with-minimum-32-characters';
const SAMPLE = {
  name: 'Local Test Server', description: 'Mock world', host: '127.0.0.1',
  port: 7788, maxPlayers: 64, tags: ['development']
};

test('health, protected registration, heartbeat and expiry', async (t) => {
  let now = Date.parse('2026-01-01T00:00:00.000Z');
  const app = buildApp({ registryToken: ADMIN, registry: new ServerRegistry(90_000, () => now) });
  t.after(() => app.close());
  const health = await app.inject({ method: 'GET', url: '/health' });
  assert.equal(health.statusCode, 200);
  assert.equal(health.json().status, 'ok');
  assert.deepEqual((await app.inject({ method: 'GET', url: '/v1/servers' })).json().servers, []);
  assert.equal((await app.inject({ method: 'POST', url: '/v1/servers', payload: SAMPLE })).statusCode, 401);
  assert.equal((await app.inject({ method: 'POST', url: '/v1/servers', headers: { authorization: `Bearer ${ADMIN}` }, payload: { ...SAMPLE, port: 70000 } })).statusCode, 400);
  const created = await app.inject({ method: 'POST', url: '/v1/servers', headers: { authorization: `Bearer ${ADMIN}` }, payload: SAMPLE });
  assert.equal(created.statusCode, 201);
  const { server, heartbeatToken } = created.json();
  assert.ok(heartbeatToken.length >= 32);
  assert.equal((await app.inject({ method: 'GET', url: '/v1/servers' })).json().servers.length, 1);
  assert.equal((await app.inject({ method: 'PATCH', url: `/v1/servers/${server.id}/heartbeat`, headers: { authorization: 'Bearer invalid' }, payload: { players: 5 } })).statusCode, 404);
  const beat = await app.inject({ method: 'PATCH', url: `/v1/servers/${server.id}/heartbeat`, headers: { authorization: `Bearer ${heartbeatToken}` }, payload: { players: 5 } });
  assert.equal(beat.json().server.players, 5);
  now += 91_000;
  assert.equal((await app.inject({ method: 'GET', url: '/v1/servers' })).json().servers.length, 0);
});
