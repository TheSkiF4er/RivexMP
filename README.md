# RivexMP

**Independent open-source multiplayer platform prototype** — architecture inspired by the developer experience of RAGE:MP and alt:V. The long-term GTA VI compatibility goal is **not implemented, authorized, or guaranteed**.

> RivexMP is not affiliated with, endorsed by, or licensed by Rockstar Games or Take-Two Interactive. This repository does not contain GTA game files, game patches, process injection, bypasses, hooks, or reversed GTA internals.

## Status: v0.1.0 / foundation

**Implemented:**

- Rust 20 Hz Dedicated Server with independent 2D mock world; UDP hello, ping, bounded movement and snapshot broadcasts
- Server-authoritative test movement, connection limits, liveness timeout, bounded datagrams and nearby-entity filtering
- TypeScript HTTP discovery protocol and JavaScript/TypeScript SDK
- Fastify Control API with protected registration, per-server heartbeat credential, TTL and allowlisted CORS
- React/Vite browser-based Console to inspect discovered servers
- React/Vite UI in a Tauri 2 desktop shell (development scaffold, not a distributable binary)
- Unit tests, GitHub Actions CI, initial security/legal docs and OSS license separation

**Not yet implemented:** GTA VI integration, real game client, secure production multiplayer transport, account authentication, persistent registry, RP scripting runtime, C#, voice, anti-cheat, server admin actions, updates/CDN, signed launcher builds and marketplace.

## Prerequisites

- Node.js 22+ and npm 10+
- Rust stable 1.82+ (`cargo`) to run the UDP Dedicated Server
- For the native Tauri desktop window: the additional OS toolchain / webview dependencies from the [Tauri setup guide](https://v2.tauri.app/start/prerequisites/)

## Start locally

```bash
# Terminal 0, from the repository root:
cp .env.example .env
# IMPORTANT: replace RIVEX_REGISTRY_TOKEN in .env with a real secret:
# openssl rand -hex 32
npm install
npm run build
```

Run these in separate terminals from repository root:

```bash
# 1. HTTP discovery API (reads root .env)
npm run dev:api

# 2. Rust independent mock-game UDP server
cargo run -p rivexmp-server

# 3. Register the UDP server in discovery and renew every 30 seconds
node --env-file=.env tools/register-server.mjs

# 4. React browser Console, http://127.0.0.1:5173
npm run dev:console

# 5. Launcher browser preview, http://127.0.0.1:1420
npm run dev:launcher

# 6. Separate mock player connects to the UDP test world
node tools/mock-client.mjs
```

To run the desktop Tauri development window, use `npm run tauri:dev` **instead of** `npm run dev:launcher`; both use port 1420.

The mock world and discovery API are **separate processes**: the UDP server does not register itself in this initial version. The provided registration helper maintains a demonstration listing and reports `0` players; dynamic player count integration is planned.

## Tests

```bash
npm test
cargo test --workspace
cargo fmt --all
cargo clippy --workspace --all-targets -- -D warnings
```

`npm test` assumes dependencies were installed. Native Tauri compilation is not part of the initial CI (it needs OS-specific toolchains). See [CI scope](docs/architecture.md).

## Repository layout

```text
apps/
  control-api/              Fastify HTTP service and registry tests
  console/                  Read-only server dashboard (React)
  launcher/                 Desktop shell + browser preview (Tauri 2)
packages/
  protocol/                 TypeScript discovery DTOs and validators
  sdk-js/                   Public JS/TS HTTP SDK (Apache-2.0)
crates/
  rivexmp-protocol/         Rust UDP test protocol
  rivexmp-server/           Rust dedicated 2D mock-world server
tools/
  register-server.mjs       Authenticated discovery registration helper
  mock-client.mjs           Functional UDP loopback player
docs/                       Architecture, protocol, security, roadmap, legal
examples/basic-resource/    MIT-licensed discovery SDK example
```

## API example

```bash
curl http://127.0.0.1:3001/health
curl http://127.0.0.1:3001/v1/servers
```

**Authenticated registration**:

```bash
curl -X POST http://127.0.0.1:3001/v1/servers \
  -H "Authorization: Bearer $RIVEX_REGISTRY_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Local Development","description":"Mock world","host":"127.0.0.1","port":7788,"maxPlayers":64,"tags":["dev"]}'
```

The response contains a unique heartbeat token. Keep both administrative and heartbeat tokens server-side. See [protocol](docs/protocol.md).

## Licensing

| Part | License |
| --- | --- |
| Core, apps, protocol, docs | [MPL-2.0](LICENSE) |
| JavaScript SDK | [Apache-2.0](packages/sdk-js/LICENSE) |
| Demonstration resource | [MIT](examples/basic-resource/LICENSE) |

See [LICENSES.md](LICENSES.md) and [LEGAL.md](docs/legal.md). Contributors retain their copyrights and grant rights under the applicable file's license. Separate distribution/branding terms are not included.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md). No modification to commercial game binaries, DRM or anti-cheat is accepted into this repository.
