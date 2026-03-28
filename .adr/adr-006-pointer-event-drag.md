---
id: adr-006
title: "포인터 이벤트 기반 드래그 정렬 채택"
status: accepted
date: 2026-03-26
category: ux
tags: [drag-and-drop, pointer-events, sortable, reorder]
related: [adr-001, adr-004]
---

# ADR-006: 포인터 이벤트 기반 드래그 정렬 채택

## 맥락 (Context)
대시보드에서 프로젝트 순서와 이미지 순서를 드래그로 변경하는 기능이 필요했다. 초기 구현은 HTML5 Drag & Drop API를 사용했으나, 이미지가 포함된 요소에서 브라우저의 네이티브 이미지 드래그가 커스텀 드래그를 가로채는 문제가 발생했다. Windows + 다양한 브라우저에서 일관되게 동작하지 않았다.

## 결정 (Decision)
HTML5 Drag & Drop API를 폐기하고 **Pointer Events API** (pointerdown/pointermove/pointerup)로 직접 구현한다.
- 드래그 시작: `pointerdown` → 고스트 클론 생성 (fixed position)
- 드래그 중: `pointermove` → 클론 위치 업데이트 + hit-test로 드롭 대상 감지
- 드래그 종료: `pointerup` → 배열 splice로 순서 변경 + 리렌더링
- CSS: `touch-action: none`, `user-select: none`, `pointer-events: none` (이미지)

## 대안 및 기각 사유 (Alternatives)
- **HTML5 Drag & Drop API**: 브라우저 내장 / 이미지 네이티브 드래그 충돌, grid 레이아웃에서 dragover 감지 불안정 → 기각 사유: 실제 사용 시 동작하지 않음
- **SortableJS 라이브러리**: 검증된 솔루션 / 외부 의존성 추가 → 기각 사유: 프로젝트가 zero-dependency 철학, 라이브러리 도입 대비 직접 구현이 충분히 간단
- **Touch Events API**: 터치 지원 / 마우스 별도 처리 필요 → 기각 사유: Pointer Events가 마우스+터치 통합 처리

## 결과 (Consequences)
- (+) 마우스와 터치 모두 단일 코드로 처리
- (+) 네이티브 이미지 드래그 충돌 완전 해결
- (+) 고스트 클론으로 직관적인 시각 피드백
- (-) 스크롤 중 드래그, 긴 리스트에서 자동 스크롤 등 고급 기능은 미구현

## 후속 조치 (Follow-ups)
- 긴 리스트에서 드래그 시 자동 스크롤 기능 추가 검토
