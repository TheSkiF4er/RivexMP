# Public protocol v1

All schemas here describe RivexMP **test infrastructure**, not GTA VI internals.

## HTTP discovery

- `GET /health` → `{ "status": "ok", "service": "rivexmp-control-api", "version": "0.1.0" }`.
- `GET /v1/servers` → `{ "version": 1, "servers": [ ... ] }`.
- `POST /v1/servers` → `201 { "server": { ... }, "heartbeatToken": "..." }`; requires `Authorization: Bearer <RIVEX_REGISTRY_TOKEN>`.
- `PATCH /v1/servers/:id/heartbeat` → `{ "server": { ... } }`; requires `Authorization: Bearer <heartbeatToken>`, body `{ "players": 0 }`.

A registered listing expires 90 seconds after creation or last heartbeat. The registry is **in memory**, and a restart removes all listings. Authenticated requests are designed for server-to-server use; **never** embed the admin token in the launcher or Console.

Example registration body:

```json
{
  "name": "RivexMP Local Mock",
  "description": "Standalone 2D simulation",
  "host": "127.0.0.1",
  "port": 7788,
  "maxPlayers": 64,
  "tags": ["development", "mock"]
}
```

## UDP mock-world protocol

Packet encoding is JSON over UDP, **maximum 1200 bytes** per datagram. Future binary packets will require a versioned migration.

Client → server:

```json
{"type":"hello","protocol":1,"nickname":"TestPlayer"}
{"type":"ping","nonce":123}
{"type":"move","dx":0.5,"dy":0.25}
{"type":"leave"}
```

Server → client:

```json
{"type":"welcome","player_id":1,"tick_hz":20}
{"type":"pong","nonce":123}
{"type":"snapshot","tick":42,"players":[{"id":1,"nickname":"TestPlayer","x":0.5,"y":0.25}]}
```

The server accepts a maximum of 64 test peers, expires idle sessions after 60 seconds, clamps movement inputs to `[-1, 1]` per message and only replicates at most 8 nearby entities per tick. This is an educational mock, not reliable movement verification: messages can be replayed and unauthenticated UDP addresses can be spoofed.
