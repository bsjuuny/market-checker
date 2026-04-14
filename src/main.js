import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dirname, '../.env.local') });
dotenv.config({ path: resolve(__dirname, '../.env') });
import fs from 'fs';
import path from 'path';
import { fetchAllMarketData } from './scraper.js';
import { analyzeMarketData } from './logic.js';
import { buildHtml } from './builder.js';
import { sendTelegramMessage } from './notifier.js';

async function main() {
  console.log('🚀 Starting Market Checker Pipeline...');

  try {
    // 1. 데이터 수집
    console.log('📊 Fetching market data from Naver Finance...');
    const marketData = await fetchAllMarketData();
    console.log('✅ Data fetched successfully.');

    // 2. 데이터 분석
    console.log('🧠 Analyzing market conditions...');
    const analysis = analyzeMarketData(marketData);
    console.log(`✅ Analysis complete. Mode: ${analysis.mode}, Bear Score: ${analysis.bearScore}`);

    // 3. HTML 생성
    console.log('🏗️ Building HTML dashboard...');
    const html = buildHtml(marketData, analysis);

    // 4. 파일 저장 (docs/index.html)
    const docsDir = path.resolve('docs');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }

    const outputPath = path.join(docsDir, 'index.html');
    fs.writeFileSync(outputPath, html, 'utf8');
    console.log(`✨ Successfully generated: ${outputPath}`);

    // 5. mode.json 저장 (kis-trader가 읽는 파일)
    const today = new Date().toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })
      .replace(/\. /g, '-').replace(/\.$/, '').split('-')
      .map((v, i) => i === 0 ? v : v.padStart(2, '0')).join('-');
    const nqRate = parseFloat((marketData.nqFutures?.rate || '0').replace(/[%+]/g, ''));
    const nasRate = parseFloat((marketData.nasdaq?.rate || '0').replace(/[%+]/g, ''));
    const kospiRate = parseFloat((marketData.kospi?.rate || '0').replace(/[%+]/g, ''));
    const kosdaqRate = parseFloat((marketData.kosdaq?.rate || '0').replace(/[%+]/g, ''));
    
    // kis-trader 전용 모드: 나스닥/NQ 등락률만으로 단순 판단 (market-checker 복합 지표와 분리)
    // kis-trader market_mode.py 기준: nq >= +0.5% AND nasdaq >= +0.5% → Bull
    //                                 nq <= -0.5% OR  nasdaq <= -1.0% → Bear
    let kisMode = 'Base';
    if (nqRate >= 0.5 && nasRate >= 0.5) kisMode = 'Bull';
    else if (nqRate <= -0.5 || nasRate <= -1.0) kisMode = 'Bear';

    const modeJson = {
      date: today,
      status: 'completed',
      mode: kisMode,           // kis-trader용 (나스닥/NQ 기준)
      display_mode: analysis.mode,  // 웹 리포트용 (복합 지표 기준)
      bear_score: analysis.bearScore,
      kospi_change: kospiRate,
      kosdaq_change: kosdaqRate,
      data: {
        nq_futures: nqRate,
        nasdaq: nasRate,
        kospi: kospiRate,
        kosdaq: kosdaqRate
      },
    };
    console.log(`✅ kis-trader 모드: ${kisMode} (nq=${nqRate > 0 ? '+' : ''}${nqRate}% nas=${nasRate > 0 ? '+' : ''}${nasRate}%) / 웹 표시: ${analysis.mode} (bearScore=${analysis.bearScore})`);
    const kisTraderDataDir = 'C:/github/kis-trader/data';
    if (!fs.existsSync(kisTraderDataDir)) fs.mkdirSync(kisTraderDataDir, { recursive: true });
    fs.writeFileSync(path.join(kisTraderDataDir, 'mode.json'), JSON.stringify(modeJson, null, 2), 'utf8');
    console.log(`✅ mode.json 저장: ${modeJson.date} mode=${modeJson.mode} nq=${nqRate} nas=${nasRate}`);

    // 6. 텔레그램 알림 전송
    console.log('📤 Sending Telegram notification...');
    await sendTelegramMessage(marketData, analysis);
  } catch (error) {
    console.error('❌ Pipeline failed:', error);
    process.exit(1);
  }
}

main();
