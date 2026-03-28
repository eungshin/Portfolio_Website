---
id: adr-003
title: "Schema.org 기반 포트폴리오 데이터 구조"
status: accepted
date: 2026-03-22
category: data
tags: [schema-org, json, metadata, ontology, visual-artwork]
related: [adr-001]
---

# ADR-003: Schema.org 기반 포트폴리오 데이터 구조

## 맥락 (Context)
Behance에서 추출한 12개 프로젝트(69개 이미지)의 메타데이터를 구조화해야 했다. 각 프로젝트는 제목, 스타일, 매체, 제작일, 큐레이터 인사이트, 연관 이미지 목록 등 풍부한 정보를 갖고 있었다. SEO 최적화와 AI 가독성(AI-readable)을 동시에 만족하는 표준화된 구조가 필요했다.

## 결정 (Decision)
**Schema.org VisualArtwork** 어휘를 기반으로 각 프로젝트의 `metadata.json`을 구성한다.
- 최상위 인덱스: `portfolio/index.json` (CollectionPage 타입)
- 프로젝트별: `portfolio/<folder>/metadata.json` (VisualArtwork 타입)
- 프로젝트 순서: `portfolio/order.json`
- 이미지 순서: `portfolio/<folder>/image_order.json`
- DB 없음 — JSON 파일이 곧 데이터베이스

## 대안 및 기각 사유 (Alternatives)
- **SQLite**: 쿼리 가능, 단일 파일 / JSON 데이터 직접 수정 불편, 스키마 관리 필요 → 기각 사유: 프로젝트 수가 적어 파일 기반으로 충분
- **MongoDB/Firebase**: 클라우드 연동 / 외부 의존성 추가, 오프라인 작업 불가 → 기각 사유: 로컬 퍼스트 운영 선호
- **커스텀 JSON 스키마**: 자유도 높음 / 표준 없음, SEO 불리 → 기각 사유: Schema.org가 이미 포트폴리오에 적합한 어휘 제공

## 결과 (Consequences)
- (+) Google 구조화 데이터 호환 — SEO 이점
- (+) 사람이 읽을 수 있는 JSON — Git으로 변경 추적 가능
- (+) `index.json` 자동 재생성 — 서버 시작/변경 시 `regenerateIndex()` 호출
- (-) 대규모 확장 시 JSON 파일 기반은 비효율적 (현재 11개 프로젝트에서는 문제 없음)
- (-) 트랜잭션 보장 없음 — 서버 크래시 시 데이터 정합성 리스크

## 후속 조치 (Follow-ups)
- Cloudinary 전환 시 이미지 URL 참조 방식 변경 필요
- 메타데이터를 Vercel KV 또는 외부 저장소로 이전 검토
