// SPDX-License-Identifier: MPL-2.0

/** HTTP discovery protocol; intentionally unrelated to GTA internals. */
export const DISCOVERY_API_VERSION = 1 as const;

export interface ServerRecord {
  id: string;
  name: string;
  description: string;
  host: string;
  port: number;
  players: number;
  maxPlayers: number;
  tags: string[];
  lastSeen: string;
}

export type ServerRegistration = Pick<
  ServerRecord,
  'name' | 'description' | 'host' | 'port' | 'maxPlayers' | 'tags'
>;

export interface ServerListResponse {
  version: typeof DISCOVERY_API_VERSION;
  servers: ServerRecord[];
}

export interface HealthResponse {
  status: 'ok';
  service: string;
  version: string;
}

export type ParseResult<T> = { ok: true; value: T } | { ok: false; error: string };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function inRangeInteger(value: unknown, low: number, high: number): value is number {
  return Number.isInteger(value) && (value as number) >= low && (value as number) <= high;
}

function cleanText(value: unknown, low: number, high: number): string | null {
  if (typeof value !== 'string') return null;
  const clean = value.trim();
  if (clean.length < low || clean.length > high || /[\x00-\x1f\x7f]/.test(clean)) return null;
  return clean;
}

/** IPv4, IPv6 or a well-formed DNS host; deliberately disallows URLs and whitespace. */
export function isValidHost(value: unknown): value is string {
  if (typeof value !== 'string' || value.length < 1 || value.length > 253) return false;
  if (/^[a-zA-Z0-9.-]+$/.test(value)) {
    if (value.startsWith('.') || value.endsWith('.') || value.includes('..')) return false;
    return value.split('.').every((label) => label.length > 0 && label.length <= 63 &&
      !label.startsWith('-') && !label.endsWith('-'));
  }
  // IPv6 literal (unbracketed). Full address syntax validation is done by UDP sockets.
  return value.includes(':') && /^[0-9a-fA-F:.]+$/.test(value) && value.length <= 45;
}

export function parseServerRegistration(input: unknown): ParseResult<ServerRegistration> {
  if (!isObject(input)) return { ok: false, error: 'Body must be an object' };
  const name = cleanText(input.name, 3, 64);
  const description = cleanText(input.description, 0, 240);
  if (name === null) return { ok: false, error: 'Invalid server name (3-64 chars)' };
  if (description === null) return { ok: false, error: 'Invalid description (0-240 chars)' };
  if (!isValidHost(input.host)) return { ok: false, error: 'Invalid hostname or IP address' };
  if (!inRangeInteger(input.port, 1, 65535)) return { ok: false, error: 'Invalid port' };
  if (!inRangeInteger(input.maxPlayers, 1, 2048)) return { ok: false, error: 'Invalid maxPlayers' };
  if (!Array.isArray(input.tags) || input.tags.length > 8 ||
      !input.tags.every((tag) => cleanText(tag, 1, 24) !== null)) {
    return { ok: false, error: 'Invalid tags (max 8, each 1-24 chars)' };
  }
  return {
    ok: true,
    value: {
      name,
      description,
      host: input.host,
      port: input.port,
      maxPlayers: input.maxPlayers,
      tags: input.tags.map((tag: string) => tag.trim())
    }
  };
}
