import axios from 'axios';
import * as cheerio from 'cheerio';
import iconv from 'iconv-lite';

const NAVER_FINANCE_URL = 'https://finance.naver.com';

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
  'Mozilla/5.0 (AppleWebKit/537.36, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edge/121.0.0.0'
];

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 네이버 금융에서 데이터를 가져오는 공통 유틸리티 (인코딩 처리 및 차단 방지)
 */
async function fetchHtml(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      // 랜덤 지연 (0.5s ~ 1.5s) 적용하여 봇 탐지 회피
      if (i > 0) await sleep(Math.random() * 1000 + 500 * Math.pow(2, i));

      const randomUA = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 10000,
        headers: {
          'User-Agent': randomUA,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
          'Referer': 'https://finance.naver.com/',
          'Upgrade-Insecure-Requests': '1'
        }
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
      console.warn(`[Retry ${i+1}/${retries}] Failed to fetch ${url}: ${error.message}`);
      if (i === retries - 1) {
        console.error(`Final failure for ${url}`);
        return null;
      }
    }
  }
}

/**
 * 텍스트에서 등락률(+0.00%)만 추출하는 헬퍼
 */
function extractRate(text) {
  const match = text.replace(/[\s]/g, '').match(/[+-]?\d+(\.\d+)?%/);
  return match ? match[0] : '0%';
}

/**
 * 코스피/코스닥 지수 수집
 */
export async function fetchDomesticIndices() {
  const $ = await fetchHtml(`${NAVER_FINANCE_URL}/sise/`);
  if (!$) return { kospi: { price: '0', rate: '0' }, kosdaq: { price: '0', rate: '0' } };

  const kospiPrice = $('#KOSPI_now').text().trim();
  const kospiRate = extractRate($('#KOSPI_change').text());
  
  const kosdaqPrice = $('#KOSDAQ_now').text().trim();
  const kosdaqRate = extractRate($('#KOSDAQ_change').text());

  return {
    kospi: { price: kospiPrice, rate: kospiRate },
    kosdaq: { price: kosdaqPrice, rate: kosdaqRate }
  };
}

/**
 * 원달러 환율 및 WTI 유가 수집
 */
export async function fetchMarketIndex() {
  const $ = await fetchHtml(`${NAVER_FINANCE_URL}/marketindex/`);
  if (!$) return { exchangeRate: '0', wti: '0' };

  // 원달러 환율: a.head.usd span.value 가 가장 정확
  const exchangeRate = $('a.head.usd span.value').text().trim().replace(/,/g, '') || 
                       $('.exchange_value').first().text().trim().replace(/,/g, '');

  // WTI 유가: a.head.wti span.value
  const wti = $('a.head.wti span.value').text().trim() || 
              $('.oil .value').first().text().trim() || '0';

  return { exchangeRate, wti };
}

/**
 * 나스닥 지수 수집 (정적 HTML에 없으므로 스크립트 데이터 파싱)
 */
export async function fetchNasdaq() {
  const $ = await fetchHtml(`${NAVER_FINANCE_URL}/world/`);
  if (!$) return { price: '0', rate: '0%' };

  try {
    const scripts = $('script').map((i, el) => $(el).html()).get();
    const targetScript = scripts.find(s => s.includes('americaData'));
    
    if (targetScript) {
      // "NAS@IXIC" 블록 찾기 및 데이터 추출
      const blockRegex = /"NAS@IXIC"\s*:\s*\{([\s\S]*?)\}/;
      const blockMatch = targetScript.match(blockRegex);
      
      if (blockMatch && blockMatch[1]) {
        const block = blockMatch[1];
        const lastMatch = block.match(/"last"\s*:\s*([\d.]+)/);
        const rateMatch = block.match(/"rate"\s*:\s*([-\d.]+)/);
        
        if (lastMatch && rateMatch) {
          const rateVal = parseFloat(rateMatch[1]);
          return { 
            price: lastMatch[1], 
            rate: (rateVal > 0 ? '+' : '') + rateVal + '%' 
          };
        }
      }
    }
  } catch (e) {
    console.error('Error extracting Nasdaq data:', e.message);
  }

  // 폴백: 기존 텍스트 기반 검색
  const nasdaqRow = $('tr').filter((i, el) => $(el).text().includes('나스닥 종합')).first();
  let price = nasdaqRow.find('td').eq(2).text().trim() || '0';
  let rate = nasdaqRow.find('td').eq(4).text().trim() || '0%';
  return { price, rate: rate.includes('%') ? rate : extractRate(rate) };
}

/**
 * 나스닥100 지수 수집 (선물 대용)
 */
export async function fetchNqFutures() {
  const $ = await fetchHtml(`${NAVER_FINANCE_URL}/world/`);
  if (!$) return { rate: '0%' };

  try {
    const scripts = $('script').map((i, el) => $(el).html()).get();
    const targetScript = scripts.find(s => s.includes('americaData'));
    
    if (targetScript) {
      // "NAS@NDX" 블록 찾기 및 데이터 추출
      const blockRegex = /"NAS@NDX"\s*:\s*\{([\s\S]*?)\}/;
      const blockMatch = targetScript.match(blockRegex);
      
      if (blockMatch && blockMatch[1]) {
        const block = blockMatch[1];
        const rateMatch = block.match(/"rate"\s*:\s*([-\d.]+)/);
        
        if (rateMatch) {
          const rateVal = parseFloat(rateMatch[1]);
          return { rate: (rateVal > 0 ? '+' : '') + rateVal + '%' };
        }
      }
    }
  } catch (e) {
    console.error('Error extracting NQ futures data:', e.message);
  }

  const nqRow = $('tr').filter((i, el) => $(el).text().includes('나스닥 100')).first();
  let rate = nqRow.find('td').eq(4).text().trim() || '0%';
  return { rate: rate.includes('%') ? rate : extractRate(rate) };
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
        'Referer': 'https://edition.cnn.com/'
      }
    });
    const score = response.data?.fear_and_greed?.score;
    const rating = response.data?.fear_and_greed?.rating || '';
    if (score !== undefined) {
      return { score: Math.round(score), rating };
    }
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
    fetchNasdaq(),
    fetchNqFutures(),
    fetchCnnFearGreed()
  ]);

  return {
    kospi: results[0].status === 'fulfilled' ? results[0].value.kospi : { price: '-', rate: '-' },
    kosdaq: results[0].status === 'fulfilled' ? results[0].value.kosdaq : { price: '-', rate: '-' },
    exchangeRate: results[1].status === 'fulfilled' ? results[1].value.exchangeRate : '0',
    wti: results[1].status === 'fulfilled' ? results[1].value.wti : '0',
    nasdaq: results[2].status === 'fulfilled' ? results[2].value : { price: '-', rate: '0%' },
    nqFutures: results[3].status === 'fulfilled' ? results[3].value : { rate: '0%' },
    cnnFearGreed: results[4].status === 'fulfilled' ? results[4].value : null
  };
}
