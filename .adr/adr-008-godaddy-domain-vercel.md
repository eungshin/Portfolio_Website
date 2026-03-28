---
id: adr-008
title: "GoDaddy 도메인 + Vercel DNS 연결 (A 레코드 방식)"
status: accepted
date: 2026-03-27
category: infrastructure
tags: [domain, dns, godaddy, vercel, ssl, a-record, cname]
related: [adr-007]
---

# ADR-008: GoDaddy 도메인 + Vercel DNS 연결 (A 레코드 방식)

## 맥락 (Context)
Vercel에 배포된 포트폴리오 사이트(`eungshin-portfolio.vercel.app`)에 GoDaddy에서 구매한 커스텀 도메인 `eungshin.xyz`를 연결해야 했다. GoDaddy는 네임서버(NS) 레코드 편집을 제한하고 있어, Vercel 네임서버로 전환하는 방식은 사용 불가했다.

## 결정 (Decision)
GoDaddy 네임서버를 유지하면서 **A 레코드 + CNAME 방식**으로 Vercel에 연결한다.

### DNS 설정
| 타입 | 이름 | 값 |
|---|---|---|
| A | `@` | `76.76.21.21` (Vercel IP) |
| CNAME | `www` | `cname.vercel-dns.com.` |

### 결과 도메인
- `eungshin.xyz` → A 레코드 → Vercel
- `www.eungshin.xyz` → CNAME → Vercel
- SSL 인증서: Vercel 자동 발급 (Let's Encrypt, 90일 자동 갱신)

## 대안 및 기각 사유 (Alternatives)
- **Vercel 네임서버로 전환** (`ns1.vercel-dns.com`): Vercel이 DNS 전체 관리, 자동 최적화 / GoDaddy에서 NS 편집 제한됨 → 기각 사유: GoDaddy 기본 NS 레코드가 삭제/편집 불가
- **Cloudflare 프록시 경유**: DDoS 방어, 추가 CDN / 불필요한 복잡도, Vercel Edge와 중복 → 기각 사유: 포트폴리오 수준에서 과도
- **서브도메인만 연결** (`portfolio.eungshin.xyz`): 루트 도메인 DNS 설정 불필요 / URL이 길어짐, 전문적이지 않음 → 기각 사유: 아티스트 브랜딩에 루트 도메인이 적합

## 결과 (Consequences)
- (+) `eungshin.xyz`와 `www.eungshin.xyz` 모두 HTTPS로 접근 가능
- (+) SSL 인증서 자동 발급/갱신 — 관리 비용 제로
- (+) GoDaddy의 기존 이메일/DNS 설정 영향 없음
- (-) Vercel 네임서버 방식 대비 DNS 전파 속도가 느릴 수 있음 (GoDaddy TTL 1시간)
- (-) Vercel의 DNS 최적화 기능(Edge Network 자동 라우팅) 일부 미적용

## 후속 조치 (Follow-ups)
- GoDaddy 도메인 갱신 일정 확인 (만료 방지)
- 향후 Vercel 네임서버 전환이 가능해지면 재검토
