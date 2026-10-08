import { Worker } from 'bullmq';
import { connection, NOTIFICATION_QUEUE_NAME } from './connection';
import { processNotificationJob } from './processor';

export function createNotificationWorker(): Worker {
  return new Worker(NOTIFICATION_QUEUE_NAME, processNotificationJob, { connection });
}
