import { Queue } from 'bullmq';
import { connection, NOTIFICATION_QUEUE_NAME } from './connection';
import type { NotificationJobData } from './processor';

export function createNotificationQueue(): Queue<NotificationJobData> {
  return new Queue<NotificationJobData>(NOTIFICATION_QUEUE_NAME, { connection });
}
