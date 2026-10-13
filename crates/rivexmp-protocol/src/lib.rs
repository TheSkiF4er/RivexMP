// SPDX-License-Identifier: MPL-2.0
//! Versioned mock-world UDP protocol. NOT a GTA VI wire protocol.
use serde::{Deserialize, Serialize};

pub const WIRE_PROTOCOL_VERSION: u32 = 1;
pub const MAX_DATAGRAM_BYTES: usize = 1200;

#[derive(Debug, Clone, PartialEq, Deserialize, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ClientMessage {
    Hello { protocol: u32, nickname: String },
    Ping { nonce: u64 },
    Move { dx: f32, dy: f32 },
    Leave,
}

#[derive(Debug, Clone, PartialEq, Deserialize, Serialize)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum ServerMessage {
    Welcome { player_id: u32, tick_hz: u32 },
    Pong { nonce: u64 },
    Snapshot { tick: u64, players: Vec<PlayerState> },
    Error { code: String, message: String },
}

#[derive(Debug, Clone, PartialEq, Deserialize, Serialize)]
pub struct PlayerState {
    pub id: u32,
    pub nickname: String,
    pub x: f32,
    pub y: f32,
}

pub fn parse_client(data: &[u8]) -> Result<ClientMessage, serde_json::Error> {
    serde_json::from_slice(data)
}

pub fn encode_server(message: &ServerMessage) -> Option<Vec<u8>> {
    let bytes = serde_json::to_vec(message).ok()?;
    (bytes.len() <= MAX_DATAGRAM_BYTES).then_some(bytes)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hello_is_versioned() {
        let hello = br#"{"type":"hello","protocol":1,"nickname":"Tester"}"#;
        assert_eq!(
            parse_client(hello).unwrap(),
            ClientMessage::Hello { protocol: 1, nickname: "Tester".into() }
        );
    }

    #[test]
    fn rejects_oversized_packets() {
        let oversized = ServerMessage::Error {
            code: "big".into(),
            message: "a".repeat(1300),
        };
        assert!(encode_server(&oversized).is_none());
    }
}
