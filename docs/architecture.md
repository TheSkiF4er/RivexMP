# Architecture (v0.1.0)

```text
React Launcher (Tauri development shell)  React Console
                   \                        /
                     HTTPS / REST discovery
                              |
                  Fastify Control API (memory)
                              |
               Registered server records + TTL

Node.js mock-client -- JSON/UDP --> Rust Dedicated Server
                                     |
                            2D server-authoritative World
                                     |
                             Snapshot replication (20 Hz)
```

The control plane (`apps/control-api`) is deliberately isolated from the game data plane (`crates/rivexmp-server`). HTTP requests never enter the mock game's tick loop. Today the two are linked via `tools/register-server.mjs`, a stand-in for a future authenticated control-plane agent.

## Boundaries

- **Public contracts**: `@rivexmp/protocol` and the independently versioned Rust wire crate.
- **Administrative operations**: token-protected service registration. There is no user/account login in this release.
- **Data plane**: JSON/UDP for visibility and testing; it is **not** intended as the production packet encoding.
- **Game adapter**: no GTA VI adapter exists. Future adapters must depend on explicitly permitted interfaces, and must not shape the core before feasibility is established.
- **SDK**: `@rivexmp/sdk-js` wraps public HTTP discovery only; it does not execute RP resources.

## CI scope

GitHub Actions builds TypeScript packages and frontend static bundles, runs API and SDK tests, formats Rust sources, executes Rust unit tests and Clippy. Style enforcement is not yet a CI gate. Native Tauri binary packaging and live GTA VI compatibility are **not** covered.
