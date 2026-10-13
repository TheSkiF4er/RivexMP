// SPDX-License-Identifier: MPL-2.0
import React, { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RivexClient } from '@rivexmp/sdk-js';
import type { ServerRecord } from '@rivexmp/sdk-js';
import './style.css';

const apiUrl = import.meta.env.VITE_RIVEX_API_URL ?? 'http://127.0.0.1:3001';
const client = new RivexClient({ baseUrl: apiUrl });

function App() {
  const [servers, setServers] = useState<ServerRecord[]>([]);
  const [health, setHealth] = useState<'loading' | 'online' | 'offline'>('loading');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    const [healthy, listed] = await Promise.allSettled([client.health(signal), client.listServers(signal)]);
    if (signal?.aborted) return;
    setHealth(healthy.status === 'fulfilled' ? 'online' : 'offline');
    if (listed.status === 'fulfilled') { setServers(listed.value); setError(null); }
    else { setServers([]); setError('Discovery API недоступен. Проверьте адрес и CORS.'); }
    setLoading(false);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    return () => controller.abort();
  }, [refresh]);

  const activePlayers = servers.reduce((sum, server) => sum + server.players, 0);
  return <div className="app">
    <header className="topbar"><span className="logo-mark">R<span>·</span></span><span className="brand">RIVEX<span>MP</span> <small>CONSOLE</small></span><span className="environment">DEVELOPMENT / v0.1.0</span></header>
    <main>
      <div className="eyebrow">PLATFORM OPERATIONS</div>
      <div className="heading"><div><h1>Server overview<span className="accent">.</span></h1><p>Наблюдение за тестовым реестром RivexMP. Управление серверами появится позже.</p></div><button type="button" onClick={() => void refresh()} disabled={loading}>{loading ? 'Загрузка…' : '↻ Обновить'}</button></div>
      <section className="stats">
        <div className="stat"><span className="stat-caption">CONTROL API</span><strong className={health === 'online' ? 'green' : 'red'}>● {health.toUpperCase()}</strong><small>{apiUrl}</small></div>
        <div className="stat"><span className="stat-caption">ACTIVE SERVERS</span><strong>{servers.length.toString().padStart(2, '0')}</strong><small>In-memory discovery</small></div>
        <div className="stat"><span className="stat-caption">CONNECTED PLAYERS</span><strong>{activePlayers.toString().padStart(2, '0')}</strong><small>Reported heartbeats</small></div>
      </section>
      <div className="section-heading"><h2>Discoverable servers</h2><span>PROTO / v1</span></div>
      {error && <div role="alert" className="error">{error}</div>}
      <section className="server-list">
        {servers.length === 0 ? <div className="empty"><div className="empty-icon">◈</div><h3>Пока нет зарегистрированных серверов</h3><p>Создайте запись через защищённый API и отправляйте heartbeat каждые 30 секунд.</p><code>POST /v1/servers</code></div> :
          servers.map(s => <article className="server" key={s.id}><div><h3>{s.name}</h3><p>{s.description || 'No description'}</p><div className="chips">{s.tags.map(t => <span key={t}>{t}</span>)}</div></div><div className="server-right"><strong>{s.players} <span>/ {s.maxPlayers}</span></strong><code>{s.host}:{s.port}</code></div></article>)}
      </section>
      <footer>RIVEXMP · Independent multiplayer platform prototype. No GTA VI integration.</footer>
    </main>
  </div>;
}

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
