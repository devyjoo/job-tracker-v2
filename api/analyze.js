export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { url, prof, jobContent } = req.body;

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
      pageContent = `URL: ${url}`;
    }
  }

  const prompt = `당신은 15년차 인사담당자이자 산업 분석가입니다.
아래 채용공고를 분석하여 지원자가 서류 전형을 통과할 수 있도록 핵심 정보를 추출해주세요.

=== 채용공고 정보 ===
URL: ${url || '없음'}
공고 내용:
${pageContent}

=== 지원자 프로필 ===
${prof}

=== 분석 기준 ===
1. 이 직무에서 가장 중요한 핵심 역량 키워드 5개 추출 (공고 문장 기반)
2. 지원자 프로필과 공고 요구사항의 매칭도 분석 (0~100점)
3. 이 지원자만의 차별화 포인트 (공고 요구사항 + 지원자 강점 연결)
4. 기업의 최근 사업 방향 및 이 직무에서 원하는 인재상
5. 회사명, 직무명, 마감일, 산업군, 회사규모 추출

반드시 아래 JSON 형식으로만 응답하세요. 다른 텍스트 없이 JSON만:
{
  "co": "회사명",
  "ind": "산업군(IT/금융/뷰티/물류/헬스케어/자동차 등)",
  "role": "직무/직급",
  "dl": "마감일(YYYY년 M월 D일, 없으면 확인필요)",
  "sz": "대기업/중견기업/스타트업",
  "kw": ["핵심키워드1","핵심키워드2","핵심키워드3","핵심키워드4","핵심키워드5"],
  "match": 매칭점수숫자,
  "diff": "이 지원자만의 차별화 포인트 — 공고 요구사항과 지원자 강점을 연결하여 2-3줄로 구체적으로 작성",
  "cinfo": "기업 최근 사업 방향 및 이 직무 인재상 — 2-3줄로 구체적으로 작성"
}`;

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
          {
            role: 'system',
            content: '당신은 15년차 인사담당자이자 채용공고 분석 전문가입니다. 공고 내용을 깊이 분석하여 지원자가 서류 전형을 통과할 수 있는 실질적인 인사이트를 제공합니다. 반드시 유효한 JSON만 출력하세요.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.2,
        max_tokens: 1500,
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
