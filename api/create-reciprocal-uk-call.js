export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const apiKey = process.env.RETELL_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'retell_api_key_missing' });
  }

  const AGENT_ID = 'agent_213ee179af179c19e667533827';

  try {
    const r = await fetch('https://api.retellai.com/v2/create-web-call', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ agent_id: AGENT_ID }),
    });

    if (!r.ok) {
      const text = await r.text();
      return res.status(502).json({ error: 'retell_error', detail: text.slice(0, 500) });
    }

    const data = await r.json();
    return res.status(200).json({
      access_token: data.access_token,
      call_id: data.call_id,
    });
  } catch (e) {
    return res.status(500).json({ error: 'exception', detail: String(e).slice(0, 300) });
  }
}
