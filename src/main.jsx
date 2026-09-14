import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import python from 'highlight.js/lib/languages/python';
import './styles.css';

hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('python', python);

const STARTERS = {
  javascript: `function greet(name) {\n  return \`Hello, \${name}!\`;\n}\n\nconsole.log(greet('world'));`,
  python: `def greet(name):\n    return f"Hello, {name}!"\n\nprint(greet("world"))`,
};

function Icon({ name, size = 18 }) {
  const paths = {
    arrow: <><path d="M4 12h16M13 5l7 7-7 7" /></>,
    copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></>,
    play: <path d="m8 5 11 7-11 7V5Z" />,
    link: <><path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.2 1.2" /><path d="M14 11a5 5 0 0 0-7.1 0l-2 2A5 5 0 0 0 12 20.1l1.2-1.2" /></>,
    code: <><path d="m8 8-4 4 4 4m8-8 4 4-4 4m-3-13-2 14" /></>,
    chevron: <path d="m6 9 6 6 6-6" />,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

function Brand() {
  return <a className="brand" href="/" aria-label="Pairroom home"><span className="brand-mark"><span></span><span></span></span><span>pairroom<span className="brand-dot">.</span></span></a>;
}

function Home() {
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  async function create() {
    setCreating(true); setError('');
    try {
      const response = await fetch('/api/rooms', { method: 'POST' });
      if (!response.ok) throw new Error('Room creation failed. Check that the server is running.');
      const room = await response.json();
      window.location.href = `/room/${room.id}`;
    } catch (cause) { setError(cause.message); setCreating(false); }
  }
  return <div className="home-screen">
    <header className="site-header"><Brand /><span className="header-label">A better place to think together</span></header>
    <main className="home-main">
      <section className="home-copy">
        <div className="eyebrow"><span className="eyebrow-line" /> The shared coding room</div>
        <h1>Good ideas<br />happen <em>together.</em></h1>
        <p>One link. One editor. A clearer way to work through a coding problem with someone else, wherever they are.</p>
        <button className="primary-button create-button" onClick={create} disabled={creating}>{creating ? 'Creating room…' : 'Create a room'}<Icon name="arrow" size={20} /></button>
        {error && <p className="inline-error" role="alert">{error}</p>}
        <div className="home-note"><span className="note-dot" /> No sign-up needed. Just share the link.</div>
      </section>
      <section className="preview" aria-label="App preview">
        <div className="preview-window">
          <div className="preview-top"><span className="preview-dots"><i /><i /><i /></span><span>interview.js</span><span>JS</span></div>
          <div className="preview-code"><div><span>01</span><b className="token-purple">function</b> <b className="token-blue">solve</b>(problem) {'{'}</div><div><span>02</span>  <b className="token-purple">const</b> idea = <b className="token-orange">'let’s figure it out'</b>;</div><div><span>03</span>  <b className="token-purple">return</b> idea;</div><div><span>04</span>{'}'}</div><div><span>05</span></div><div><span>06</span>console.<b className="token-blue">log</b>(<b className="token-blue">solve</b>());</div></div>
          <div className="preview-bottom"><span className="avatar-stack"><i>A</i><i>B</i></span><span>Two minds, one workspace</span><span className="live-signal" /></div>
        </div>
        <div className="preview-caption">BUILT FOR THE MOMENT AN IDEA CLICKS.</div>
      </section>
    </main>
    <footer className="home-footer"><span>PAIRROOM / 2026</span><span>Make space for the answer.</span></footer>
  </div>;
}

function runInWorker(language, code, setOutput, setRunning) {
  const worker = new Worker(language === 'python' ? '/python-worker.mjs' : '/javascript-worker.js', language === 'python' ? { type: 'module' } : undefined);
  let finished = false;
  const timeout = setTimeout(() => {
    if (finished) return;
    finished = true;
    worker.terminate();
    setOutput('Execution stopped after 3 seconds.'); setRunning(false);
  }, language === 'python' ? 30_000 : 3_000);
  worker.onmessage = ({ data }) => {
    if (finished) return;
    finished = true; clearTimeout(timeout); worker.terminate();
    setOutput(data.error || data.output); setRunning(false);
  };
  worker.onerror = () => {
    if (finished) return;
    finished = true; clearTimeout(timeout); worker.terminate();
    setOutput(language === 'python' ? 'Python could not load. Check your internet connection and try again.' : 'The code could not run.'); setRunning(false);
  };
  worker.postMessage({ code });
}

function Room({ id }) {
  const [room, setRoom] = useState(null);
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [participants, setParticipants] = useState(1);
  const [connection, setConnection] = useState('Connecting');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [output, setOutput] = useState('Run your code to see the output here.');
  const [running, setRunning] = useState(false);
  const socketRef = useRef(null);
  const codeRef = useRef('');
  const languageRef = useRef('javascript');
  const highlightRef = useRef(null);

  useEffect(() => {
    let active = true;
    let retry;
    async function connect() {
      try {
        const response = await fetch(`/api/rooms/${id}`);
        if (!response.ok) throw new Error('This room does not exist. Check the link and try again.');
        const initial = await response.json();
        if (!active) return;
        setRoom(initial); setCode(initial.code); setLanguage(initial.language);
        codeRef.current = initial.code; languageRef.current = initial.language;
        const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const socket = new WebSocket(`${scheme}//${location.host}/ws/rooms/${id}`);
        socketRef.current = socket;
        socket.onopen = () => setConnection('Connected');
        socket.onmessage = ({ data }) => {
          const message = JSON.parse(data);
          if (message.type === 'room') {
            setRoom(message.room); setParticipants(message.participants);
            if (message.room.code !== codeRef.current || message.room.language !== languageRef.current) {
              codeRef.current = message.room.code; languageRef.current = message.room.language;
              setCode(message.room.code); setLanguage(message.room.language);
            }
          } else if (message.type === 'presence') setParticipants(message.participants);
          else if (message.type === 'error') setError(message.error);
        };
        socket.onclose = () => {
          if (!active) return;
          setConnection('Reconnecting');
          retry = setTimeout(connect, 1500);
        };
        socket.onerror = () => socket.close();
      } catch (cause) { if (active) setError(cause.message); }
    }
    connect();
    return () => { active = false; clearTimeout(retry); socketRef.current?.close(); };
  }, [id]);

  function send(nextCode, nextLanguage) {
    codeRef.current = nextCode; languageRef.current = nextLanguage;
    setCode(nextCode); setLanguage(nextLanguage); setOutput('Run your code to see the output here.');
    if (socketRef.current?.readyState === WebSocket.OPEN) socketRef.current.send(JSON.stringify({ type: 'update', code: nextCode, language: nextLanguage }));
  }
  function copyLink() {
    navigator.clipboard.writeText(location.href).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }).catch(() => setError('Could not copy. Select the address bar to share this room.'));
  }
  function run() { setRunning(true); setOutput(language === 'python' ? 'Loading Python and running code…' : 'Running…'); runInWorker(language, code, setOutput, setRunning); }
  const highlighted = hljs.highlight(code || ' ', { language }).value;

  if (error && !room) return <div className="error-page"><Brand /><h1>Room not found.</h1><p>{error}</p><a href="/" className="primary-button">Create a new room <Icon name="arrow" /></a></div>;
  if (!room) return <div className="loading-screen"><Brand /><p>Opening the room…</p></div>;
  return <div className="room-screen">
    <header className="room-header"><Brand /><div className="room-header-right"><div className="connection"><span className={`status-dot ${connection === 'Connected' ? 'online' : ''}`} />{connection}</div><span className="header-divider" /><button className="share-button" onClick={copyLink}><Icon name={copied ? 'link' : 'copy'} size={17} />{copied ? 'Link copied' : 'Copy room link'}</button></div></header>
    <main className="room-main"><div className="room-heading"><div><div className="eyebrow room-eyebrow"><span className="eyebrow-line" /> Live coding room</div><h1>Work it out <em>together.</em></h1><p>Share the link, then start typing. Everyone here sees the same code.</p></div><div className="room-meta"><div className="room-meta-label">IN THIS ROOM</div><div className="participants"><span className="participant-icons"><i>Y</i>{participants > 1 && <i>+{participants - 1}</i>}</span><strong>{participants}</strong> {participants === 1 ? 'person' : 'people'} connected</div></div></div>
      <div className="workspace"><section className="editor-panel"><div className="panel-toolbar"><div className="panel-title"><Icon name="code" size={18} /> Shared editor <span className="live-pill"><span /> LIVE</span></div><label className="language-picker"><span className="sr-only">Language</span><select value={language} onChange={(event) => send(STARTERS[event.target.value], event.target.value)}><option value="javascript">JavaScript</option><option value="python">Python</option></select><Icon name="chevron" size={15} /></label></div><div className="editor-body"><div className="line-numbers" aria-hidden="true">{Array.from({ length: Math.max(13, code.split('\n').length) }, (_, index) => <span key={index}>{String(index + 1).padStart(2, '0')}</span>)}</div><div className="code-field"><pre ref={highlightRef} aria-hidden="true"><code dangerouslySetInnerHTML={{ __html: highlighted + '\n' }} /></pre><textarea value={code} onChange={(event) => send(event.target.value, language)} onScroll={(event) => { if (highlightRef.current) { highlightRef.current.scrollTop = event.target.scrollTop; highlightRef.current.scrollLeft = event.target.scrollLeft; } }} spellCheck="false" autoCapitalize="off" autoComplete="off" autoCorrect="off" aria-label="Shared code editor" /></div></div><div className="editor-footer"><span>Changes save automatically</span><span>{code.length.toLocaleString()} characters</span></div></section>
      <aside className="output-panel"><div className="panel-toolbar"><div className="panel-title">Output <span className="output-local">ONLY YOU SEE THIS</span></div></div><div className="output-body"><div className="output-prompt">&gt;_</div><pre aria-live="polite">{output}</pre></div><div className="output-footer"><span>Runs in your browser</span><button className="run-button" onClick={run} disabled={running}><Icon name="play" size={16} />{running ? 'Running…' : 'Run code'}</button></div></aside></div>
      {error && <p className="inline-error" role="alert">{error}</p>}
      <div className="room-tip"><span className="tip-symbol">✳</span><span>Tip: open this room in a second window to see live collaboration in action.</span></div>
    </main>
  </div>;
}

const match = /^\/room\/([a-f0-9]{24})$/.exec(location.pathname);
createRoot(document.getElementById('root')).render(match ? <Room id={match[1]} /> : <Home />);
