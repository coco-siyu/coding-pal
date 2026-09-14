# Pairroom agent notes

- Keep room code execution entirely in the browser; never evaluate submitted code on the server.
- Keep the HTTP and WebSocket message shapes aligned with `openapi.yaml` and `docs/realtime-protocol.md`.
- Preserve the one-command local workflow (`npm run dev`) and the integration test command (`npm test`).
- When changing server behavior, run tests; when changing UI, run the Vite build and check the page in a browser.
- Do not claim deployment or submission until a real URL has been verified.
