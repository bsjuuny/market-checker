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
  let allocation = { cash: 50, stock: 20, bond: 30 }; // 비중: 현금/주식/채권 순 (임의 예시, 명세 기반 조정)
  
  if (bearScore <= 1) {
    mode = 'Bull';
    allocation = { cash: 60, stock: 30, bond: 10 };
  } else if (bearScore <= 3) {
    mode = 'Base';
    allocation = { cash: 20, stock: 50, bond: 30 };
  } else {
    mode = 'Bear';
    allocation = { cash: 10, stock: 30, bond: 60 };
  }

  return {
    tags: {
      nasdaq: nasdaqTag,
      exchange: exchangeTag,
      wti: wtiTag
    },
    bearScore,
    mode,
    allocation,
    timestamp: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
  };
}
