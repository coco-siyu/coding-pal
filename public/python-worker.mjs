import { loadPyodide } from 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.mjs';

let runtime;
self.onmessage = async ({ data }) => {
  try {
    runtime ||= await loadPyodide();
    runtime.runPython('import io, sys\nsys.stdout = io.StringIO()\nsys.stderr = io.StringIO()');
    const result = await runtime.runPythonAsync(data.code);
    const stdout = runtime.runPython('sys.stdout.getvalue()');
    const stderr = runtime.runPython('sys.stderr.getvalue()');
    self.postMessage({ output: [stdout, stderr, result == null ? '' : String(result)].filter(Boolean).join('\n') || '(no output)' });
  } catch (error) {
    self.postMessage({ error: String(error.message || error) });
  }
};
