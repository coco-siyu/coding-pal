# Answers for the linked draft homework

The [linked file](https://github.com/coco-siyu/ai-dev-tools-zoomcamp/blob/main/cohorts/2026/02-development/homework.md) is marked **DRAFT** and differs from the live [Homework 2 form](https://courses.datatalks.club/ai-dev-tools-2026/homework/hw2). Use these answers only if you are explicitly completing that draft.

1. Initial implementation prompt: “Build a collaborative coding-interview web app. An interviewer should create a room and share an unguessable URL. Everyone in the room should edit the same code and see updates live. Support JavaScript and Python syntax highlighting and run code only in the browser. Use React/Vite for the frontend, Express/WebSockets for the backend, SQLite to persist rooms, an OpenAPI contract, integration tests, and a README with local commands. Do not execute participant code on the server.” This is a reconstruction of the implementation brief from the linked assignment and our chat, not a verbatim earlier user prompt.
2. Integration tests: `npm test`.
3. Both processes: `concurrently -k -n server,web "npm run dev:server" "npm run dev:web"` in `package.json`.
4. Syntax highlighting: `highlight.js`.
5. Python in browser: `Pyodide` (WebAssembly).
6. Docker base image: `node:22-bookworm-slim`.
7. Deployment service: pending; do not claim one until deployed and verified.
