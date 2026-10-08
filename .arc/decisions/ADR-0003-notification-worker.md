---
id: ADR-0003
category: component
title: Notification Worker
status: accepted
superseded_by: null
component_id: comp_notification_worker
responsibility: Sends email notifications and approval messages triggered by HR workflows
  (leave approvals, recruitment updates, onboarding reminders); polls the Relational
  Database's queued-jobs table for work to dispatch.
kind: worker
split_reason: Background/async work (email notifications, approvals) is distinct runtime
  concern from request/response API handling.
talks_to:
- component_id: comp_relational_database
  interaction: shared-storage
  evidence: Worker reads HR state (e.g. leave approval status) to compose notifications.
evidence: 'about.md Integrations: ''Email service for notifications and approvals'';
  human decision: database-backed queue.'
---

## Context

about.md Integrations: 'Email service for notifications and approvals'; human decision: database-backed queue.

## Decision

Sends email notifications and approval messages triggered by HR workflows (leave approvals, recruitment updates, onboarding reminders); polls the Relational Database's queued-jobs table for work to dispatch.

Kept separate because Background/async work (email notifications, approvals) is distinct runtime concern from request/response API handling..

## Talks to

- **Relational Database** (shared-storage) — Worker reads HR state (e.g. leave approval status) to compose notifications.
