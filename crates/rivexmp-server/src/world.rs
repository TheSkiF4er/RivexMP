// SPDX-License-Identifier: MPL-2.0
//! Server-authoritative 2D test world, independent from any commercial game.
use std::collections::HashMap;
use std::net::SocketAddr;
use std::time::{Duration, Instant};

use rivexmp_protocol::{ClientMessage, PlayerState, ServerMessage, WIRE_PROTOCOL_VERSION};
use crate::adapter::GameAdapter;

pub const TICK_HZ: u32 = 20;
const MAX_PEERS: usize = 64;
const IDLE_TIMEOUT: Duration = Duration::from_secs(60);
const VISIBLE_RADIUS_SQUARED: f32 = 150.0 * 150.0;
const MAX_VISIBLE_PEERS: usize = 8;

struct Peer {
    state: PlayerState,
    last_seen: Instant,
}

pub struct World {
    players: HashMap<SocketAddr, Peer>,
    next_id: u32,
    tick: u64,
}

impl Default for World {
    fn default() -> Self {
        Self { players: HashMap::new(), next_id: 1, tick: 0 }
    }
}

impl World {
    pub fn apply(&mut self, address: SocketAddr, message: ClientMessage) -> Option<ServerMessage> {
        match message {
            ClientMessage::Hello { protocol, nickname } => {
                if protocol != WIRE_PROTOCOL_VERSION {
                    return Some(Self::error("protocol_mismatch", "Unsupported protocol version"));
                }
                if !valid_nickname(&nickname) {
                    return Some(Self::error("invalid_nickname", "Nickname must be 2-24 printable characters"));
                }
                if let Some(existing) = self.players.get_mut(&address) {
                    existing.last_seen = Instant::now();
                    return Some(ServerMessage::Welcome { player_id: existing.state.id, tick_hz: TICK_HZ });
                }
                if self.players.len() >= MAX_PEERS {
                    return Some(Self::error("server_full", "Mock server is full"));
                }
                let id = self.next_id;
                self.next_id = self.next_id.wrapping_add(1).max(1);
                self.players.insert(address, Peer {
                    state: PlayerState { id, nickname, x: 0.0, y: 0.0 },
                    last_seen: Instant::now(),
                });
                Some(ServerMessage::Welcome { player_id: id, tick_hz: TICK_HZ })
            }
            ClientMessage::Ping { nonce } => {
                let peer = self.players.get_mut(&address)?;
                peer.last_seen = Instant::now();
                Some(ServerMessage::Pong { nonce })
            }
            ClientMessage::Move { dx, dy } => {
                let peer = self.players.get_mut(&address)?;
                peer.last_seen = Instant::now();
                // Demo only. A production server must validate timestamps, speed and authentication.
                if dx.is_finite() && dy.is_finite() && dx.abs() <= 1.0 && dy.abs() <= 1.0 {
                    peer.state.x = (peer.state.x + dx).clamp(-1000.0, 1000.0);
                    peer.state.y = (peer.state.y + dy).clamp(-1000.0, 1000.0);
                }
                None
            }
            ClientMessage::Leave => {
                self.players.remove(&address);
                None
            }
        }
    }

    pub fn next_snapshots(&mut self) -> Vec<(SocketAddr, ServerMessage)> {
        self.tick += 1;
        let now = Instant::now();
        self.players.retain(|_, peer| now.duration_since(peer.last_seen) < IDLE_TIMEOUT);
        self.players.iter().map(|(address, peer)| {
            let mut nearby: Vec<(f32, PlayerState)> = self.players.values()
                .filter_map(|other| {
                    let dx = peer.state.x - other.state.x;
                    let dy = peer.state.y - other.state.y;
                    let distance_squared = dx * dx + dy * dy;
                    (distance_squared <= VISIBLE_RADIUS_SQUARED).then_some((distance_squared, other.state.clone()))
                })
                .collect();
            nearby.sort_by(|a, b| a.0.total_cmp(&b.0).then_with(|| a.1.id.cmp(&b.1.id)));
            let players = nearby.into_iter().take(MAX_VISIBLE_PEERS).map(|(_, state)| state).collect();
            (*address, ServerMessage::Snapshot { tick: self.tick, players })
        }).collect()
    }

    pub fn peer_count(&self) -> usize { self.players.len() }

    fn error(code: &str, message: &str) -> ServerMessage {
        ServerMessage::Error { code: code.into(), message: message.into() }
    }
}

impl GameAdapter for World {
    fn apply(&mut self, peer: SocketAddr, message: ClientMessage) -> Option<ServerMessage> {
        World::apply(self, peer, message)
    }

    fn next_snapshots(&mut self) -> Vec<(SocketAddr, ServerMessage)> {
        World::next_snapshots(self)
    }

    fn peer_count(&self) -> usize {
        World::peer_count(self)
    }
}

fn valid_nickname(value: &str) -> bool {
    let count = value.chars().count();
    (2..=24).contains(&count) && value.len() <= 64 &&
        !value.chars().any(|c| c.is_control())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn addr(port: u16) -> SocketAddr { format!("127.0.0.1:{port}").parse().unwrap() }

    #[test]
    fn creates_session_and_applies_bounded_movement() {
        let mut world = World::default();
        let address = addr(5000);
        let hello = ClientMessage::Hello { protocol: 1, nickname: "Alice".into() };
        assert!(matches!(world.apply(address, hello), Some(ServerMessage::Welcome { .. })));
        world.apply(address, ClientMessage::Move { dx: 999.0, dy: 0.0 });
        let snapshots = world.next_snapshots();
        if let ServerMessage::Snapshot { players, .. } = &snapshots[0].1 {
            assert_eq!(players[0].x, 0.0);
        } else { panic!("expected snapshot"); }
        world.apply(address, ClientMessage::Move { dx: 0.75, dy: -1.0 });
        let snapshots = world.next_snapshots();
        if let ServerMessage::Snapshot { players, .. } = &snapshots[0].1 {
            assert_eq!(players[0].x, 0.75);
            assert_eq!(players[0].y, -1.0);
        } else { panic!("expected snapshot"); }
        world.apply(address, ClientMessage::Leave);
        assert_eq!(world.peer_count(), 0);
    }

    #[test]
    fn unknown_peer_cannot_move_or_ping() {
        let mut world = World::default();
        assert!(world.apply(addr(5001), ClientMessage::Ping { nonce: 1 }).is_none());
        assert_eq!(world.peer_count(), 0);
    }
}
