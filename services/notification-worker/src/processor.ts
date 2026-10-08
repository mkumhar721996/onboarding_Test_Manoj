import type { Job } from 'bullmq';

export interface NotificationJobData {
  to: string;
  subject: string;
  body: string;
}

export interface NotificationPayload {
  to: string;
  subject: string;
  body: string;
}

export function buildNotificationPayload(data: NotificationJobData): NotificationPayload {
  if (!data.to || !data.to.includes('@')) {
    throw new Error('Invalid recipient email address');
  }

  return {
    to: data.to,
    subject: data.subject,
    body: data.body,
  };
}

export async function processNotificationJob(
  job: Job<NotificationJobData>,
): Promise<NotificationPayload> {
  return buildNotificationPayload(job.data);
}
