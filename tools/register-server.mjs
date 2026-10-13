// SPDX-License-Identifier: MPL-2.0
/** Register a local mock server with the ephemeral discovery API and refresh its TTL. */
const url = process.env.RIVEX_API_URL ?? 'http://127.0.0.1:3001';
const adminToken = process.env.RIVEX_REGISTRY_TOKEN;
if (!adminToken || adminToken.length < 24) throw new Error('Set RIVEX_REGISTRY_TOKEN in the environment');
const server = {
  name: process.env.RIVEX_SERVER_NAME ?? 'RivexMP Local Mock',
  description: 'Independent multiplayer 2D test world (not GTA VI)',
  host: process.env.RIVEX_SERVER_HOST ?? '127.0.0.1',
  port: Number(process.env.RIVEX_SERVER_PORT ?? 7788),
  maxPlayers: 64,
  tags: ['dev', 'mock']
};
async function request(route, method, token, body) {
  const response = await fetch(`${url}${route}`, {
    method,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error(`${method} ${route}: HTTP ${response.status} / ${await response.text()}`);
  return response.json();
}
const registered = await request('/v1/servers', 'POST', adminToken, server);
const { server: created, heartbeatToken } = registered;
console.log(`Registered ${created.name} (${created.id}) at ${created.host}:${created.port}`);
async function beat() {
  await request(`/v1/servers/${created.id}/heartbeat`, 'PATCH', heartbeatToken, { players: 0 });
}
const timer = setInterval(() => beat().catch(error => { console.error(error.message); clearInterval(timer); process.exitCode = 1; }), 30_000);
process.on('SIGINT', () => { clearInterval(timer); process.exit(0); });
