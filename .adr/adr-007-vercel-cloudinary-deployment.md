---
id: adr-007
title: "Vercel + Cloudinary 배포 전략"
status: accepted
date: 2026-03-26
category: infrastructure
tags: [vercel, cloudinary, deployment, cdn, serverless, image-hosting]
related: [adr-001, adr-002, adr-003]
---

# ADR-007: Vercel + Cloudinary 배포 전략

## 맥락 (Context)
현재 포트폴리오는 로컬 Express 서버 + 파일 시스템으로 운영 중이다. 공개 배포를 위해 호스팅 플랫폼을 결정해야 한다. 주요 제약:
- Node.js 서버(Express)가 API + 이미지 업로드를 처리 중
- 이미지가 로컬 파일 시스템(`portfolio/` 폴더)에 저장됨
- 대시보드에서 이미지 업로드/삭제/순서변경 기능 필요
- GitHub 리포로 관리 중 (`github.com/eungshin/Portfolio_Website`)

## 결정 (Decision)
**Vercel**로 웹 앱을 배포하고, **Cloudinary**로 이미지를 관리한다.
- **Vercel**: 프론트엔드(정적 파일) + API Routes(서버리스 함수)
- **Cloudinary**: 이미지 업로드/저장/변환/CDN 서빙
- 메타데이터: Vercel KV 또는 JSON 파일로 관리 (결정 보류)

### 마이그레이션 계획
1. `server.js` Express 라우트 → `api/` 디렉토리의 Vercel Serverless Functions로 분리
2. 이미지 참조를 로컬 경로 → Cloudinary URL로 변경
3. `multer` + `sharp` → Cloudinary Upload API + 변환 파라미터로 대체
4. 기존 이미지 일괄 Cloudinary 업로드 스크립트 작성
5. `portfolio/order.json`, `metadata.json` → Vercel KV 또는 Vercel Blob 저장

## 대안 및 기각 사유 (Alternatives)
- **Railway/Render (PaaS)**: Express 그대로 배포 가능, persistent disk / 월 비용 발생, 스케일링 수동 → 기각 사유: 포트폴리오 수준 트래픽에 유료 PaaS는 과도
- **VPS (DigitalOcean/Lightsail)**: 완전 제어, 저렴 / 서버 관리 부담, SSL/도메인 직접 설정 → 기각 사유: 관리 오버헤드
- **GitHub Pages + 외부 API**: 무료 정적 호스팅 / API 서버 별도 필요, 이미지 업로드 불가 → 기각 사유: 대시보드 기능 호스팅 불가
- **Vercel + Vercel Blob (Cloudinary 없이)**: 단일 플랫폼 / Blob은 이미지 변환(리사이징, 포맷 변환) 미지원 → 기각 사유: 이미지 최적화 직접 구현 필요
- **Netlify + Cloudinary**: Netlify도 서버리스 함수 지원 / Vercel의 Next.js 생태계와 DX가 우수 → 기각 사유: Vercel이 배포 DX와 프리뷰 기능에서 우위

## 결과 (Consequences)
- (+) Vercel 무료 티어로 프론트엔드 + API 호스팅
- (+) Cloudinary 무료 티어(25GB 대역폭/월)로 이미지 CDN
- (+) 자동 HTTPS, 커스텀 도메인, Git 연동 자동 배포
- (+) Cloudinary 이미지 변환(리사이징, WebP 자동 변환)으로 성능 최적화
- (-) Express → Serverless 전환 작업 필요
- (-) 파일 시스템 의존 코드 전면 리팩토링
- (-) 두 개 서비스 관리 (Vercel + Cloudinary)

## 후속 조치 (Follow-ups)
- [ ] Cloudinary 계정 생성 및 API 키 발급
- [ ] 기존 이미지 Cloudinary 마이그레이션 스크립트 작성
- [ ] Express 라우트 → Vercel API Routes 변환
- [ ] 프론트엔드 이미지 경로를 Cloudinary URL로 변경
- [ ] 대시보드 업로드 로직을 Cloudinary Upload Widget 또는 API로 전환
- [ ] 메타데이터 저장소 결정 (Vercel KV vs Blob vs JSON)
- [ ] 커스텀 도메인 설정
