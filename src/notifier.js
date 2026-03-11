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
${emoji} *국장 방향 체크리스트 요약*
📅 ${timestamp}

📊 *주요 지수*
- KOSPI: ${kospi.price} (${kospi.rate})
- KOSDAQ: ${kosdaq.price} (${kosdaq.rate})
- NASDAQ: ${nasdaq.price} (${nasdaq.rate})
- 환율: ${exchangeRate}원
- NQ선물: ${nqFutures.rate}

🧠 *판단 결과*
- Bear Score: *${bearScore} / 7*
- 시장 모드: *${mode}*

🔗 [상세 대시보드 보기](https://github.com/bsjuu/market-checker)
  `.trim();

  try {
    await axios.post(`https://api.telegram.org/bot${token}/sendMessage`, {
      chat_id: chatId,
      text: text,
      parse_mode: 'Markdown'
    });
    console.log('✅ Telegram notification sent successfully.');
  } catch (error) {
    console.error('❌ Failed to send Telegram message:', error.response?.data || error.message);
  }
}
