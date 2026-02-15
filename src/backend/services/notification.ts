import axios from 'axios';
import db from '../db/index';

export type NotificationType = 'bark' | 'feishu' | 'dingtalk' | 'custom';

export interface NotificationConfig {
  url: string;
  token?: string;
}

export class NotificationService {
  static async send(type: NotificationType, config: NotificationConfig, title: string, content: string): Promise<boolean> {
    if (!config.url) {
      console.warn('Notification config missing URL');
      return false;
    }

    try {
      const timestamp = new Date().toLocaleString();
      const finalContent = `${content}\n\n[${timestamp}]`;

      switch (type) {
        case 'bark': {
          // Bark: GET https://api.day.app/{token}/{title}/{content}
          // ConfigURL should be "https://api.day.app/TOKEN"
          const baseUrl = config.url.endsWith('/') ? config.url.slice(0, -1) : config.url;
          await axios.get(`${baseUrl}/${encodeURIComponent(title)}/${encodeURIComponent(finalContent)}?isArchive=1`);
          break;
        }
        case 'feishu': {
          // Feishu: POST https://open.feishu.cn/open-apis/bot/v2/hook/TOKEN
          await axios.post(config.url, {
            msg_type: 'text',
            content: { text: `${title}\n\n${finalContent}` }
          });
          break;
        }
        case 'dingtalk': {
          // DingTalk: POST https://oapi.dingtalk.com/robot/send?access_token=TOKEN
          await axios.post(config.url, {
            msgtype: 'text',
            text: { content: `${title}\n\n${finalContent}` }
          });
          break;
        }
        case 'custom': {
          await axios.post(config.url, {
            title,
            content: finalContent,
            timestamp
          });
          break;
        }
        default:
          console.warn(`Unsupported notification type: ${type}`);
          return false;
      }
      return true;
    } catch (error) {
      console.error(`Failed to send ${type} notification:`, error);
      return false;
    }
  }
}

// Legacy/Global sender that reads settings from DB
export async function sendNotification(payload: { title: string; body: string; data?: any }): Promise<void> {
  console.log(`[Notification] ${payload.title}: ${payload.body}`, payload.data);

  try {
    const rows = db.prepare('SELECT key, value FROM settings WHERE key IN (?, ?)').all('notification_type', 'notification_config') as { key: string; value: string }[];
    const settings: Record<string, string> = {};
    rows.forEach(row => {
      settings[row.key] = row.value;
    });

    if (settings.notification_type && settings.notification_config) {
      let config: NotificationConfig;
      try {
        config = JSON.parse(settings.notification_config);
      } catch (e) {
        console.error('Failed to parse notification config:', e);
        return;
      }

      await NotificationService.send(
        settings.notification_type as NotificationType,
        config,
        payload.title,
        payload.body
      );
    }
  } catch (error) {
    console.error('Error in global sendNotification:', error);
  }
}
