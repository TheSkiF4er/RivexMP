# Security policy

RivexMP v0.1.0 is a **development prototype**. Do not expose its UDP test service or HTTP registration endpoint directly to the public internet. It does not provide player authentication, replay protection or production-grade DDoS mitigations.

Report vulnerabilities privately to project maintainers through a GitHub private vulnerability report once the repository is published. Do not include secret tokens or private hostnames in a public issue.

**Defaults:** bind to loopback, deny unauthorized server registration, use per-server heartbeat tokens, expire stale listings, restrict CORS, bound body sizes and UDP datagrams. These controls do not make the system production-ready.
