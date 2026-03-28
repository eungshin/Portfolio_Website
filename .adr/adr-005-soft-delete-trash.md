---
id: adr-005
title: "소프트 삭제(Trash) 패턴"
status: accepted
date: 2026-03-25
category: architecture
tags: [soft-delete, trash, file-management, undo, safety]
related: [adr-002, adr-003]
---

# ADR-005: 소프트 삭제(Trash) 패턴

## 맥락 (Context)
대시보드에서 프로젝트/이미지를 삭제할 때, 아티스트의 원본 작품 파일이 실수로 영구 삭제되는 것을 방지해야 했다. 포트폴리오 이미지는 대체 불가능한 자산이므로 안전장치가 필수였다.

## 결정 (Decision)
삭제 시 파일을 `portfolio/.trash/<folder>/` 디렉토리로 **이동**(soft-delete)한다.
- 프로젝트 삭제: `portfolio/<folder>` → `portfolio/.trash/<folder>`
- 이미지 삭제: `portfolio/<folder>/<file>` → `portfolio/.trash/<folder>/<file>`
- `.trash`는 `EXCLUDED_FOLDERS`에 포함되어 스캔에서 제외
- 복원: 수동으로 `.trash`에서 원래 위치로 이동 (Dashboard UI 미구현)

## 대안 및 기각 사유 (Alternatives)
- **영구 삭제 (fs.remove)**: 구현 간단 / 실수 시 복구 불가 → 기각 사유: 아티스트 작품 영구 손실 위험
- **삭제 시 확인 다이얼로그만**: UI 안전장치 / 확인 후에도 영구 삭제 → 기각 사유: 기술적 안전장치 부재
- **버전 관리 (Git LFS)**: 완전한 히스토리 / 대용량 이미지 저장소 비용, 복잡도 → 기각 사유: 과도한 엔지니어링

## 결과 (Consequences)
- (+) 실수로 삭제해도 `.trash`에서 복원 가능
- (+) 삭제 확인 모달 + 소프트 삭제로 이중 안전장치
- (-) `.trash` 폴더 용량이 계속 증가 → 주기적 정리 필요
- (-) Windows EBUSY 문제 — `safeReplace`로 이동 시 파일 락 처리 필요

## 후속 조치 (Follow-ups)
- Dashboard에 휴지통 관리 UI 추가 (복원/영구삭제)
- `.trash` 자동 정리 정책 (예: 30일 이후 자동 삭제)
