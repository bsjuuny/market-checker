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

const isSilent = process.argv.includes('--silent');

async function main() {
  console.log('🚀 Starting Market Checker Pipeline...');

  try {
    // 1. 데이터 수집
    console.log('📊 Fetching market data...');
    const marketData = await fetchAllMarketData();
    console.log(`✅ Data fetched — NAS ${marketData.nasdaq.rate} | SOX ${marketData.sox.rate} | SPX ${marketData.spx.rate} | EU ${marketData.eurostoxx.rate} | NK ${marketData.nikkei.rate}`);

    // 2. 데이터 분석
    console.log('🧠 Analyzing market conditions...');
    const analysis = analyzeMarketData(marketData);
    console.log(`✅ Analysis — Mode: ${analysis.mode}, BearScore: ${analysis.bearScore}/${analysis.bearScoreMax} (NAS:${analysis.scores.nasdaq}% SOX:${analysis.scores.sox}% EU:${analysis.scores.eurostoxx}% NK:${analysis.scores.nikkei}%)`);

    // 3. HTML 생성
    console.log('🏗️ Building HTML dashboard...');
    const html = buildHtml(marketData, analysis);

    const docsDir = path.resolve('docs');
    if (!fs.existsSync(docsDir)) fs.mkdirSync(docsDir, { recursive: true });
    fs.writeFileSync(path.join(docsDir, 'index.html'), html, 'utf8');
    console.log('✨ Generated docs/index.html');

    // 4. mode.json 저장 (kis-trader가 읽는 파일)
    const today = new Date().toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })
      .replace(/\. /g, '-').replace(/\.$/, '').split('-')
      .map((v, i) => i === 0 ? v : v.padStart(2, '0')).join('-');

    const nqRate     = analysis.scores.nq;
    const nasRate    = analysis.scores.nasdaq;
    const kospiRate  = parseFloat((marketData.kospi?.rate  || '0').replace(/[%+]/g, ''));
    const kosdaqRate = parseFloat((marketData.kosdaq?.rate || '0').replace(/[%+]/g, ''));

    // kis-trader 모드: NQ + 나스닥 기준 (기존 로직 유지)
    let kisMode = 'Base';
    if (nqRate >= 0.5 && nasRate >= 0.5) kisMode = 'Bull';
    else if (nqRate <= -0.5 || nasRate <= -1.0) kisMode = 'Bear';

    const modeJson = {
      date: today,
      status: 'completed',
      mode: kisMode,
      display_mode: analysis.mode,
      bear_score: analysis.bearScore,
      bear_score_max: analysis.bearScoreMax,
      kospi_change: kospiRate,
      kosdaq_change: kosdaqRate,
      data: {
        nq_futures:  nqRate,
        nasdaq:      nasRate,
        sox:         analysis.scores.sox,
        spx:         analysis.scores.spx,
        kospi:       kospiRate,
        kosdaq:      kosdaqRate,
        exchange_change: analysis.scores.exchangeChange,
        cnn_fear_greed:  analysis.scores.cnn,
        foreign_investor_bn:   marketData.foreignInvestor?.foreign ?? null,
        foreign_investor_date: marketData.foreignInvestor?.date ?? null,
        eurostoxx: analysis.scores.eurostoxx,
        dax:       analysis.scores.dax,
        ftse:      analysis.scores.ftse,
        nikkei:    analysis.scores.nikkei,
        hangseng:  analysis.scores.hangseng,
        shanghai:  analysis.scores.shanghai,
      },
    };

    const kisTraderDataDir = 'C:/github/kis-trader/data';
    if (!fs.existsSync(kisTraderDataDir)) fs.mkdirSync(kisTraderDataDir, { recursive: true });
    fs.writeFileSync(path.join(kisTraderDataDir, 'mode.json'), JSON.stringify(modeJson, null, 2), 'utf8');
    console.log(`✅ mode.json — ${modeJson.date} kisMode=${kisMode} displayMode=${analysis.mode} bearScore=${analysis.bearScore}/${analysis.bearScoreMax}`);

    // 5. 텔레그램 알림 (silent 모드에서는 생략)
    if (isSilent) {
      console.log('🔕 Silent mode — Telegram skipped');
    } else {
      console.log('📤 Sending Telegram notification...');
      await sendTelegramMessage(marketData, analysis);
    }
  } catch (error) {
    console.error('❌ Pipeline failed:', error);
    process.exit(1);
  }
}

main();
