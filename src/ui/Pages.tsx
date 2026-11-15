// Privacy (plain language) and Settings.
import { useState } from 'react';
import { listCases, wipeAll, getDoc } from '../store/db.ts';
import { download } from '../export/csv.ts';
import { go, useApp } from './state.tsx';

export function Privacy() {
  return (
    <article className="prose">
      <div className="kicker">Privacy</div>
      <h1>What happens to a transcript</h1>
      <p className="lede" style={{ marginTop: 10 }}>
        A transcript is a protected student record. evalua is built so that the record stays on the device you are using. This page says exactly what happens, in plain words.
      </p>

      <h2>The short version</h2>
      <ul>
        <li><strong>The transcript never leaves your device.</strong> It is opened, read and analysed inside your web browser. There is no upload: evalua’s server has no way to receive a transcript.</li>
        <li><strong>Nothing is stored unless you are using it.</strong> Your cases are kept in this browser’s own storage on this device, so you can come back to them. They are not in an account and not on a server.</li>
        <li><strong>No tracking.</strong> There are no analytics, no advertising scripts, no cookies, and no fonts or code loaded from other companies.</li>
      </ul>

      <h2>Step by step</h2>
      <ul>
        <li><strong>When you choose a file,</strong> your browser hands it to the page. The page reads the text itself. For scans and photos it runs a text-recognition program inside the browser; the program’s files are downloaded from this site once and then reused.</li>
        <li><strong>When courses are matched and grades converted,</strong> that is done by rules and dictionaries that are part of the page. No transcript text is sent anywhere.</li>
        <li><strong>When you save a note or change a field,</strong> it is written to this browser’s storage, with the time and the name you entered in Settings.</li>
        <li><strong>When you export,</strong> the report is made by your browser’s print function and the CSV is created on your device. Where you save or send them is up to you and your district’s rules.</li>
        <li><strong>When you delete a case,</strong> the case and its document are removed from this browser. “Delete everything” in Settings removes all of evalua’s data from this browser.</li>
      </ul>

      <h2>What the server does see</h2>
      <ul>
        <li><strong>Ordinary page requests.</strong> Like any website, the host (Cloudflare) sees that your device asked for the page and its files. evalua adds no logging of its own.</li>
        <li><strong>A catalog link, if you use one.</strong> If you paste a web link to your district’s public course catalog, evalua’s server fetches that public document for you. The link contains no student information. Uploading the catalog file instead keeps even that on your device.</li>
        <li><strong>The shared reference data.</strong> Education-system profiles and state graduation templates are public reference information. They contain no student data.</li>
      </ul>

      <h2>Optional: a language model on your own computer</h2>
      <p>
        evalua works without any AI model. If you turn on the local model option in Settings, untranslated course names can be sent to a model running on <em>your own computer</em> (through Ollama). That stays on your machine. Nothing is sent to an outside AI service unless your district’s host has deliberately configured one, in which case Settings says so.
      </p>

      <h2>Things to know</h2>
      <ul>
        <li>Anyone who can use this browser profile on this device can open the saved cases. Use your district’s normal device security, and delete cases when you no longer need them here.</li>
        <li>Clearing your browser’s site data deletes the cases. Export the report first if you need to keep it.</li>
        <li>evalua suggests; it does not decide. It never judges whether a document is genuine. It only points out things for a person to check.</li>
      </ul>

      <h2>Trying it without a real record</h2>
      <p>
        The project includes fictitious sample transcripts (marked SPECIMEN) for the systems it knows. They are in the <a href="https://github.com/K11Cham/evalua/tree/main/fixtures/fake" target="_blank" rel="noreferrer noopener">fixtures/fake folder of the source code</a>. Use those to try the tool.
      </p>
    </article>
  );
}

export function Settings() {
  const { settings, saveSettings, kb } = useApp();
  const [s, setS] = useState(settings);
  const [status, setStatus] = useState('');
  const [aiStatus, setAiStatus] = useState('');
  const save = async (next = s) => {
    await saveSettings(next);
    setStatus('Saved.');
    setTimeout(() => setStatus(''), 2500);
  };
  const testOllama = async () => {
    setAiStatus('Checking…');
    try {
      const r = await fetch(`${s.ollamaUrl.replace(/\/$/, '')}/api/tags`);
      const j = (await r.json()) as { models?: { name: string }[] };
      const names = (j.models ?? []).map((m) => m.name);
      setAiStatus(names.length ? `Connected. Models on this computer: ${names.join(', ')}` : 'Connected, but no models are installed.');
    } catch {
      setAiStatus('Could not reach Ollama. Start it on this computer and allow this site: set the environment variable OLLAMA_ORIGINS to this page’s address, then restart Ollama.');
    }
  };
  const exportAll = async () => {
    const cases = await listCases();
    const out = [];
    for (const c of cases) out.push({ ...c, tokens: (await getDoc(c.id))?.tokens ?? null });
    download(`evalua-cases-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ exported: new Date().toISOString(), note: 'Contains student records. Store according to your district policy.', cases: out }, null, 1), 'application/json');
  };

  return (
    <div className="prose" style={{ maxWidth: 820 }}>
      <div className="kicker">Settings</div>
      <h1 style={{ marginBottom: 16 }}>Settings</h1>

      <section className="panel">
        <h2>You</h2>
        <div className="grid2">
          <label className="field">
            Your name (recorded with each change you make)
            <input type="text" value={s.counselor} onChange={(e) => setS({ ...s, counselor: e.target.value })} placeholder="e.g. J. Rivera, Registrar" />
          </label>
          <label className="field">
            District for new cases
            <select value={s.districtId} onChange={(e) => setS({ ...s, districtId: e.target.value })}>
              {kb.districts.map((d) => (
                <option key={d.id} value={d.id}>{d.name} · {d.schoolYear}</option>
              ))}
            </select>
          </label>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn primary" onClick={() => void save()}>Save</button>
          <span role="status" className="small muted">{status}</span>
        </div>
      </section>

      <section className="panel">
        <h2>Optional: language model on this computer</h2>
        <p className="small">
          evalua works without a model, using rules and dictionaries. If you run <a href="https://ollama.com" target="_blank" rel="noreferrer noopener">Ollama</a> on this computer, evalua can ask it to translate course names the dictionaries do not cover. The text goes only to your own machine.
        </p>
        <div className="grid2">
          <label className="field">
            Ollama address
            <input type="url" value={s.ollamaUrl} onChange={(e) => setS({ ...s, ollamaUrl: e.target.value })} />
          </label>
          <label className="field">
            Model name
            <input type="text" value={s.ollamaModel} onChange={(e) => setS({ ...s, ollamaModel: e.target.value })} placeholder="e.g. qwen2.5:7b" />
          </label>
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <label className="small"><input type="checkbox" checked={s.aiEnabled} onChange={(e) => setS({ ...s, aiEnabled: e.target.checked })} /> Use the local model for missing translations</label>
          <button className="btn small" onClick={() => void testOllama()}>Test connection</button>
          <button className="btn small primary" onClick={() => void save()}>Save</button>
        </div>
        {aiStatus && <p role="status" className="small" style={{ marginTop: 8 }}>{aiStatus}</p>}
      </section>

      <section className="panel">
        <h2>Your data on this device</h2>
        <p className="small">Cases, documents and district profiles are stored only in this browser. See <a href="#/privacy">what happens to a transcript</a>.</p>
        <div className="row">
          <button className="btn" onClick={() => void exportAll()}>Export all cases (JSON)</button>
          <button
            className="btn danger"
            onClick={async () => {
              if (confirm('Delete every case, document, district profile and setting stored by evalua in this browser? This cannot be undone.')) {
                await wipeAll();
                go('/');
                window.location.reload();
              }
            }}
          >
            Delete everything
          </button>
        </div>
      </section>
    </div>
  );
}
