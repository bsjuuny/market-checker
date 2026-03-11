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

    // 5. 텔레그램 알림 전송
    console.log('📤 Sending Telegram notification...');
    await sendTelegramMessage(marketData, analysis);
  } catch (error) {
    console.error('❌ Pipeline failed:', error);
    process.exit(1);
  }
}

main();
