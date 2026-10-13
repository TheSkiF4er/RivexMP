// SPDX-License-Identifier: MPL-2.0
import { randomBytes, randomUUID, createHash, timingSafeEqual } from 'node:crypto';
import type { ServerRecord, ServerRegistration } from '@rivexmp/protocol';

type Entry = { record: ServerRecord; tokenHash: Buffer; expiresAt: number };

const hash = (token: string): Buffer => createHash('sha256').update(token).digest();

/** Ephemeral discovery registry. Use durable storage in a later release. */
export class ServerRegistry {
  private readonly entries = new Map<string, Entry>();
  constructor(private readonly ttlMs = 90_000, private readonly clock = () => Date.now()) {}

  register(input: ServerRegistration): { server: ServerRecord; heartbeatToken: string } {
    const now = this.clock();
    const heartbeatToken = randomBytes(32).toString('hex');
    const record: ServerRecord = {
      ...input,
      tags: [...input.tags],
      id: randomUUID(),
      players: 0,
      lastSeen: new Date(now).toISOString()
    };
    this.entries.set(record.id, { record, tokenHash: hash(heartbeatToken), expiresAt: now + this.ttlMs });
    return { server: { ...record, tags: [...record.tags] }, heartbeatToken };
  }

  heartbeat(id: string, heartbeatToken: string, players: number): ServerRecord | null {
    const entry = this.entries.get(id);
    if (!entry || entry.expiresAt <= this.clock()) return null;
    const supplied = hash(heartbeatToken);
    if (!timingSafeEqual(entry.tokenHash, supplied)) return null;
    if (!Number.isInteger(players) || players < 0 || players > entry.record.maxPlayers) return null;
    entry.record.players = players;
    entry.record.lastSeen = new Date(this.clock()).toISOString();
    entry.expiresAt = this.clock() + this.ttlMs;
    return { ...entry.record, tags: [...entry.record.tags] };
  }

  list(): ServerRecord[] {
    const now = this.clock();
    for (const [id, entry] of this.entries) {
      if (entry.expiresAt <= now) this.entries.delete(id);
    }
    return [...this.entries.values()]
      .map(({ record }) => ({ ...record, tags: [...record.tags] }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
}
