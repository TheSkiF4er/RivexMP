// SPDX-License-Identifier: MPL-2.0
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseServerRegistration, isValidHost } from '../packages/protocol/dist/index.js';
import { RivexClient, RivexApiError } from '../packages/sdk-js/dist/index.js';

const registration = { name: 'Rivex Test', description: '', host: '127.0.0.1', port: 7788, maxPlayers: 128, tags: ['rp'] };
test('validates discovery registration without altering input', () => {
  assert.equal(parseServerRegistration(registration).ok, true);
  assert.equal(parseServerRegistration({ ...registration, port: 0 }).ok, false);
  assert.equal(parseServerRegistration({ ...registration, host: 'http://unsafe/' }).ok, false);
  assert.equal(parseServerRegistration({ ...registration, tags: ['\n'] }).ok, false);
  assert.equal(isValidHost('localhost'), true);
  assert.equal(isValidHost('a..b'), false);
});

test('SDK checks HTTP status and discovery version', async () => {
  const ok = new RivexClient({ baseUrl: 'http://localhost:3001/', fetchImpl: async () => new Response(JSON.stringify({ version: 1, servers: [] }), { status: 200 }) });
  assert.deepEqual(await ok.listServers(), []);
  const bad = new RivexClient({ baseUrl: 'http://localhost:3001', fetchImpl: async () => new Response('', { status: 503 }) });
  await assert.rejects(() => bad.listServers(), RivexApiError);
  const mismatch = new RivexClient({ baseUrl: 'http://localhost:3001', fetchImpl: async () => new Response(JSON.stringify({ version: 2, servers: [] }), { status: 200 }) });
  await assert.rejects(() => mismatch.listServers(), /Unsupported/);
});
