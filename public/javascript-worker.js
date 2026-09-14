self.fetch = undefined;
self.XMLHttpRequest = undefined;
self.WebSocket = undefined;
self.importScripts = undefined;

self.onmessage = ({ data }) => {
  const lines = [];
  const format = (value) => typeof value === 'string' ? value : JSON.stringify(value);
  const console = {
    log: (...values) => lines.push(values.map(format).join(' ')),
    error: (...values) => lines.push(values.map(format).join(' ')),
    warn: (...values) => lines.push(values.map(format).join(' ')),
  };
  try {
    // The only evaluated source is the participant's code inside this browser worker.
    new Function('console', data.code)(console);
    self.postMessage({ output: lines.join('\n') || '(no output)' });
  } catch (error) {
    self.postMessage({ error: String(error.message || error) });
  }
};
