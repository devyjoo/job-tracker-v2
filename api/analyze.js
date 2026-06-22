export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, prof, jobContent } = req.body;

  // 공고 내용이 없으면 URL 크롤링 시도
  let pageContent = jobContent || '';

  if (!pageContent && url) {
    try {
      const pageRes = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9',
        }
      });
      const html = await pageRes.text();
      pageContent = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 4000);
    } catch (e) {
      console.log('크롤링 실패:', e.message);
      pageContent = `URL: ${url}`;
    }
  }

  const prompt = `다음 채용공고를 분석해주세요.

URL: ${url || '없음'}

공고 내용:
${pageContent}

지원자 프로필: ${prof}

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만:
{"co":"회사명","ind":"산업군(IT/금융/뷰티/물류/헬스케어/자동차 등)","role":"직무/직급","dl":"마감일(YYYY년 M월 D일, 없으면 확인필요)","sz":"대기업/중견기업/스타트업","kw":["키워드1","키워드2","키워드3","키워드4","키워드5"],"match":숫자,"diff":"이 지원자의 차별화 포인트 2-3줄","cinfo":"기업 최근 동향 및 인재상 2-3줄"}`;

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
          { role: 'system', content: '당신은 채용공고 분석 전문가입니다. 반드시 유효한 JSON만 출력하세요.' },
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
