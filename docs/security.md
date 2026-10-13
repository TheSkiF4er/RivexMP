# Security model and explicit non-goals

## Implemented in v0.1.0

- Strong, required administrative bearer token for registration; non-placeholder startup validation.
- Random per-registration heartbeat token, stored as a SHA-256 hash, verified in constant time.
- Bounded input sizes, controlled discovery DTOs, explicit allowlisted CORS.
- Stale server expiry and bounded UDP messages, peer cap and simple movement constraints.
- Default listen addresses are loopback-only.

## Not implemented: DO NOT use in public production

- TLS termination and certificate rotation (required for public HTTP APIs).
- Account authentication, password hashing, RBAC, multi-tenant authorization and audit logs.
- Full rate limiting, bot protections, firewalls, abuse management and DDoS protection.
- Cryptographically authenticated game sessions, anti-replay window and encrypted UDP transport.
- Replay-resistant movement input timestamps, command scheduling and exploit-resistant physics.
- Signed updates, verified download manifests, hardened Tauri permissions and release signatures.
- Native game process integration or anti-cheat components.

Do not replace these missing layers with security-by-obscurity or device fingerprinting. Plan threat modeling before any public alpha.
