# GPRET-TOKEN

# 🏙️ GPRET (Global Prime Real Estate Token)
*Zero Revenue Version - Pure Technology Demonstration*

## 📋 프로젝트 개요

GPRET는 전세계 주요 도시의 프리미엄 부동산 가격을 추적하는 **완전 무수익** ERC-20 토큰입니다. 

### 🎯 핵심 특징
- **Zero Revenue**: 개발자 수익 0%, 거래 수수료 0%
- **Pure Technology**: 순수 기술 검증 및 커뮤니티 구축 목적
- **Global Tracking**: 세계 10대 도시 프리미엄 부동산 가격 추적
- **Community Driven**: 완전한 커뮤니티 거버넌스

## 🌏 추적 대상 도시
1. **뉴욕** (Manhattan Premium)
2. **런던** (Central London)
3. **도쿄** (Shibuya/Shinjuku)
4. **홍콩** (Central District)
5. **싱가포르** (Orchard Road)
6. **파리** (1st Arrondissement)
7. **시드니** (CBD Area)
8. **토론토** (Downtown Core)
9. **서울** (강남구)
10. **취리히** (City Center)

## 🔧 기술 스택

### 블록체인
- **Network**: Arbitrum (Ethereum L2)
- **Standard**: ERC-20
- **Language**: Solidity ^0.8.19
- **Framework**: Hardhat

### Oracle System
- **Language**: Node.js
- **APIs**: Multiple free real estate APIs
- **Update**: Daily automated updates
- **Verification**: Multi-source price validation

### Frontend (계획)
- **Framework**: React.js
- **Web3**: ethers.js
- **UI**: Modern responsive design
- **Charts**: Real-time price visualization

## 📊 토큰 정보

```
토큰명: GPRET (Global Prime Real Estate Token)
심볼: GPRET
총 공급량: 1,000,000,000 (10억 개)
소수점: 18
네트워크: Arbitrum
```

### 💎 토큰 기능
- ✅ **가격 추적**: 실시간 부동산 가격 지수 반영
- ✅ **무보상 스테이킹**: 커뮤니티 참여 (보상 없음)
- ✅ **거버넌스**: 커뮤니티 투표 권한
- ❌ **수익 창출**: 일체의 수익 구조 없음

## 🚀 로드맵

### Phase 1: 개발 (Month 1)
- [x] 스마트 컨트랙트 개발
- [x] Oracle 시스템 구축
- [ ] 테스트넷 배포
- [ ] 보안 감사

### Phase 2: 커뮤니티 (Month 2)
- [ ] Discord 커뮤니티 구축
- [ ] 베타 테스터 모집
- [ ] 웹앱 개발
- [ ] 피드백 수집

### Phase 3: 런칭 (Month 3)
- [ ] 메인넷 배포
- [ ] DEX 유동성 풀 생성
- [ ] 공식 런칭
- [ ] 커뮤니티 확장

## 💻 설치 및 실행

### 요구사항
- Node.js 16+
- npm 또는 yarn
- MetaMask 지갑

### 개발 환경 설정
```bash
# 저장소 클론
git clone https://github.com/[YOUR_USERNAME]/gpret-token.git
cd gpret-token

# 의존성 설치
npm install

# 환경변수 설정
cp .env.example .env
# .env 파일에 필요한 값들 입력

# 컴파일
npx hardhat compile

# 테스트 실행
npx hardhat test

# 테스트넷 배포
npx hardhat run scripts/deploy.js --network goerli
```

## 🧪 테스트

```bash
# 모든 테스트 실행
npm test

# 특정 테스트 실행
npx hardhat test test/GPRET.test.js

# 가스 리포트
npm run gas-report

# 커버리지 확인
npm run coverage
```

## 📄 스마트 컨트랙트

### 주요 컨트랙트
- `GPRET.sol`: 메인 토큰 컨트랙트
- `GPRETStaking.sol`: 무보상 스테이킹 시스템
- `GPRETOracle.sol`: 가격 오라클 시스템

### 배포된 컨트랙트 (테스트넷)
```
Network: Goerli Testnet
GPRET Token: [배포 후 주소 입력]
Staking Contract: [배포 후 주소 입력]
Oracle Contract: [배포 후 주소 입력]
```

## 🔒 보안

### 감사 완료 항목
- [ ] 스마트 컨트랙트 보안 감사
- [ ] Oracle 시스템 검증
- [ ] 프론트엔드 보안 체크
- [ ] 커뮤니티 코드 리뷰

### 알려진 제한사항
- 무수익 구조로 인한 토큰 가치 변동성
- Oracle 시스템의 외부 API 의존성
- 테스트넷 단계에서의 기능 제한

## 👥 커뮤니티

### 소통 채널
- **Discord**: [서버 생성 후 링크 입력 예정]
- **GitHub**: https://github.com/[sunmi.yu]/gpret-token
- 

### 기여 방법
1. Issues에서 버그 리포트 또는 기능 제안
2. Pull Request로 코드 기여
3. 커뮤니티 토론 참여
4. 베타 테스트 참여

## 📜 라이선스

MIT License - 자세한 내용은 [LICENSE](LICENSE) 파일 참조

## ⚠️ 면책 조항

**중요**: GPRET는 완전 무수익 토큰입니다.
- 투자 목적이 아닌 기술 검증용입니다
- 어떠한 금전적 보상도 약속하지 않습니다
- 토큰 가격 상승을 보장하지 않습니다
- 참여는 순수 기술적 관심으로만 하시기 바랍니다

## 🔮 비전

GPRET는 블록체인 기술이 실제 자산 추적에 어떻게 활용될 수 있는지 보여주는 **기술 데모**입니다. 수익을 추구하지 않음으로써 순수한 기술적 혁신과 커뮤니티 구축에 집중합니다.

---

**Made with ❤️ for the blockchain community**

*Last updated: [현재 날짜]*
