---
id: ADR-0002
category: component
title: HR API
status: accepted
superseded_by: null
component_id: comp_hr_api
responsibility: 'Backend for all built HR capabilities: employee management, recruitment
  tracking, leave management, attendance tracking, HR dashboards and reporting. Enforces
  role-based access control.'
kind: api_service
split_reason: Single API for all domains; no team-ownership or NFR split cited yet.
talks_to:
- component_id: comp_relational_database
  interaction: shared-storage
  evidence: Read/write access to employee, recruitment, leave and attendance records
    (Amazon RDS MySQL).
- component_id: comp_shared_storage
  interaction: sync
  evidence: File uploads/downloads (resumes, employee documents) to/from Amazon S3.
evidence: 'about.md Buy vs build: ''Built: Employee management, Recruitment tracking,
  Leave management, Attendance tracking, HR dashboards and reporting'''
---

## Context

about.md Buy vs build: 'Built: Employee management, Recruitment tracking, Leave management, Attendance tracking, HR dashboards and reporting'

## Decision

Backend for all built HR capabilities: employee management, recruitment tracking, leave management, attendance tracking, HR dashboards and reporting. Enforces role-based access control.

Kept separate because Single API for all domains; no team-ownership or NFR split cited yet..

## Talks to

- **Relational Database** (shared-storage) — Read/write access to employee, recruitment, leave and attendance records (Amazon RDS MySQL).
- **Shared Storage** (sync) — File uploads/downloads (resumes, employee documents) to/from Amazon S3.
