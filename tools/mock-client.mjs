// SPDX-License-Identifier: MPL-2.0
/** Minimal real UDP client for the independent RivexMP test world. */
import dgram from 'node:dgram';
import { argv } from 'node:process';

const host = argv[2] ?? '127.0.0.1';
const port = Number(argv[3] ?? 7788);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid UDP port');
const socket = dgram.createSocket(host.includes(':') ? 'udp6' : 'udp4');
let accepted = false;
let snapshots = 0;
function send(packet) { socket.send(Buffer.from(JSON.stringify(packet)), port, host); }
socket.on('message', (bytes) => {
  let packet;
  try { packet = JSON.parse(bytes.toString('utf8')); } catch { return; }
  if (packet.type === 'welcome') {
    accepted = true;
    console.log(`Joined independent RivexMP mock world as player ${packet.player_id}`);
    send({ type: 'ping', nonce: 12345 });
    send({ type: 'move', dx: 0.5, dy: 0.25 });
  } else if (packet.type === 'pong') {
    console.log('Ping response:', packet.nonce);
  } else if (packet.type === 'snapshot') {
    snapshots++;
    if (snapshots <= 3) console.log(`Tick ${packet.tick}:`, packet.players);
    if (snapshots === 3) {
      send({ type: 'leave' });
      socket.close();
    }
  } else if (packet.type === 'error') {
    console.error('Server error:', packet);
    process.exitCode = 1;
    socket.close();
  }
});
socket.on('error', (error) => { console.error(error.message); process.exitCode = 1; socket.close(); });
socket.on('listening', () => {
  send({ type: 'hello', protocol: 1, nickname: 'MockPlayer' });
});
socket.bind();
setTimeout(() => {
  if (!accepted || snapshots < 3) { console.error('Timed out waiting for mock server'); process.exitCode = 1; socket.close(); }
}, 5000).unref();
