import { sendNotification } from '../../antigravity-bot/scripts/notify.mjs';

export async function sendTelegramMessage(marketData, analysis) {
  const { kospi, kosdaq, nasdaq, exchangeRate, exchangeChange, nqFutures, sox, spx,
          eurostoxx, dax, ftse, nikkei, hangseng, shanghai, cnnFearGreed, foreignInvestor } = marketData;
  const { bearScore, bearScoreMax, mode, scores, timestamp } = analysis;
  const emoji = mode === 'Bull' ? '🚀' : mode === 'Base' ? '⚖️' : '🐻';

  const exChangeStr = scores.exchangeChange > 0
    ? `+${scores.exchangeChange.toFixed(2)}원`
    : `${scores.exchangeChange.toFixed(2)}원`;

  const foreignStr = foreignInvestor
    ? `${foreignInvestor.foreign >= 0 ? '+' : ''}${foreignInvestor.foreign.toLocaleString()}억원 (${foreignInvestor.date})`
    : 'N/A';

  const text = `
<b>${emoji} 국장 방향 체크리스트 요약</b>
📅 ${timestamp}

🇺🇸 <b>미국 지수</b>
- NASDAQ: ${nasdaq.price} (${nasdaq.rate})
- S&amp;P500: ${spx.price} (${spx.rate})
- SOX 반도체: ${sox.rate}
- NQ100 선물: ${nqFutures.rate}
- CNN 공포탐욕: ${cnnFearGreed ? `${cnnFearGreed.score} (${cnnFearGreed.rating})` : 'N/A'}

🌍 <b>유럽 지수</b>
- Euro Stoxx50: ${eurostoxx.rate}
- DAX (독일): ${dax.rate}
- FTSE100 (영국): ${ftse.rate}

🌏 <b>아시아 지수</b>
- 닛케이225: ${nikkei.rate}
- 항셍: ${hangseng.rate}
- 상하이: ${shanghai.rate}

🇰🇷 <b>국내 지표</b>
- KOSPI: ${kospi.price} (${kospi.rate})
- KOSDAQ: ${kosdaq.price} (${kosdaq.rate})
- 환율: ${exchangeRate}원 (전일比 ${exChangeStr})
- 외국인수급: ${foreignStr}

🧠 <b>판단 결과</b>
- Bear Score: <b>${bearScore} / ${bearScoreMax}</b>
- 시장 모드: <b>${mode}</b>

🔗 <a href="https://bsjuuny.github.io/market-checker/">상세 보기</a>
  `.trim();

  try {
    await sendNotification(text, {
      prefix: '⚖️ [Market-Checker]',
      parse_mode: 'HTML',
    });
    console.log('✅ Telegram sent.');
  } catch (error) {
    console.error('❌ Telegram failed:', error.message);
  }
}
