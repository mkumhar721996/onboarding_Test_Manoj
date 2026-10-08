---
id: ADR-0005
category: component
title: Shared Storage
status: accepted
superseded_by: null
component_id: comp_shared_storage
responsibility: Stores file/document attachments (e.g. resumes, employee documents)
  uploaded through recruitment and employee management workflows. Runs on Amazon S3.
kind: managed_service
split_reason: File/document storage is a distinct backing-service need from relational
  records; not met by the Relational Database.
evidence: 'Human decision: Amazon S3.'
---

## Context

Human decision: Amazon S3.

## Decision

Stores file/document attachments (e.g. resumes, employee documents) uploaded through recruitment and employee management workflows. Runs on Amazon S3.

Kept separate because File/document storage is a distinct backing-service need from relational records; not met by the Relational Database..
