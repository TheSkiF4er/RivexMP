// SPDX-License-Identifier: MIT
// Functional SDK demonstration, not an in-game script runtime.
import { RivexClient } from '@rivexmp/sdk-js';

const client = new RivexClient({ baseUrl: process.env.RIVEX_API_URL ?? 'http://127.0.0.1:3001' });
const servers = await client.listServers();
for (const server of servers) {
  console.log(`${server.name}: ${server.host}:${server.port} (${server.players}/${server.maxPlayers})`);
}
