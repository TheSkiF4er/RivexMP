// SPDX-License-Identifier: MPL-2.0
//! Game-agnostic adapter boundary. Only the independent mock adapter exists today.
use std::net::SocketAddr;

use rivexmp_protocol::{ClientMessage, ServerMessage};

pub trait GameAdapter {
    fn apply(&mut self, peer: SocketAddr, message: ClientMessage) -> Option<ServerMessage>;
    fn next_snapshots(&mut self) -> Vec<(SocketAddr, ServerMessage)>;
    fn peer_count(&self) -> usize;
}
