import axios from 'axios';
import * as cheerio from 'cheerio';

const NAVER_FINANCE_URL = 'https://finance.naver.com';

/**
 * 네이버 금융에서 데이터를 가져오는 공통 유틸리티
 */
async function fetchHtml(url) {
  try {
    const { data } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    return cheerio.load(data);
  } catch (error) {
    console.error(`Error fetching ${url}:`, error.message);
    return null;
  }
}

/**
 * 코스피/코스닥 지수 수집
 */
export async function fetchDomesticIndices() {
  const $ = await fetchHtml(`${NAVER_FINANCE_URL}/sise/`);
  if (!$) return { kospi: { price: '0', rate: '0' }, kosdaq: { price: '0', rate: '0' } };

  const kospiPrice = $('#KOSPI_now').text().trim();
  const kospiRate = $('#KOSPI_change').text().trim().split(' ')[1] || '0%';
  
  const kosdaqPrice = $('#KOSDAQ_now').text().trim();
  const kosdaqRate = $('#KOSDAQ_change').text().trim().split(' ')[1] || '0%';

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

  // 환율 (첫 번째 항목이 보통 원달러 환율)
  const exchangeRate = $('.exchange_value').first().text().trim().replace(/,/g, '');

  // WTI 유가 (원자재 탭의 데이터는 별도 페이지일 수 있으나 메인에서도 일부 노출됨)
  // 여기서는 명세에 따라 #oilList WTI를 찾음. 실제 구조 확인 필요.
  const wti = $('#oilList .value').first().text().trim() || '0';

  return { exchangeRate, wti };
}

/**
 * 나스닥 지수 수집
 */
export async function fetchNasdaq() {
  const $ = await fetchHtml(`${NAVER_FINANCE_URL}/world/`);
  if (!$) return { price: '0', rate: '0%' };

  // 해외증시 테이블에서 나스닥 찾기 (보통 상단에 위치)
  const nasdaqRow = $('tr:contains("나스닥")');
  const price = nasdaqRow.find('td').eq(1).text().trim();
  const rate = nasdaqRow.find('td').eq(3).text().trim();

  return { price, rate };
}

/**
 * 나스닥100 선물 수집 (마켓인덱스 해외선물 탭 활용)
 */
export async function fetchNqFutures() {
  const $ = await fetchHtml(`${NAVER_FINANCE_URL}/marketindex/?tabSel=worldExchange`);
  if (!$) return { rate: '0%' };

  // 나스닥 100 선물 찾기
  const nqRow = $('tr:contains("나스닥100 선물")');
  const rate = nqRow.find('td').last().text().trim() || '0%';

  return { rate };
}

/**
 * 모든 데이터 통합 수집
 */
export async function fetchAllMarketData() {
  const results = await Promise.allSettled([
    fetchDomesticIndices(),
    fetchMarketIndex(),
    fetchNasdaq(),
    fetchNqFutures()
  ]);

  const data = {
    kospi: results[0].status === 'fulfilled' ? results[0].value.kospi : { price: '-', rate: '-' },
    kosdaq: results[0].status === 'fulfilled' ? results[0].value.kosdaq : { price: '-', rate: '-' },
    exchangeRate: results[1].status === 'fulfilled' ? results[1].value.exchangeRate : '0',
    wti: results[1].status === 'fulfilled' ? results[1].value.wti : '0',
    nasdaq: results[2].status === 'fulfilled' ? results[2].value : { price: '-', rate: '0%' },
    nqFutures: results[3].status === 'fulfilled' ? results[3].value : { rate: '0%' }
  };

  return data;
}
