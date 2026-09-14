# Realtime protocol

Connect to `ws://HOST/ws/rooms/{id}` (or `wss://` over HTTPS). A missing room rejects the upgrade with 404.

- Server sends `{ "type": "room", "room": { "id", "code", "language", "revision", "updatedAt" }, "participants": 2 }` on connection and after each accepted edit.
- Server sends `{ "type": "presence", "participants": 2 }` when a peer joins or leaves.
- Client sends `{ "type": "update", "code": "...", "language": "javascript" }`. Language is `javascript` or `python`; code is at most 100,000 characters.
- Server sends `{ "type": "error", "error": "Invalid update" }` to the sender for malformed updates.

Each accepted edit replaces the whole shared document, increments `revision`, and is persisted to SQLite. This is last-write-wins synchronization.
