---
id: adr-002
title: "Express.js 백엔드 서버 채택"
status: accepted
date: 2026-03-23
category: tech_stack
tags: [express, nodejs, api, multer, sharp, server]
related: [adr-001]
---

# ADR-002: Express.js 백엔드 서버 채택

## 맥락 (Context)
포트폴리오 대시보드에서 프로젝트와 이미지를 관리(업로드, 삭제, 순서 변경, 메타데이터 편집)하는 기능이 필요했다. 프론트엔드가 Vanilla JS SPA이므로 REST API를 제공할 서버가 필요했고, 이미지 업로드 시 압축(리사이징)과 파일 시스템 조작이 요구되었다.

## 결정 (Decision)
**Express.js** 단일 서버로 정적 파일 서빙 + REST API를 통합 운영한다.
- 이미지 업로드: **multer** (multipart/form-data 처리)
- 이미지 압축: **sharp** (JPEG/PNG 품질 최적화)
- 파일 시스템: **fs-extra** (디렉토리 생성, JSON 읽기/쓰기)
- 포트: 3000 (개발 환경)

## 대안 및 기각 사유 (Alternatives)
- **Fastify**: Express보다 빠름 / 미들웨어 생태계가 Express에 비해 작음 → 기각 사유: 포트폴리오 수준의 트래픽에서 성능 차이 무의미
- **Hono/Elysia**: 초경량 / Windows 호환성 불확실, 생태계 작음 → 기각 사유: 안정성 우선
- **서버리스 (Vercel Functions)**: 배포 편의 / 파일 시스템 직접 접근 불가, 이미지 업로드 처리에 제약 → 기각 사유: 로컬 개발 단계에서 파일 시스템 직접 관리 필요

## 결과 (Consequences)
- (+) 단일 프로세스에서 정적 서빙 + API + 이미지 처리 통합
- (+) multer + sharp 조합으로 업로드 → 압축 → 저장 파이프라인 완성
- (+) Windows 환경에서 안정 동작
- (-) Express static이 Windows에서 파일 핸들을 잡고 있어 EBUSY 에러 발생 → `safeReplace` 로직으로 해결
- (-) 배포 시 서버리스 전환 필요 (Express → Vercel API Routes)

## 후속 조치 (Follow-ups)
- 배포 시 Express를 Vercel Serverless Functions로 마이그레이션
- 이미지 저장소를 로컬 → Cloudinary로 전환
