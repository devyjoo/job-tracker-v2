export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, prof } = req.body;

  const prompt = `다음 채용공고 URL을 분석해주세요: ${url}

지원자 프로필: ${prof}

반드시 아래 JSON 형식으로만 응답하세요. 절대 다른 텍스트 없이 JSON만 출력하세요:
{"co":"회사명","ind":"산업군","role":"직무","dl":"마감일","sz":"대기업/중견기업/스타트업","kw":["k1","k2","k3"],"match":75,"diff":"차별화포인트","cinfo":"기업동향"}`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a job posting analyzer. Respond only with valid JSON, no other text.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 1000,
        response_format: { type: 'json_object' }
      })
    });

    const data = await response.json();
    console.log('OpenAI raw:', JSON.stringify(data));
    const text = data.choices?.[0]?.message?.content || '{}';
    return res.status(200).json({ result: text });
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'API 호출 실패' });
  }
}
