/**
 * 시장 데이터를 기반으로 시나리오 및 태그 결정
 */

export function analyzeMarketData(data) {
  const { nasdaq, exchangeRate, wti, nqFutures } = data;

  // 1. 나스닥 등락률 판단
  const nasdaqRateValue = parseFloat(nasdaq.rate.replace(/[%+]/g, ''));
  let nasdaqTag = 'tag-yellow';
  if (nasdaqRateValue >= 1.0) nasdaqTag = 'tag-green';
  else if (nasdaqRateValue >= -0.5) nasdaqTag = 'tag-yellow';
  else if (nasdaqRateValue >= -1.5) nasdaqTag = 'tag-orange';
  else nasdaqTag = 'tag-red';

  // 2. 환율 판단
  const exValue = parseFloat(exchangeRate.replace(/,/g, ''));
  let exchangeTag = 'tag-green';
  if (exValue >= 1500) exchangeTag = 'tag-red';
  else if (exValue >= 1470) exchangeTag = 'tag-orange';
  else if (exValue >= 1420) exchangeTag = 'tag-yellow';
  else exchangeTag = 'tag-green';

  // 3. 유가 판단
  const wtiValue = parseFloat(wti.replace(/,/g, ''));
  let wtiTag = 'tag-green';
  if (wtiValue >= 110) wtiTag = 'tag-red';
  else if (wtiValue >= 95) wtiTag = 'tag-orange';
  else if (wtiValue >= 80) wtiTag = 'tag-yellow';
  else wtiTag = 'tag-green';

  // 4. Bear Score 계산 (항목당 1점씩)
  let bearScore = 0;
  const nqFuturesValue = parseFloat(nqFutures.rate.replace(/[%+]/g, ''));

  if (nasdaqRateValue < -1.0) bearScore++;
  if (nasdaqRateValue < -2.0) bearScore++; // 중첩 적용 가능 (명세: 나스닥 < -1.0 / 나스닥 < -2.0)
  if (exValue > 1470) bearScore++;
  if (exValue > 1500) bearScore++;
  if (wtiValue > 95) bearScore++;
  if (wtiValue > 110) bearScore++;
  if (nqFuturesValue < -1.0) bearScore++;

  // 5. 모드 및 비중 결정
  let mode = 'Base';
  let details = '중립장: 변동성에 대비하며 우량주 중심의 균형 잡힌 포트폴리오를 유지하세요.';
  let allocations = [];
  
  if (bearScore <= 1) {
    mode = 'Bull';
    details = '강세장: AI 솔루션, 반도체 HBM, 로봇 등 고성장 테마에 집중 투자하여 수익을 극대화하세요.';
    allocations = [
      { name: '🤖 AI & SW (성장)', pct: 25, tickers: 'NAVER · 카카오 · 셀바스AI · 코난테크놀로지 · 솔트룩스 · 마인즈랩', color: 'c1' },
      { name: '🖥️ 반도체 HBM & 소부장', pct: 20, tickers: 'SK하이닉스 · 한미반도체 · 리노공업 · 주성엔지니어링 · 가온칩스 · HPSP', color: 'c2' },
      { name: '🦾 로보틱스 & 물리 AI', pct: 15, tickers: '레인보우로보틱스 · 두산로보틱스 · 뉴로메카 · 에브리봇 · 티로보틱스 · 유진로봇', color: 'c3' },
      { name: '🚀 우주항공 & 방산', pct: 15, tickers: '한화에어로스페이스 · 한국항공우주 · 현대로템 · LIG넥스원 · 쎄트렉아이 · 비츠로테크', color: 'c4' },
      { name: '🧬 바이오', pct: 15, tickers: '알테오젠 · 셀트리온 · 리가켐바이오 · 삼성바이오로직스 · 유한양행 · 한올바이오파마', color: 'c5' },
      { name: '💰 현금·지수 ETF', pct: 10, tickers: 'KODEX 200 · TIGER 200 · KODEX 코스닥150 · TIGER 미국S&P500', color: 'c7' }
    ];
  } else if (bearScore <= 3) {
    mode = 'Base';
    details = '중립장: 핵심 주도주와 원전 인프라 위주의 방어적인 성장을 동시에 추구하세요.';
    allocations = [
      { name: '🛡️ 방산 & 전력기기', pct: 25, tickers: '한화에어로스페이스 · LIG넥스원 · HD현대일렉트릭 · 효성중공업 · LS ELECTRIC · 제룡전기', color: 'c4' },
      { name: '☢️ 원전 & SMR', pct: 20, tickers: '두산에너빌리티 · 우리기술 · 한전산업 · 비에이치아이 · 보성파워텍 · 한전KPS', color: 'c6' },
      { name: '🖥️ 반도체 & 대형주', pct: 20, tickers: '삼성전자 · SK하이닉스 · 현대차 · 기아 · POSCO홀딩스 · LG화학', color: 'c1' },
      { name: '🥇 금 & 달러 ETF', pct: 15, tickers: 'ACE KRX금현물 · KODEX 골드선물 · TIGER 미국달러선물 · TIGER 구리선물', color: 'c5' },
      { name: '💰 현금 & 파킹형 ETF', pct: 20, tickers: 'CMA · KODEX KOFR금리액티브 · TIGER CD금리투자 · KODEX 단기채권', color: 'c7' }
    ];
  } else {
    mode = 'Bear';
    details = '약세장: 현금 및 안전자산 비중을 최대로 확보하고, 경기 방어 및 인플레이션 헤지에 집중하세요.';
    allocations = [
      { name: '💰 현금 & MMF', pct: 40, tickers: 'CMA · 파킹통장 · MMF · KODEX 미국달러단기채권 · 단기 소액 채권', color: 'c7' },
      { name: '🥇 안전자산 (금·달러)', pct: 25, tickers: 'ACE KRX금현물 · KODEX 골드선물 · TIGER 미국달러선물 · KODEX 미국채10년선물', color: 'c4' },
      { name: '🛡️ 방산 & 필수소비재', pct: 15, tickers: '한화에어로스페이스 · LIG넥스원 · CJ제일제당 · 농심 · 삼양식품 · 오뚜기', color: 'c5' },
      { name: '🛢️ 정유 & 가스', pct: 15, tickers: 'S-Oil · GS · SK이노베이션 · 한국가스공사 · 에쓰오일', color: 'c6' },
      { name: '🖥️ 우량 반도체 (최소)', pct: 5, tickers: 'SK하이닉스 · 삼성전자 (장기 적립형 소량 유지)', color: 'c1' }
    ];
  }

  return {
    tags: {
      nasdaq: nasdaqTag,
      exchange: exchangeTag,
      wti: wtiTag
    },
    bearScore,
    mode,
    allocations,
    details,
    timestamp: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
  };
}
