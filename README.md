# Market Checker

미국 증시와 거시 지표를 조합해 국내 증시 개장 전 시장 방향을 점검하는 자동화 대시보드입니다.

[서비스 바로가기](https://bsjuuny.github.io/market-checker/)

## 주요 기능

- 나스닥, 원/달러 환율, WTI, 나스닥 선물, CNN 공포·탐욕지수 수집
- 위험 조건별 Bear Score 계산
- 점수에 따른 Bull / Base / Bear 시장 모드 분류
- 시장 모드별 대응 시나리오와 자산 배분 참고 정보 제공
- 정적 HTML 대시보드 생성 및 Telegram 요약 알림
- GitHub Actions 기반 데이터 갱신 자동화

## 기술 스택

- Node.js / ECMAScript Modules
- Axios / Cheerio
- HTML / CSS / JavaScript
- GitHub Actions / GitHub Pages

## 로컬 실행

```bash
npm install
npm run dev
```

실행 결과는 `docs/index.html`에 생성됩니다.

Telegram 알림을 사용하려면 다음 환경 변수를 설정합니다.

```env
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_CHAT_ID=your_chat_id
```

## GitHub Pages 설정

저장소의 **Settings → Pages**에서 `main` 브랜치의 `/docs` 폴더를 배포 대상으로 선택합니다.

## 안내

이 프로젝트가 제공하는 시장 모드와 자산 배분 정보는 기술적 지표를 기반으로 한 참고 자료이며 투자 권유가 아닙니다.
