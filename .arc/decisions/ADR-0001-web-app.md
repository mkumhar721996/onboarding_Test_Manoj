---
id: ADR-0001
category: component
title: Web App
status: accepted
superseded_by: null
component_id: comp_web_app
responsibility: Web UI for HR staff, managers, and employees covering employee records,
  recruitment, leave, attendance, and dashboards/reporting.
kind: web_ui
split_reason: Only client described in the brief; one web UI per client per start-small
  rule.
talks_to:
- component_id: comp_hr_api
  interaction: sync
  evidence: HTTPS/REST calls from the browser for all HR operations.
evidence: 'about.md: ''A web-based HR Management System...'''
---

## Context

about.md: 'A web-based HR Management System...'

## Decision

Web UI for HR staff, managers, and employees covering employee records, recruitment, leave, attendance, and dashboards/reporting.

Kept separate because Only client described in the brief; one web UI per client per start-small rule..

## Talks to

- **HR API** (sync) — HTTPS/REST calls from the browser for all HR operations.
