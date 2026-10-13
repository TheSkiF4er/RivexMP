// SPDX-License-Identifier: MPL-2.0
mod adapter;
mod world;

use adapter::GameAdapter;
use std::net::SocketAddr;
use std::time::Duration;
use rivexmp_protocol::{encode_server, parse_client, MAX_DATAGRAM_BYTES};
use tokio::net::UdpSocket;
use tokio::time::{self, MissedTickBehavior};
use world::{World, TICK_HZ};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let address: SocketAddr = std::env::var("RIVEX_UDP_ADDR")
        .unwrap_or_else(|_| "127.0.0.1:7788".into())
        .parse()?;
    let socket = UdpSocket::bind(address).await?;
    println!("RivexMP mock Dedicated Server at {address} / {TICK_HZ} Hz / protocol v1");
    println!("This is an independent 2D mock world, NOT a GTA VI server.");
    let mut world: Box<dyn GameAdapter + Send> = Box::new(World::default());
    let mut buffer = [0u8; MAX_DATAGRAM_BYTES + 1];
    let mut ticker = time::interval(Duration::from_secs_f64(1.0 / f64::from(TICK_HZ)));
    ticker.set_missed_tick_behavior(MissedTickBehavior::Skip);

    loop {
        tokio::select! {
            received = socket.recv_from(&mut buffer) => {
                let (size, peer) = received?;
                if size > MAX_DATAGRAM_BYTES { continue; }
                let Ok(message) = parse_client(&buffer[..size]) else { continue; };
                if let Some(response) = world.apply(peer, message) {
                    if let Some(packet) = encode_server(&response) { let _ = socket.send_to(&packet, peer).await; }
                }
            }
            _ = ticker.tick() => {
                for (peer, mut response) in world.next_snapshots() {
                    // A snapshot must always fit into one UDP packet in this prototype.
                    loop {
                        if let Some(packet) = encode_server(&response) {
                            let _ = socket.send_to(&packet, peer).await;
                            break;
                        }
                        if let rivexmp_protocol::ServerMessage::Snapshot { players, .. } = &mut response {
                            if players.len() > 1 { players.pop(); continue; }
                        }
                        break;
                    }
                }
            }
            _ = tokio::signal::ctrl_c() => {
                println!("Shutting down mock Dedicated Server ({} peers)", world.peer_count());
                break;
            }
        }
    }
    Ok(())
}
