interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
}

const listeners: Set<(payload: NotificationPayload) => void> = new Set();

export function addNotificationListener(callback: (payload: NotificationPayload) => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

export function sendNotification(payload: NotificationPayload): void {
  console.log(`[Notification] ${payload.title}: ${payload.body}`);

  listeners.forEach((callback) => {
    try {
      callback(payload);
    } catch (error) {
      console.error('Notification listener error:', error);
    }
  });

  if (process.env.NOTIFICATION_ENABLED === 'false') {
    return;
  }
}

export { type NotificationPayload };
