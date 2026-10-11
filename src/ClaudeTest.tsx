
import { useState } from 'react';

export default function ClaudeTestComponent() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleAskClaude = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setResponse('');

    try {
      const baseUrl = import.meta.env.VITE_APMIX_BASE_URL
        ?.replace(/\/+$/, '');
      const apiKey = import.meta.env.VITE_APMIX_API_KEY;

      const content: any[] = [];

      if (file && file.type.startsWith('image/')) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        content.push({
          type: 'image',
          source: {
            type: 'base64',
            media_type: file.type,
            data: base64,
          },
        });
      } else if (file && file.type === 'text/plain') {
        const text = await file.text();
        content.push({
          type: 'text',
          text: `Attached file: ${file.name}\n\n${text}`,
        });
      }

      content.push({ type: 'text', text: "What animal is this? One word only." });

      console.log("Sending content:", content);
        console.log("Attachment:", file?.name, file?.type, file?.size);

      const res = await fetch(`${baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6-free',
          max_tokens: 1024,
          messages: [{ role: 'user', content }],
        }),
      });

      const data = await res.json();
console.log("HTTP status:", res.status);
console.log("Response model:", data.model);
console.log("Response:", data);
      if (!res.ok) {
        throw new Error(
          data.error?.message || `Request failed: ${res.status}`
        );
      }

      setResponse(
        data.content
          ?.filter((item: any) => item.type === 'text')
          .map((item: any) => item.text)
          .join('\n') || 'No text response returned.'
      );
    } catch (error) {
      setResponse(
        `Error: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: '0 auto' }}>
      <h3>Claude with Attachments</h3>

      <textarea
        rows={4}
        style={{ width: '100%', marginBottom: 10 }}
        placeholder="Ask Claude something about your attachment..."
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
      />

      <input
        type="file"
        accept="image/*,.txt"
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />

      {file && (
        <div style={{ marginTop: 10 }}>
          <p>
            {file.name} ({(file.size / 1024).toFixed(1)} KB)
          </p>

          {file.type.startsWith('image/') && (
            <img
              src={URL.createObjectURL(file)}
              alt="Attachment preview"
              style={{ maxWidth: '100%', maxHeight: 250 }}
            />
          )}

          <button onClick={() => setFile(null)}>
            Remove attachment
          </button>
        </div>
      )}

      <div style={{ marginTop: 10 }}>
        <button onClick={handleAskClaude} disabled={loading}>
          {loading ? 'Thinking...' : 'Send to Claude'}
        </button>
      </div>

      {response && (
        <div style={{ marginTop: 20, whiteSpace: 'pre-wrap' }}>
          <strong>Response:</strong>
          <p>{response}</p>
        </div>
      )}
    </div>
  );
}
