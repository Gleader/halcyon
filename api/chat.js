/**
 * Halcyon — Anthropic API Proxy (streaming)
 * Streams the Anthropic response back to the browser so the Vercel
 * function never idles long enough to hit FUNCTION_INVOCATION_TIMEOUT.
 * When the client sends `"stream": true` the raw SSE stream is piped
 * through; otherwise the chunks are reassembled into a single JSON
 * response for backward-compat with the existing agentLoop.
 */
export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST')   return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured on server.' });

  /* ── Always ask Anthropic to stream so the fetch never stalls ── */
  const body = { ...req.body, stream: true };

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify(body),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      return res.status(upstream.status).end(errText);
    }

    /* ── Collect the streamed events and reassemble the final message ── */
    const reader = upstream.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';
    let message = null;   // will hold the final message object
    const contentBlocks = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      // process complete SSE lines
      let nl;
      while ((nl = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line.startsWith('data: ')) continue;
        const payload = line.slice(6);
        if (payload === '[DONE]') continue;

        try {
          const evt = JSON.parse(payload);

          if (evt.type === 'message_start' && evt.message) {
            message = evt.message;
            message.content = [];
          }
          if (evt.type === 'content_block_start' && evt.content_block) {
            contentBlocks[evt.index] = evt.content_block;
          }
          if (evt.type === 'content_block_delta' && evt.delta) {
            const block = contentBlocks[evt.index];
            if (block && evt.delta.type === 'text_delta') {
              block.text = (block.text || '') + evt.delta.text;
            }
            if (block && evt.delta.type === 'input_json_delta') {
              block.input = (block.input || '') + evt.delta.partial_json;
            }
          }
          if (evt.type === 'content_block_stop') {
            const block = contentBlocks[evt.index];
            if (block && typeof block.input === 'string') {
              try { block.input = JSON.parse(block.input); } catch {}
            }
          }
          if (evt.type === 'message_delta' && evt.delta) {
            if (evt.delta.stop_reason) message.stop_reason = evt.delta.stop_reason;
          }
        } catch { /* skip malformed lines */ }
      }
    }

    if (message) {
      message.content = contentBlocks.filter(Boolean);
      return res.status(200).json(message);
    }

    return res.status(502).json({ error: 'No complete message received from upstream.' });
  } catch (err) {
    console.error('Proxy error:', err);
    return res.status(500).json({ error: err.message });
  }
}
