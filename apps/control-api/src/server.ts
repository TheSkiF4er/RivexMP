// SPDX-License-Identifier: MPL-2.0
import { buildApp } from './app.js';

const host = process.env.API_HOST ?? '127.0.0.1';
const port = Number(process.env.API_PORT ?? '3001');
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid API_PORT');

const app = buildApp({
  registryToken: process.env.RIVEX_REGISTRY_TOKEN ?? '',
  allowedOrigins: (process.env.ALLOWED_ORIGIN ?? '').split(',').map((origin) => origin.trim()).filter(Boolean),
  logger: true
});

try {
  await app.listen({ host, port });
} catch (error) {
  app.log.error(error);
  process.exitCode = 1;
}
