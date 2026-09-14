import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';

export const STARTERS = {
  javascript: `function greet(name) {\n  return \`Hello, \${name}!\`;\n}\n\nconsole.log(greet('world'));`,
  python: `def greet(name):\n    return f"Hello, {name}!"\n\nprint(greet("world"))`,
};

const ROOM_ID = /^[a-f0-9]{24}$/;
const MAX_CODE = 100_000;

export function createPairroom({ databasePath = process.env.DATABASE_PATH || 'data/pairroom.sqlite', staticDir = 'dist', port = 0, host = '127.0.0.1' } = {}) {
  if (databasePath !== ':memory:') fs.mkdirSync(path.dirname(databasePath), { recursive: true });
  const db = new DatabaseSync(databasePath);
  db.exec(`CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    language TEXT NOT NULL,
    revision INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL
  )`);

  const getRoom = db.prepare('SELECT id, code, language, revision, updated_at AS updatedAt FROM rooms WHERE id = ?');
  const insertRoom = db.prepare('INSERT INTO rooms (id, code, language, revision, updated_at) VALUES (?, ?, ?, 0, ?)');
  const updateRoom = db.prepare('UPDATE rooms SET code = ?, language = ?, revision = revision + 1, updated_at = ? WHERE id = ?');
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '120kb' }));

  app.post('/api/rooms', (_req, res) => {
    const id = crypto.randomBytes(12).toString('hex');
    insertRoom.run(id, STARTERS.javascript, 'javascript', new Date().toISOString());
    res.status(201).json(getRoom.get(id));
  });

  app.get('/api/rooms/:id', (req, res) => {
    if (!ROOM_ID.test(req.params.id)) return res.status(404).json({ error: 'Room not found' });
    const room = getRoom.get(req.params.id);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    res.json(room);
  });

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  const clients = new Map();
  const wss = new WebSocketServer({ noServer: true, maxPayload: 120_000 });

  function broadcast(roomId, message) {
    const data = JSON.stringify(message);
    for (const client of clients.get(roomId) || []) {
      if (client.readyState === WebSocket.OPEN) client.send(data);
    }
  }

  wss.on('connection', (socket, _request, roomId) => {
    const peers = clients.get(roomId) || new Set();
    peers.add(socket);
    clients.set(roomId, peers);
    socket.send(JSON.stringify({ type: 'room', room: getRoom.get(roomId), participants: peers.size }));
    broadcast(roomId, { type: 'presence', participants: peers.size });

    socket.on('message', (raw) => {
      let message;
      try { message = JSON.parse(raw.toString()); }
      catch { socket.send(JSON.stringify({ type: 'error', error: 'Invalid message' })); return; }
      if (message?.type !== 'update' || typeof message.code !== 'string' || message.code.length > MAX_CODE || !Object.hasOwn(STARTERS, message.language)) {
        socket.send(JSON.stringify({ type: 'error', error: 'Invalid update' }));
        return;
      }
      updateRoom.run(message.code, message.language, new Date().toISOString(), roomId);
      broadcast(roomId, { type: 'room', room: getRoom.get(roomId), participants: peers.size });
    });

    socket.on('close', () => {
      peers.delete(socket);
      if (peers.size === 0) clients.delete(roomId);
      else broadcast(roomId, { type: 'presence', participants: peers.size });
    });
  });

  if (fs.existsSync(staticDir)) {
    app.use(express.static(staticDir));
    app.get('/{*path}', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/ws')) return next();
      res.sendFile(path.resolve(staticDir, 'index.html'));
    });
  }

  const server = app.listen(port, host);
  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, 'http://localhost');
    const match = /^\/ws\/rooms\/([a-f0-9]{24})$/.exec(url.pathname);
    if (!match || !getRoom.get(match[1])) {
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(request, socket, head, (webSocket) => wss.emit('connection', webSocket, request, match[1]));
  });

  return {
    app,
    server,
    async close() {
      for (const peerSet of clients.values()) for (const socket of peerSet) socket.terminate();
      await new Promise((resolve) => wss.close(resolve));
      await new Promise((resolve) => server.close(resolve));
      db.close();
    },
  };
}
