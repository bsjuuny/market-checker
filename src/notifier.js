import { sendNotification } from '../../antigravity-bot/scripts/notify.mjs';

/**
 * 텔레그램으로 시장 요약 보고서를 전송합니다.
 * 전역 notify.mjs 허브를 사용하여 안정성과 레이트 리밋(Alert Shield) 통합
 */
export async function sendTelegramMessage(marketData, analysis) {
  const { kospi, kosdaq, nasdaq, exchangeRate, nqFutures, cnnFearGreed, vki } = marketData;
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
- CNN 공포탐욕: ${cnnFearGreed ? `${cnnFearGreed.score} (${cnnFearGreed.rating})` : 'N/A'}
- VKOSPI: ${vki ? vki.value.toFixed(2) : 'N/A'}

🧠 <b>판단 결과</b>
- Bear Score: <b>${bearScore} / 11</b>
- 시장 모드: <b>${mode}</b>

🔗 <a href="https://bsjuuny.github.io/market-checker/">상세 보기</a>
🔗 <a href="https://github.com/bsjuuny/market-checker/actions">상세 대시보드 보기</a>
  `.trim();

  try {
    await sendNotification(text, {
      prefix: '⚖️ [Market-Checker]',
      parse_mode: 'HTML'
    });
    console.log('✅ Telegram notification sent via global hub.');
  } catch (error) {
    console.error('❌ Failed to send Telegram message:', error.message);
  }
}
