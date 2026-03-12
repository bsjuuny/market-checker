# 국장 방향 체크리스트 (Market Checker)

매 평일 오전 7시, 네이버 금융 데이터를 자동으로 수집하여 시장 상황을 판단하고 대시보드를 생성하는 프로젝트입니다.

## 주요 기능
- **데이터 분석**: 나스닥, 환율, WTI 유가, 야간 선물을 기반으로 'Bear Score' 산출.
- **자동화**: GitHub Actions를 통해 매 평일 정해진 시간에 업데이트 및 자동 배포.
- **포트폴리오 제안**: 시장 상황(Bull/Base/Bear)에 따른 권장 자산 비중 표시.

## 기술 스택
- Runtime: Node.js (ESM)
- Scraping: axios, cheerio
- Automation: GitHub Actions
- Hosting: GitHub Pages (docs/)

## 설치 및 실행 방법

### 로컬 실행 및 푸시
1. 저장소 클론
2. 의존성 설치:
   ```bash
   npm install
   ```
3. 스크래퍼 실행 및 GitHub 푸시:
   ```bash
   npm run build:push
   ```
   *이 명령은 `docs/index.html`을 생성한 뒤 자동으로 git commit & push를 수행합니다.*

### 배포 설정
이 프로젝트는 GitHub Pages를 통해 배포됩니다.
1. GitHub 저장소 설정(Settings) -> Pages에서 Source를 `Deploy from a branch`로 선택.
2. Branch를 `main` (또는 해당 브랜치), Folder를 `/docs`로 설정합니다.

### 텔레그램 알림 설정
#### 1. 로컬 환경 (.env 파일)
로컬에서 테스트하려면 프로젝트 루트 폴더에 `.env` 파일을 생성하고 정보를 입력하세요:
```env
TELEGRAM_BOT_TOKEN=여러분의_봇_토큰
TELEGRAM_CHAT_ID=여러분의_채팅_ID
```

#### 2. GitHub Actions (Remote)
GitHub 저장소 -> `Settings` -> `Secrets and variables` -> `Actions`로 이동.
2. `New repository secret` 버튼 클릭 후 다음 항목 추가:
   - `TELEGRAM_BOT_TOKEN`: 텔레그램 BotFather에서 발급받은 봇 토큰.
   - `TELEGRAM_CHAT_ID`: 알림을 받을 채팅방 ID (또는 본인의 ID).

> [!TIP]
> **"chat not found" 에러가 발생하나요?**
> 1. 텔레그램에서 생성한 봇에게 **먼저 아무 메시지나 보내거나 `/start`를 클릭**해야 합니다. (봇이 사용자를 먼저 찾을 수 없습니다.)
> 2. `TELEGRAM_CHAT_ID`가 정확한지 확인하세요. [@userinfobot](https://t.me/userinfobot)을 통해 본인의 ID를 확인할 수 있습니다.

## 배포 경로
- `https://[사용자명].github.io/market-checker/` (저장소 이름에 따라 다를 수 있습니다.)
