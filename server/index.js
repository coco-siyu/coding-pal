import { createPairroom } from './app.js';

const port = Number(process.env.PORT || 3001);
const { server } = createPairroom({ port, host: '0.0.0.0' });
server.on('listening', () => console.log(`Pairroom listening on http://localhost:${port}`));
