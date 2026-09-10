import axios from 'axios';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';

const NAVER_FINANCE_URL = 'https://finance.naver.com';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchHtml(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      if (i > 0) await sleep(Math.random() * 1000 + 500 * Math.pow(2, i));
      const randomUA = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: {
          'User-Agent': randomUA,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Referer': 'https://finance.naver.com/',
          'Upgrade-Insecure-Requests': '1',
        },
      });

      const contentType = response.headers['content-type'] || '';
      let charset = contentType.includes('charset=')
        ? contentType.split('charset=')[1].toLowerCase()
        : 'euc-kr';
      let decodedHtml = iconv.decode(response.data, charset);
      if (decodedHtml.includes('charset=utf-8') || decodedHtml.includes('charset="utf-8"')) {
        decodedHtml = iconv.decode(response.data, 'utf-8');
      }
      return cheerio.load(decodedHtml);
    } catch (error) {
      console.warn(`[Retry ${i + 1}/${retries}] Failed to fetch ${url}: ${error.message}`);
      if (i === retries - 1) {
        console.error(`Final failure for ${url}`);
        return null;
      }
    }
  }
}

function extractRate(text) {
  const match = text.replace(/[\s]/g, '').match(/[+-]?\d+(\.\d+)?%/);
  return match ? match[0] : '0%';
}

// 네이버 금융이 Next.js로 전면 개편되면서(2026-09 이전 어느 시점) sise_*.naver 계열 구버전 페이지는
// 정적 HTML에 데이터가 없어졌다(클라이언트 사이드 렌더링) — 대시보드 전체 지표가 0으로 나온 원인
// (2026-09-11 사용자 리포트로 확인). 네이버 모바일 증권이 실제로 쓰는 JSON API로 교체한다.
const STOCK_API_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

async function fetchJson(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      if (i > 0) await sleep(Math.random() * 1000 + 500 * Math.pow(2, i));
      const response = await axios.get(url, {
        timeout: 10000,
        headers: { 'User-Agent': STOCK_API_UA, 'Accept': 'application/json' },
      });
      return response.data;
    } catch (error) {
      console.warn(`[Retry ${i + 1}/${retries}] Failed to fetch ${url}: ${error.message}`);
      if (i === retries - 1) {
        console.error(`Final failure for ${url}`);
        return null;
      }
    }
  }
}

function signedRatio(fluctuationsRatio) {
  const v = parseFloat(fluctuationsRatio ?? '0');
  return `${v > 0 ? '+' : ''}${v}%`;
}

/**
 * 코스피/코스닥 지수 수집
 */
export async function fetchDomesticIndices() {
  const zero = { price: '0', rate: '0' };
  const [kospiData, kosdaqData] = await Promise.all([
    fetchJson('https://m.stock.naver.com/api/index/KOSPI/basic'),
    fetchJson('https://m.stock.naver.com/api/index/KOSDAQ/basic'),
  ]);

  const kospi = kospiData?.closePrice
    ? { price: kospiData.closePrice, rate: signedRatio(kospiData.fluctuationsRatio) }
    : zero;
  const kosdaq = kosdaqData?.closePrice
    ? { price: kosdaqData.closePrice, rate: signedRatio(kosdaqData.fluctuationsRatio) }
    : zero;

  return { kospi, kosdaq };
}

/**
 * 원달러 환율 + 전일 대비 변화율, WTI 유가 수집
 */
export async function fetchMarketIndex() {
  const fx = await fetchJson('https://api.stock.naver.com/marketindex/exchange/FX_USDKRW');
  const info = fx?.exchangeInfo;
  if (!info?.closePrice) return { exchangeRate: '0', exchangeChange: '0', wti: '0' };

  const exchangeRate = info.closePrice.replace(/,/g, '');
  const changeNum = parseFloat(info.fluctuations ?? '0');
  const sign = info.fluctuationsType?.name === 'RISING' ? '+' : info.fluctuationsType?.name === 'FALLING' ? '-' : '';
  const exchangeChange = changeNum === 0 ? '0' : `${sign}${changeNum}`;

  // WTI는 네이버 모바일 API에서 아직 동작하는 엔드포인트를 못 찾았다(2026-09-11) — 대시보드에서
  // "참고용" 표기라 0으로 남겨도 판단 로직(logic.js)에는 큰 영향이 없다.
  const wti = '0';

  return { exchangeRate, exchangeChange, wti };
}

/**
 * 글로벌 지수 통합 수집. 네이버 모바일 증권 API(api.stock.naver.com/index/{reutersCode}/basic)를
 * 종목별로 호출한다 — world 페이지가 더 이상 정적 HTML에 데이터를 담지 않아(2026-09-11 확인)
 * 예전처럼 한 번의 요청으로 스크립트 블록을 파싱할 수 없다.
 */
const WORLD_INDEX_CODES = {
  nasdaq: '.IXIC',
  nqFutures: '.NDX', // 선물 데이터가 무료로 없어 나스닥100 현물 지수로 대체
  sox: '.SOX',
  spx: '.INX',
  eurostoxx: '.STOXX50E',
  dax: '.GDAXI',
  ftse: '.FTSE',
  nikkei: '.N225',
  hangseng: '.HSI',
  shanghai: '.SSEC',
};

export async function fetchGlobalIndices() {
  const zero = { price: '0', rate: '0%' };
  const entries = Object.entries(WORLD_INDEX_CODES);
  const results = await Promise.all(
    entries.map(([, code]) => fetchJson(`https://api.stock.naver.com/index/${code}/basic`)),
  );

  const out = {};
  entries.forEach(([key], i) => {
    const data = results[i];
    out[key] = data?.closePrice
      ? { price: data.closePrice, rate: signedRatio(data.fluctuationsRatio) }
      : zero;
  });

  console.log(`[SCRAPER] US: 나스닥 ${out.nasdaq.rate} | NQ100 ${out.nqFutures.rate} | SOX ${out.sox.rate} | S&P500 ${out.spx.rate}`);
  console.log(`[SCRAPER] EU: EuroStoxx ${out.eurostoxx.rate} | DAX ${out.dax.rate} | FTSE100 ${out.ftse.rate}`);
  console.log(`[SCRAPER] AS: 닛케이 ${out.nikkei.rate} | 항셍 ${out.hangseng.rate} | 상하이 ${out.shanghai.rate}`);

  return out;
}

/**
 * 코스피 외국인 순매수/매도 수집 (단위: 억원)
 * 장 전 실행 시 전날 데이터, 10:00·14:00 재실행 시 당일 누적 데이터
 */
export async function fetchForeignInvestor() {
  const $ = await fetchHtml(`${NAVER_FINANCE_URL}/sise/sise_index_investor.naver?code=KOSPI`);
  if (!$) return null;

  try {
    const rows = $('table.type_1 tbody tr').filter((i, el) => {
      const tds = $(el).find('td');
      return tds.length >= 5 && $(tds[0]).text().trim().match(/\d{2}\.\d{2}/);
    });
    if (rows.length === 0) return null;

    const cells = rows.first().find('td');
    const dateText = $(cells[0]).text().trim();
    const foreignRaw = $(cells[2]).text().trim().replace(/,/g, '');
    const absVal = parseFloat(foreignRaw.replace(/[^0-9.]/g, '') || '0');
    // 음수 부호: '-' 포함 여부 또는 셀 클래스로 판단
    const isDn = foreignRaw.startsWith('-') || $(cells[2]).hasClass('dn') || $(cells[2]).hasClass('red');
    const foreign = isDn ? -absVal : absVal;

    return { date: dateText, foreign };
  } catch (e) {
    console.warn('[SCRAPER] 외국인 수급 파싱 실패:', e.message);
    return null;
  }
}

/**
 * CNN 공포탐욕지수 수집
 */
export async function fetchCnnFearGreed() {
  try {
    const response = await axios.get('https://production.dataviz.cnn.io/index/fearandgreed/graphdata', {
      timeout: 10000,
      headers: {
        'User-Agent': USER_AGENTS[0],
        'Referer': 'https://edition.cnn.com/',
      },
    });
    const score = response.data?.fear_and_greed?.score;
    const rating = response.data?.fear_and_greed?.rating || '';
    if (score !== undefined) return { score: Math.round(score), rating };
  } catch (e) {
    console.warn('[SCRAPER] CNN Fear & Greed 수집 실패:', e.message);
  }
  return null;
}

/**
 * 모든 데이터 통합 수집
 */
export async function fetchAllMarketData() {
  const results = await Promise.allSettled([
    fetchDomesticIndices(),
    fetchMarketIndex(),
    fetchGlobalIndices(),   // 미국+유럽+아시아 1회 요청
    fetchCnnFearGreed(),
    fetchForeignInvestor(),
  ]);

  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      console.warn(`[SCRAPER] task ${i} 실패:`, r.reason?.message || r.reason);
    }
  });

  const zero = { price: '0', rate: '0%' };
  const domestic       = results[0].status === 'fulfilled' ? results[0].value : { kospi: { price: '-', rate: '-' }, kosdaq: { price: '-', rate: '-' } };
  const market         = results[1].status === 'fulfilled' ? results[1].value : { exchangeRate: '0', exchangeChange: '0', wti: '0' };
  const global_        = results[2].status === 'fulfilled' ? results[2].value : { nasdaq: zero, nqFutures: zero, sox: zero, spx: zero, eurostoxx: zero, dax: zero, ftse: zero, nikkei: zero, hangseng: zero, shanghai: zero };
  const fearGreed      = results[3].status === 'fulfilled' ? results[3].value : null;
  const foreignInvestor = results[4].status === 'fulfilled' ? results[4].value : null;

  return {
    kospi:          domestic.kospi,
    kosdaq:         domestic.kosdaq,
    exchangeRate:   market.exchangeRate,
    exchangeChange: market.exchangeChange,
    wti:            market.wti,
    nasdaq:         global_.nasdaq,
    nqFutures:      global_.nqFutures,
    sox:            global_.sox,
    spx:            global_.spx,
    eurostoxx:      global_.eurostoxx,
    dax:            global_.dax,
    ftse:           global_.ftse,
    nikkei:         global_.nikkei,
    hangseng:       global_.hangseng,
    shanghai:       global_.shanghai,
    cnnFearGreed:   fearGreed,
    foreignInvestor,
  };
}
