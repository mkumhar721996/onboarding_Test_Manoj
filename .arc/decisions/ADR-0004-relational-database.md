---
id: ADR-0004
category: component
title: Relational Database
status: accepted
superseded_by: null
component_id: comp_relational_database
responsibility: Stores employee, recruitment, leave, attendance and HR records, plus
  a queued-jobs table used as a database-backed queue for notification/approval dispatch.
  Runs on Amazon RDS (MySQL).
kind: managed_service
split_reason: Brief requires a relational database for HR records; backing store needed
  by HR API and Notification Worker.
evidence: 'Human decision: Amazon RDS (MySQL); database-backed queue chosen over separate
  queue infra.'
---

## Context

Human decision: Amazon RDS (MySQL); database-backed queue chosen over separate queue infra.

## Decision

Stores employee, recruitment, leave, attendance and HR records, plus a queued-jobs table used as a database-backed queue for notification/approval dispatch. Runs on Amazon RDS (MySQL).

Kept separate because Brief requires a relational database for HR records; backing store needed by HR API and Notification Worker..
