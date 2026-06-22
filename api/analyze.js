export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, prof } = req.body;

  const prompt = `다음 채용공고 URL을 분석해주세요: ${url}

지원자 프로필: ${prof}

반드시 아래 JSON 형식으로만 응답하세요. 절대 다른 텍스트, 설명, 마크다운 없이 JSON만 출력하세요.
{"co":"회사명","ind":"산업군(IT/금융/뷰티/물류/헬스케어 등)","role":"직무/직급","dl":"마감일(YYYY년 M월 D일)","sz":"대기업/중견기업/스타트업","kw":["키워드1","키워드2","키워드3","키워드4","키워드5"],"match":75,"diff":"이 지원자의 차별화 포인트 2-3줄","cinfo":"기업 최근 동향 및 인재상 2-3줄"}`;

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
          { role: 'system', content: '당신은 채용공고 분석 전문가입니다. 반드시 JSON만 출력하세요.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 1000
      })
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '{}';
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();

    return res.status(200).json({ result: cleaned });
  } catch (error) {
    console.error('OpenAI error:', error);
    return res.status(500).json({ error: 'API 호출 실패' });
  }
}
