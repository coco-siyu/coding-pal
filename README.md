# Pairroom

A collaborative coding room for AI Dev Tools Zoomcamp Module 2. An interviewer creates a room, shares its URL, and everyone sees code and language changes live. Python runs in the browser through Pyodide; JavaScript runs in a browser worker. The server never executes submitted code.

## Requirements

- Node.js 22 or newer and npm
- Internet access on first Python run to load Pyodide from its CDN

## Run locally

```bash
npm ci
npm run dev
```

Open <http://localhost:5173>. The backend runs on port 3001. `npm run dev` uses `concurrently` to start both processes.

## Test and build

```bash
npm test
npm run build
```

The tests start a real HTTP/WebSocket server and exercise room creation, persistence, validation, and live synchronization. For a single-process production run:

```bash
npm run build
npm start
```

Open <http://localhost:3001>. Rooms persist in `data/pairroom.sqlite` by default; set `DATABASE_PATH` to change it. `PORT` changes the production port.

## Docker

```bash
docker build -t pairroom .
docker run --rm -p 3001:3001 -v "$(pwd)/data:/app/data" pairroom
```

The image uses `node:22-bookworm-slim` and serves frontend and backend from one container. Mount `data/` to keep rooms across restarts.

## How to demo

Create a room and copy its link. Open it in a second browser or private window. Type in either editor and switch between JavaScript and Python; both windows update. Click **Run code** to see browser-side output. Restart the server and reopen the room URL to test persistence.

## Limits

Edits use last-write-wins document updates rather than character-level conflict resolution. Simultaneous keystrokes can overwrite one another. JavaScript runs in a worker with network APIs disabled and a 3-second timeout; this is a browser-side convenience runner, not a security boundary for hostile code. Python loads Pyodide on demand. No authentication is included, so anyone with a room URL can edit it.

## Homework answers

See [docs/homework-answers.md](docs/homework-answers.md) for answers grounded in this implementation. Deployment is left blank until a real service and URL are verified.
