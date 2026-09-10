/**
 * 시장 데이터를 기반으로 시나리오 및 태그 결정
 *
 * Bear Score 구성 (최대 17점):
 *   나스닥    < -1.0%: +1  / < -2.0%: +1 (중첩)        → 최대 2점
 *   SOX      < -1.0%: +2  / < -2.0%: +1 (중첩)         → 최대 3점 (코스피 반도체 연동 핵심)
 *   S&P500   < -1.0%: +1  / < -2.0%: +1 (중첩)         → 최대 2점
 *   NQ100    < -1.0%: +1                                → 최대 1점
 *   환율     전일 대비 +5원 이상 급등: +1                 → 최대 1점
 *   CNN      공포탐욕 < 25: +1  / < 15: +1 (중첩)        → 최대 2점
 *   전날코스피 < -1.5%: +1                               → 최대 1점
 *   전날코스닥 < -2.0%: +1                               → 최대 1점
 *   닛케이   < -1.5%: +1  / < -2.5%: +1 (중첩)          → 최대 2점 (한국과 가장 직접 연동)
 *   EuroStoxx50 < -1.5%: +1  / < -2.5%: +1 (중첩)      → 최대 2점 (글로벌 리스크오프 신호)
 *
 * 모드 기준:
 *   Bull : bearScore ≤ 4
 *   Base : 5 ≤ bearScore ≤ 11
 *   Bear : bearScore ≥ 12
 */
export function analyzeMarketData(data) {
  const { nasdaq, kospi, kosdaq, exchangeRate, exchangeChange, wti, nqFutures, sox, spx,
          eurostoxx, dax, ftse, nikkei, hangseng, shanghai, cnnFearGreed, foreignInvestor } = data;

  const nasdaqVal    = parseFloat((nasdaq?.rate     || '0%').replace(/[%+]/g, ''));
  const nqVal        = parseFloat((nqFutures?.rate  || '0%').replace(/[%+]/g, ''));
  const soxVal       = parseFloat((sox?.rate        || '0%').replace(/[%+]/g, ''));
  const spxVal       = parseFloat((spx?.rate        || '0%').replace(/[%+]/g, ''));
  const kospiVal     = parseFloat((kospi?.rate      || '0%').replace(/[%+]/g, ''));
  const kosdaqVal    = parseFloat((kosdaq?.rate     || '0%').replace(/[%+]/g, ''));
  const eurostoxxVal = parseFloat((eurostoxx?.rate  || '0%').replace(/[%+]/g, ''));
  const daxVal       = parseFloat((dax?.rate        || '0%').replace(/[%+]/g, ''));
  const ftseVal      = parseFloat((ftse?.rate       || '0%').replace(/[%+]/g, ''));
  const nikkeiVal    = parseFloat((nikkei?.rate     || '0%').replace(/[%+]/g, ''));
  const hangsengVal  = parseFloat((hangseng?.rate   || '0%').replace(/[%+]/g, ''));
  const shanghaiVal  = parseFloat((shanghai?.rate   || '0%').replace(/[%+]/g, ''));
  const exValue      = parseFloat((exchangeRate     || '0').replace(/,/g, ''));
  const exChange     = parseFloat((exchangeChange   || '0').replace(/[^0-9.-]/g, '')) || 0;
  const wtiValue     = parseFloat((wti              || '0').replace(/,/g, ''));

  // ── 태그 (표시용) ──────────────────────────────────────────────
  let nasdaqTag = nasdaqVal >= 1.0 ? 'tag-green'
    : nasdaqVal >= -0.5             ? 'tag-yellow'
    : nasdaqVal >= -1.5             ? 'tag-orange'
                                    : 'tag-red';

  let soxTag = soxVal >= 1.0    ? 'tag-green'
    : soxVal >= -0.5            ? 'tag-yellow'
    : soxVal >= -1.5            ? 'tag-orange'
                                : 'tag-red';

  let spxTag = spxVal >= 0.5    ? 'tag-green'
    : spxVal >= -0.5            ? 'tag-yellow'
    : spxVal >= -1.5            ? 'tag-orange'
                                : 'tag-red';

  // 환율 레벨 태그: 현재 환율 수준(~1350원대)에 맞게 기준 현실화
  let exchangeTag = exValue >= 1410 ? 'tag-red'
    : exValue >= 1380             ? 'tag-orange'
    : exValue >= 1350             ? 'tag-yellow'
                                  : 'tag-green';

  // 환율 변화율 태그: 하루에 5원(약 0.35%) 이상 급등하면 주의
  let exchangeChangeTag = exChange >= 10 ? 'tag-red'
    : exChange >= 5               ? 'tag-orange'
    : exChange >= 2               ? 'tag-yellow'
                                  : 'tag-green';

  let wtiTag = wtiValue >= 110 ? 'tag-red'
    : wtiValue >= 95           ? 'tag-orange'
    : wtiValue >= 80           ? 'tag-yellow'
                               : 'tag-green';

  // 유럽 태그
  let eurostoxxTag = eurostoxxVal >= 0.5 ? 'tag-green' : eurostoxxVal >= -1.0 ? 'tag-yellow' : eurostoxxVal >= -2.0 ? 'tag-orange' : 'tag-red';
  let daxTag       = daxVal >= 0.5       ? 'tag-green' : daxVal >= -1.0       ? 'tag-yellow' : daxVal >= -2.0       ? 'tag-orange' : 'tag-red';
  let ftseTag      = ftseVal >= 0.5      ? 'tag-green' : ftseVal >= -1.0      ? 'tag-yellow' : ftseVal >= -2.0      ? 'tag-orange' : 'tag-red';

  // 아시아 태그
  let nikkeiTag    = nikkeiVal >= 0.5    ? 'tag-green' : nikkeiVal >= -1.5    ? 'tag-yellow' : nikkeiVal >= -2.5    ? 'tag-orange' : 'tag-red';
  let hangsengTag  = hangsengVal >= 0.5  ? 'tag-green' : hangsengVal >= -1.5  ? 'tag-yellow' : hangsengVal >= -2.5  ? 'tag-orange' : 'tag-red';
  let shanghaiTag  = shanghaiVal >= 0.5  ? 'tag-green' : shanghaiVal >= -1.5  ? 'tag-yellow' : shanghaiVal >= -2.5  ? 'tag-orange' : 'tag-red';

  let kospiTag = kospiVal >= 0.5   ? 'tag-green'
    : kospiVal >= -1.0             ? 'tag-yellow'
    : kospiVal >= -2.0             ? 'tag-orange'
                                   : 'tag-red';

  let kosdaqTag = kosdaqVal >= 0.5 ? 'tag-green'
    : kosdaqVal >= -1.5            ? 'tag-yellow'
    : kosdaqVal >= -2.5            ? 'tag-orange'
                                   : 'tag-red';

  let foreignTag = 'tag-green';
  if (foreignInvestor) {
    const f = foreignInvestor.foreign;
    if      (f < -7000) foreignTag = 'tag-red';
    else if (f < -3000) foreignTag = 'tag-orange';
    else if (f < -1000) foreignTag = 'tag-yellow';
  }

  let cnnTag = 'tag-green';
  if (cnnFearGreed) {
    if      (cnnFearGreed.score < 15) cnnTag = 'tag-red';
    else if (cnnFearGreed.score < 25) cnnTag = 'tag-orange';
    else if (cnnFearGreed.score < 45) cnnTag = 'tag-yellow';
  }

  // ── Bear Score 계산 ────────────────────────────────────────────
  let bearScore = 0;

  // 나스닥 (최대 2점)
  if (nasdaqVal < -1.0) bearScore++;
  if (nasdaqVal < -2.0) bearScore++;

  // SOX — 한국 반도체 연동 핵심 지표 (최대 3점, 가중치 높음)
  if (soxVal < -1.0) { bearScore += 2; }  // -1% 돌파만으로 2점
  if (soxVal < -2.0) bearScore++;         // -2% 추가 1점

  // S&P500 (최대 2점)
  if (spxVal < -1.0) bearScore++;
  if (spxVal < -2.0) bearScore++;

  // NQ100 (최대 1점)
  if (nqVal < -1.0) bearScore++;

  // 환율 전일 대비 급등 (5원 이상 = 0.35%+ 상승, 최대 1점)
  if (exChange >= 5) bearScore++;

  // CNN 공포탐욕 (최대 2점)
  if (cnnFearGreed && cnnFearGreed.score < 25) bearScore++;
  if (cnnFearGreed && cnnFearGreed.score < 15) bearScore++;

  // 전날 코스피/코스닥 모멘텀 (최대 2점) — 장 전 실행 시 전일 종가 기준
  if (kospiVal < -1.5) bearScore++;
  if (kosdaqVal < -2.0) bearScore++;

  // 닛케이 — 한국과 섹터 구성이 가장 유사, 직접 연동 (최대 2점)
  if (nikkeiVal < -1.5) bearScore++;
  if (nikkeiVal < -2.5) bearScore++;

  // Euro Stoxx 50 — 글로벌 리스크오프 신호 (최대 2점)
  if (eurostoxxVal < -1.5) bearScore++;
  if (eurostoxxVal < -2.5) bearScore++;

  // DAX/FTSE100/항셍/상하이 — 태그 표시만, Bear Score 미포함 (중복 신호 방지)

  // ── 모드 결정 ──────────────────────────────────────────────────
  let mode, details, allocations;

  if (bearScore <= 4) {
    mode = 'Bull';
    details = '강세장: AI·반도체 HBM, 방산, 로보틱스 고성장 테마에 집중하여 수익을 극대화하세요.';
    allocations = [
      { name: '🖥️ 반도체 HBM & 소부장', pct: 30, tickers: 'SK하이닉스 · 한미반도체 · HPSP · 가온칩스 · 리노공업 · 이오테크닉스', color: 'c2' },
      { name: '🤖 AI 플랫폼 & 소프트웨어', pct: 15, tickers: 'NAVER · 크래프톤 · 삼성SDS · 카카오', color: 'c1' },
      { name: '🦾 로보틱스 & 물리 AI', pct: 15, tickers: '레인보우로보틱스 · 두산로보틱스 · 티로보틱스 · 뉴로메카 · HD현대', color: 'c3' },
      { name: '🚀 방산 & 우주항공', pct: 25, tickers: '한화에어로스페이스 · 한국항공우주 · LIG넥스원 · 현대로템 · 쎄트렉아이', color: 'c4' },
      { name: '🧬 바이오 & 헬스케어', pct: 15, tickers: '알테오젠 · 리가켐바이오 · 삼성바이오로직스 · 셀트리온 · 한미약품', color: 'c5' },
    ];
  } else if (bearScore <= 11) {
    mode = 'Base';
    details = '중립장: 방산·조선·원전 인프라 위주 방어 성장과 현금 비중 균형을 유지하세요.';
    allocations = [
      { name: '🛡️ 방산 & 전력인프라', pct: 25, tickers: '한화에어로스페이스 · LIG넥스원 · HD현대일렉트릭 · 효성중공업 · LS ELECTRIC · 제룡전기', color: 'c4' },
      { name: '⚓ 조선 & 해운', pct: 20, tickers: 'HD현대중공업 · 삼성중공업 · 한화오션 · HD현대미포 · 팬오션', color: 'c2' },
      { name: '☢️ 원전 & SMR', pct: 15, tickers: '두산에너빌리티 · 한전KPS · 한전산업 · 비에이치아이 · 우리기술', color: 'c6' },
      { name: '🖥️ 반도체 & 대형주', pct: 20, tickers: '삼성전자 · SK하이닉스 · 현대차 · 기아', color: 'c1' },
      { name: '💰 현금', pct: 20, tickers: 'CMA · 파킹통장 · MMF', color: 'c7' },
    ];
  } else {
    mode = 'Bear';
    details = '약세장: 현금·안전자산 비중을 최대화하고, 방산·필수소비재로만 최소한의 주식 노출을 유지하세요.';
    allocations = [
      { name: '💰 현금 & MMF', pct: 55, tickers: 'CMA · 파킹통장 · MMF', color: 'c7' },
      { name: '🛡️ 방산 (위기 수혜)', pct: 30, tickers: '한화에어로스페이스 · LIG넥스원 · 한국항공우주 · 현대로템', color: 'c5' },
      { name: '🛒 필수소비재', pct: 15, tickers: '삼양식품 · 농심 · CJ제일제당 · 오뚜기', color: 'c3' },
    ];
  }

  return {
    tags: {
      nasdaq: nasdaqTag,
      sox: soxTag,
      spx: spxTag,
      exchange: exchangeTag,
      exchangeChange: exchangeChangeTag,
      wti: wtiTag,
      cnn: cnnTag,
      kospi: kospiTag,
      kosdaq: kosdaqTag,
      foreign: foreignTag,
      eurostoxx: eurostoxxTag,
      dax: daxTag,
      ftse: ftseTag,
      nikkei: nikkeiTag,
      hangseng: hangsengTag,
      shanghai: shanghaiTag,
    },
    bearScore,
    bearScoreMax: 17,
    mode,
    allocations,
    details,
    scores: {
      nasdaq: nasdaqVal,
      sox: soxVal,
      spx: spxVal,
      nq: nqVal,
      exchangeChange: exChange,
      cnn: cnnFearGreed?.score ?? null,
      kospi: kospiVal,
      kosdaq: kosdaqVal,
      eurostoxx: eurostoxxVal,
      dax: daxVal,
      ftse: ftseVal,
      nikkei: nikkeiVal,
      hangseng: hangsengVal,
      shanghai: shanghaiVal,
    },
    timestamp: new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }),
  };
}
