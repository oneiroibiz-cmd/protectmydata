exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  try {
    const { domain } = JSON.parse(event.body);
    if (!domain) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Domain required' }) };

    const prompt = `You are a privacy expert. Analyze ${domain}'s privacy policy and cookie practices.

Return ONLY valid JSON, no markdown, no extra text:
{
  "site": "${domain}",
  "privacyScore": <1-10>,
  "cookieScore": <1-10>,
  "chips": [
    {"label": "short tag", "level": "red|amber|green"}
  ],
  "collectShort": "2-3 sentences. Plain English. What data they collect and the biggest concern.",
  "collectDetail": "4-6 sentences. Full detail: what data, who they share with, retention, user rights, cookie types.",
  "sells": "Yes / No / Unclear",
  "optout": "Easy / Limited / None",
  "gdpr": "Yes / No / Partial"
}
chips: 4-5 max. red=bad, amber=mixed, green=good for user.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 900,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await response.json();
    let raw = (data.content || []).map(b => b.text || '').join('').replace(/```json|```/g, '').trim();
    const result = JSON.parse(raw);

    return { statusCode: 200, headers, body: JSON.stringify(result) };
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Analysis failed', detail: err.message }) };
  }
};
