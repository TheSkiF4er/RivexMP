// SPDX-License-Identifier: MPL-2.0
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RivexClient } from '@rivexmp/sdk-js';
import type { ServerRecord } from '@rivexmp/sdk-js';
import './style.css';

const client = new RivexClient({ baseUrl: import.meta.env.VITE_RIVEX_API_URL ?? 'http://127.0.0.1:3001' });
function App() {
  const [servers, setServers] = useState<ServerRecord[]>([]);
  const [status, setStatus] = useState('Проверка подключения…');
  const [copied, setCopied] = useState<string | null>(null);
  async function load(signal?: AbortSignal) {
    try {
      const response = await client.listServers(signal);
      if (signal?.aborted) return;
      setServers(response); setStatus(`Найдено серверов: ${response.length}`);
    } catch {
      if (!signal?.aborted) setStatus('Не удалось подключиться к Control API');
    }
  }
  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, []);
  async function copy(address: string) {
    try { await navigator.clipboard.writeText(address); setCopied(address); }
    catch { setStatus(`Не удалось скопировать ${address}`); }
  }
  return <div className="shell"><aside className="rail"><div className="emblem">R<span>·</span></div><div className="rail-item active" title="Серверы">◈</div><div className="rail-item" title="Параметры (позднее)">⚙</div><div className="rail-version">0.1.0</div></aside>
    <div className="content"><header><div className="wordmark">RIVEX<span>MP</span></div><span className="alpha">DEVELOPER PREVIEW</span></header>
      <main><div className="pill">EARLY ACCESS / MOCK ENVIRONMENT</div><h1>Найди свой сервер<span>.</span></h1><p className="lead">Прототип лаунчера и каталога. Запуск GTA VI и интеграция с игровым клиентом пока не реализованы.</p>
        <div className="bar"><h2>Каталог серверов</h2><button onClick={() => void load()}>↻ Обновить</button></div>
        <p className="status">● {status}</p>
        {servers.length === 0 ? <div className="empty"><div className="symbol">◇</div><h3>Нет доступных серверов</h3><p>Запустите Control API и зарегистрируйте тестовый сервер.</p></div> : <div className="cards">{servers.map(s => { const address = `${s.host}:${s.port}`; return <article key={s.id}><div className="tag">{s.tags[0] ?? 'MULTIPLAYER'}</div><h3>{s.name}</h3><p>{s.description || 'Тестовый сервер RivexMP'}</p><div className="details"><strong>{s.players} / {s.maxPlayers} игроков</strong><code>{address}</code></div><button onClick={() => void copy(address)}>{copied === address ? 'Скопировано' : 'Копировать адрес'}</button></article>; })}</div>}
      </main><footer>Independent multiplayer framework · Not affiliated with Rockstar Games.</footer>
    </div>
  </div>;
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
