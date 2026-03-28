---
id: adr-001
title: "Vanilla HTML/CSS/JS SPA 아키텍처 채택"
status: accepted
date: 2026-03-23
category: tech_stack
tags: [html, css, javascript, spa, gsap, pretendard]
related: []
---

# ADR-001: Vanilla HTML/CSS/JS SPA 아키텍처 채택

## 맥락 (Context)
일러스트레이터 김응신의 포트폴리오 웹사이트를 구축해야 했다. 작품 이미지를 3D 휠 갤러리 형태로 보여주는 것이 핵심 요구사항이며, 프로젝트 상세 페이지, About, Contact 섹션이 필요했다. 아티스트 포트폴리오 특성상 화려한 비주얼과 부드러운 애니메이션이 중요하고, 콘텐츠 변경 빈도가 낮아 복잡한 상태 관리가 불필요했다.

## 결정 (Decision)
React/Vue/Next.js 등 프레임워크 없이 **순수 HTML + CSS + JavaScript**로 구축한다.
- 애니메이션: **GSAP** (CDN)
- 폰트: **Pretendard** (CDN)
- 구조: 단일 `index.html` SPA, 섹션 기반 네비게이션
- 빌드 도구: 없음 (번들러, 트랜스파일러 불필요)

## 대안 및 기각 사유 (Alternatives)
- **Next.js (React)**: SSR/SSG 지원, 컴포넌트 재사용 가능 / 빌드 설정 복잡, 아티스트 포트폴리오에 과도한 엔지니어링 → 기각 사유: 콘텐츠가 동적이지 않고, GSAP 직접 DOM 조작이 React의 가상 DOM과 충돌할 수 있음
- **Svelte/SvelteKit**: 경량, 컴파일 기반 / 생태계가 작고 학습 비용 → 기각 사유: 프로젝트 규모 대비 과도함
- **WordPress/Squarespace**: 코딩 불필요 / 3D 휠 갤러리 같은 커스텀 인터랙션 구현 불가 → 기각 사유: 디자인 자유도 부족

## 결과 (Consequences)
- (+) 빌드 없이 즉시 실행 가능, 파일 구조 단순
- (+) GSAP과 직접 DOM 조작으로 최대 애니메이션 자유도
- (+) 배포 시 정적 호스팅 가능 (API 부분만 서버리스)
- (-) 코드 재사용성 낮음 (컴포넌트 시스템 없음)
- (-) 타입 안전성 없음 (TypeScript 미사용)

## 후속 조치 (Follow-ups)
- Dashboard (관리 페이지)도 같은 Vanilla 구조로 구축
- 프로젝트 규모가 커지면 컴포넌트 시스템 도입 재검토
