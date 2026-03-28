---
id: adr-004
title: "3D 휠 갤러리 UI 패턴"
status: accepted
date: 2026-03-23
category: ux
tags: [3d-wheel, gallery, gsap, css-transform, carousel]
related: [adr-001]
---

# ADR-004: 3D 휠 갤러리 UI 패턴

## 맥락 (Context)
일러스트레이터 포트폴리오의 메인 갤러리를 일반적인 그리드/리스트가 아닌, 작품의 예술적 가치를 강조하는 독특한 인터랙션으로 보여주고 싶었다. 스크롤 기반 네비게이션으로 직관적이면서도 시각적 임팩트가 있는 갤러리가 필요했다.

## 결정 (Decision)
**CSS 3D Transform + GSAP 애니메이션**으로 원형 휠 갤러리를 구현한다.
- 카드들이 3D 공간에서 원형으로 배치 (`rotateY` + `translateZ`)
- 스크롤/드래그로 휠 회전
- 포커스된 카드가 앞으로 돌출 + 정보 패널 표시
- `cardCount` 설정으로 Dashboard에서 표시 카드 수 조절 가능

## 대안 및 기각 사유 (Alternatives)
- **Masonry 그리드**: 검증된 패턴, Pinterest 스타일 / 모든 포트폴리오에서 쓰는 평범한 패턴 → 기각 사유: 차별화 부족
- **수평 스크롤 갤러리**: 구현 간단 / 3D 깊이감 없음 → 기각 사유: 시각적 임팩트 약함
- **WebGL/Three.js**: 최고의 3D 자유도 / 학습 비용, 성능 이슈, 접근성 문제 → 기각 사유: CSS Transform으로 충분한 효과 달성 가능

## 결과 (Consequences)
- (+) 방문자에게 강한 첫인상 — 아티스트 브랜딩에 효과적
- (+) CSS Transform 기반으로 GPU 가속, 부드러운 60fps 애니메이션
- (+) GSAP으로 세밀한 이징 제어 가능
- (-) 모바일에서 3D 효과 제한적 — 반응형 대응 필요
- (-) 카드 수가 20개 이상이면 겹침 발생 — `cardCount`로 제한

## 후속 조치 (Follow-ups)
- 모바일 반응형 레이아웃 최적화
- 프로젝트 상세 페이지(Detail View) 전환 애니메이션 개선
