/**
 * 시장 데이터를 기반으로 시나리오 및 태그 결정
 */

export function analyzeMarketData(data) {
  const { nasdaq, exchangeRate, wti, nqFutures, cnnFearGreed } = data;

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

  // 4. CNN 공포탐욕지수 판단
  let cnnTag = 'tag-green';
  if (cnnFearGreed) {
    if (cnnFearGreed.score < 15) cnnTag = 'tag-red';
    else if (cnnFearGreed.score < 25) cnnTag = 'tag-orange';
    else if (cnnFearGreed.score < 45) cnnTag = 'tag-yellow';
  }

  // 5. Bear Score 계산 (항목당 1점씩, 총 /9)
  let bearScore = 0;
  const nqFuturesValue = parseFloat(nqFutures.rate.replace(/[%+]/g, ''));

  if (nasdaqRateValue < -1.0) bearScore++;
  if (nasdaqRateValue < -2.0) bearScore++; // 중첩
  if (exValue > 1470) bearScore++;
  if (exValue > 1500) bearScore++; // 중첩
  if (wtiValue > 95) bearScore++;
  if (wtiValue > 110) bearScore++; // 중첩
  if (nqFuturesValue < -1.0) bearScore++;
  if (cnnFearGreed && cnnFearGreed.score < 25) bearScore++;
  if (cnnFearGreed && cnnFearGreed.score < 15) bearScore++; // 중첩

  // 6. 모드 및 비중 결정 (총점 9점 기준)
  let mode = 'Base';
  let details = '중립장: 변동성에 대비하며 우량주 중심의 균형 잡힌 포트폴리오를 유지하세요.';
  let allocations = [];

  if (bearScore <= 1) {
    mode = 'Bull';
    details = '강세장: AI·반도체 HBM, 방산, 로보틱스 고성장 테마에 집중하여 수익을 극대화하세요.';
    allocations = [
      { name: '🖥️ 반도체 HBM & 소부장', pct: 30, tickers: 'SK하이닉스 · 한미반도체 · HPSP · 가온칩스 · 리노공업 · 이오테크닉스', color: 'c2' },
      { name: '🤖 AI 플랫폼 & 소프트웨어', pct: 15, tickers: 'NAVER · 크래프톤 · 삼성SDS · 카카오', color: 'c1' },
      { name: '🦾 로보틱스 & 물리 AI', pct: 15, tickers: '레인보우로보틱스 · 두산로보틱스 · 티로보틱스 · 뉴로메카 · HD현대', color: 'c3' },
      { name: '🚀 방산 & 우주항공', pct: 25, tickers: '한화에어로스페이스 · 한국항공우주 · LIG넥스원 · 현대로템 · 쎄트렉아이', color: 'c4' },
      { name: '🧬 바이오 & 헬스케어', pct: 15, tickers: '알테오젠 · 리가켐바이오 · 삼성바이오로직스 · 셀트리온 · 한미약품', color: 'c5' }
    ];
  } else if (bearScore <= 5) {
    mode = 'Base';
    details = '중립장: 방산·조선·원전 인프라 위주 방어 성장과 현금 비중 균형을 유지하세요.';
    allocations = [
      { name: '🛡️ 방산 & 전력인프라', pct: 25, tickers: '한화에어로스페이스 · LIG넥스원 · HD현대일렉트릭 · 효성중공업 · LS ELECTRIC · 제룡전기', color: 'c4' },
      { name: '⚓ 조선 & 해운', pct: 20, tickers: 'HD현대중공업 · 삼성중공업 · 한화오션 · HD현대미포 · 팬오션', color: 'c2' },
      { name: '☢️ 원전 & SMR', pct: 15, tickers: '두산에너빌리티 · 한전KPS · 한전산업 · 비에이치아이 · 우리기술', color: 'c6' },
      { name: '🖥️ 반도체 & 대형주', pct: 20, tickers: '삼성전자 · SK하이닉스 · 현대차 · 기아', color: 'c1' },
      { name: '💰 현금', pct: 20, tickers: 'CMA · 파킹통장 · MMF', color: 'c7' }
    ];
  } else {
    mode = 'Bear';
    details = '약세장: 현금·안전자산 비중을 최대화하고, 방산·필수소비재로만 최소한의 주식 노출을 유지하세요.';
    allocations = [
      { name: '💰 현금 & MMF', pct: 55, tickers: 'CMA · 파킹통장 · MMF', color: 'c7' },
      { name: '🛡️ 방산 (위기 수혜)', pct: 30, tickers: '한화에어로스페이스 · LIG넥스원 · 한국항공우주 · 현대로템', color: 'c5' },
      { name: '🛒 필수소비재', pct: 15, tickers: '삼양식품 · 농심 · CJ제일제당 · 오뚜기', color: 'c3' }
    ];
  }

  return {
    tags: {
      nasdaq: nasdaqTag,
      exchange: exchangeTag,
      wti: wtiTag,
      cnn: cnnTag
    },
    bearScore,
    mode,
    allocations,
    details,
    timestamp: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
  };
}
