import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { WebSocket } from 'ws';
import { createPairroom } from '../server/app.js';

const temporaryDirectory = mkdtempSync(path.join(tmpdir(), 'pairroom-test-'));
const databasePath = path.join(temporaryDirectory, 'rooms.sqlite');
let service;
let base;

before(async () => {
  service = createPairroom({ databasePath, staticDir: path.join(temporaryDirectory, 'no-dist') });
  if (!service.server.listening) await new Promise((resolve) => service.server.once('listening', resolve));
  base = `http://127.0.0.1:${service.server.address().port}`;
});

after(async () => {
  await service.close();
  rmSync(temporaryDirectory, { recursive: true, force: true });
});

function socketFor(roomId) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(`${base.replace('http', 'ws')}/ws/rooms/${roomId}`);
    socket.once('open', () => resolve(socket));
    socket.once('error', reject);
  });
}

function nextMessage(socket, predicate, timeout = 2000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.off('message', onMessage); reject(new Error('Timed out waiting for WebSocket message')); }, timeout);
    function onMessage(data) {
      const message = JSON.parse(data.toString());
      if (!predicate(message)) return;
      clearTimeout(timer); socket.off('message', onMessage); resolve(message);
    }
    socket.on('message', onMessage);
  });
}

test('creates a room and returns 404 for unknown rooms', async () => {
  const response = await fetch(`${base}/api/rooms`, { method: 'POST' });
  assert.equal(response.status, 201);
  const room = await response.json();
  assert.match(room.id, /^[a-f0-9]{24}$/);
  assert.equal(room.language, 'javascript');
  assert.match(room.code, /greet/);
  const fetched = await fetch(`${base}/api/rooms/${room.id}`);
  assert.deepEqual(await fetched.json(), room);
  assert.equal((await fetch(`${base}/api/rooms/not-a-room`)).status, 404);
});

test('synchronizes two clients and persists the accepted edit', async () => {
  const room = await (await fetch(`${base}/api/rooms`, { method: 'POST' })).json();
  const first = await socketFor(room.id);
  const second = await socketFor(room.id);
  try {
    const received = nextMessage(second, (message) => message.type === 'room' && message.room.code === 'print(42)');
    first.send(JSON.stringify({ type: 'update', code: 'print(42)', language: 'python' }));
    const message = await received;
    assert.equal(message.room.language, 'python');
    assert.equal(message.room.revision, 1);
    assert.equal(message.participants, 2);
    const stored = await (await fetch(`${base}/api/rooms/${room.id}`)).json();
    assert.equal(stored.code, 'print(42)');
    assert.equal(stored.revision, 1);
  } finally { first.close(); second.close(); }
});

test('rejects invalid updates and keeps the previous code', async () => {
  const room = await (await fetch(`${base}/api/rooms`, { method: 'POST' })).json();
  const socket = await socketFor(room.id);
  try {
    const rejected = nextMessage(socket, (message) => message.type === 'error');
    socket.send(JSON.stringify({ type: 'update', code: 'evil', language: 'ruby' }));
    assert.equal((await rejected).error, 'Invalid update');
    const stored = await (await fetch(`${base}/api/rooms/${room.id}`)).json();
    assert.equal(stored.code, room.code);
  } finally { socket.close(); }
});
