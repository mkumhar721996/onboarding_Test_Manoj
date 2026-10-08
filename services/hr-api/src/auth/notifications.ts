import { Queue } from 'bullmq';

// Mirrors comp_notification_worker's queue name and NotificationJobData shape.
const NOTIFICATION_QUEUE_NAME = 'notifications';

const connection = {
  host: process.env.REDIS_HOST ?? 'localhost',
  port: Number(process.env.REDIS_PORT) || 6379,
};

let queue: Queue | undefined;

async function enqueue(to: string, subject: string, body: string): Promise<void> {
  queue ??= new Queue(NOTIFICATION_QUEUE_NAME, { connection });
  await queue.add('send-email', { to, subject, body });
}

const webOrigin = () => process.env.WEB_APP_ORIGIN ?? 'http://localhost:3011';

export function enqueueVerificationEmail(email: string, token: string): Promise<void> {
  const link = `${webOrigin()}/confirm-email?token=${token}`;
  return enqueue(
    email,
    'Confirm your email',
    `Confirm your email address within 24 hours: ${link}`,
  );
}

export function enqueuePasswordResetEmail(email: string, token: string): Promise<void> {
  const link = `${webOrigin()}/reset-password?token=${token}`;
  return enqueue(email, 'Reset your password', `Reset your password within 1 hour: ${link}`);
}
