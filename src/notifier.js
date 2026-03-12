import axios from 'axios';

/**
 * 텔레그램으로 시장 요약 보고서를 전송합니다.
 */
export async function sendTelegramMessage(marketData, analysis) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn('⚠️ Telegram token or chat ID is missing. Skipping notification.');
    return;
  }

  const { kospi, kosdaq, nasdaq, exchangeRate, nqFutures } = marketData;
  const { bearScore, mode, timestamp } = analysis;

  const emoji = mode === 'Bull' ? '🚀' : mode === 'Base' ? '⚖️' : '🐻';
  
  const text = `
<b>${emoji} 국장 방향 체크리스트 요약</b>
📅 ${timestamp}

📊 <b>주요 지수</b>
- KOSPI: ${kospi.price} (${kospi.rate})
- KOSDAQ: ${kosdaq.price} (${kosdaq.rate})
- NASDAQ: ${nasdaq.price} (${nasdaq.rate})
- 환율: ${exchangeRate}원
- NQ선물: ${nqFutures.rate}

🧠 <b>판단 결과</b>
- Bear Score: <b>${bearScore} / 7</b>
- 시장 모드: <b>${mode}</b>

🔗 <a href="https://github.com/bsjuuny/market-checker">상세 대시보드 보기</a>
  `.trim();

  try {
    console.log(`📡 Sending to Telegram... (Token: ${token.substring(0, 5)}***, ChatId: ${chatId})`);
    
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    }, { timeout: 10000 });
    console.log('✅ Telegram notification sent successfully.');
  } catch (error) {
    console.error('❌ Failed to send Telegram message:');
    if (error.response) {
      console.error('  Status:', error.response.status);
      console.error('  Data:', JSON.stringify(error.response.data));
    } else {
      console.error('  Message:', error.message);
      console.error('  Code:', error.code);
    }
  }
}
