import axios from "axios";
import db from "../db/index";

import * as lark from "@larksuiteoapi/node-sdk";

export type NotificationType =
  | "bark"
  | "feishu"
  | "dingtalk"
  | "pushplus"
  | "custom";

export interface NotificationConfig {
  url: string;
  token?: string;
  appId?: string; // For Feishu SDK
  appSecret?: string; // For Feishu SDK
  receiveIdType?: "open_id" | "user_id" | "union_id" | "email" | "chat_id"; // Target type
  receiveId?: string; // Target ID
}

export class NotificationService {
  static async send(
    type: NotificationType,
    config: NotificationConfig,
    title: string,
    content: string,
  ): Promise<boolean> {
    // PushPlus 只需要 token，其他类型需要 url
    if (type !== "pushplus" && !config.url) {
      console.warn("Notification config missing URL");
      return false;
    }
    // PushPlus 需要 token
    if (type === "pushplus" && !config.token) {
      console.warn("PushPlus config missing token");
      return false;
    }

    try {
      const timestamp = new Date().toLocaleString();
      const finalContent = `${content}\n\n[${timestamp}]`;

      switch (type) {
        case "bark": {
          // Bark: GET https://api.day.app/{token}/{title}/{content}
          // ConfigURL should be "https://api.day.app/TOKEN"
          const baseUrl = config.url.endsWith("/")
            ? config.url.slice(0, -1)
            : config.url;
          await axios.get(
            `${baseUrl}/${encodeURIComponent(title)}/${encodeURIComponent(finalContent)}?isArchive=1`,
          );
          break;
        }
        case "feishu": {
          if (config.appId && config.appSecret) {
            // Use official Lark SDK
            const client = new lark.Client({
              appId: config.appId,
              appSecret: config.appSecret,
              domain: lark.Domain.Feishu,
            });

            const receiveIdType = config.receiveIdType || "user_id";
            const receiveId = config.receiveId || "";

            await client.im.message.create({
              params: {
                receive_id_type: receiveIdType,
              },
              data: {
                receive_id: receiveId,
                msg_type: "text",
                content: JSON.stringify({
                  text: `${title}\n\n${finalContent}`,
                }),
              },
            });
          } else if (config.url) {
            // Feishu Webhook fallback
            await axios.post(config.url, {
              msg_type: "text",
              content: { text: `${title}\n\n${finalContent}` },
            });
          } else {
            console.warn("Feishu config missing both App credentials and Webhook URL");
            return false;
          }
          break;
        }
        case "dingtalk": {
          // DingTalk: POST https://oapi.dingtalk.com/robot/send?access_token=TOKEN
          await axios.post(config.url, {
            msgtype: "text",
            text: { content: `${title}\n\n${finalContent}` },
          });
          break;
        }
        case "pushplus": {
          // PushPlus: POST http://www.pushplus.plus/send
          // 只需要 token，推送到微信公众号
          const apiUrl = config.url || "http://www.pushplus.plus/send";
          await axios.post(apiUrl, {
            token: config.token,
            title,
            content: finalContent,
          });
          break;
        }
        case "custom": {
          await axios.post(config.url, {
            title,
            content: finalContent,
            timestamp,
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
export async function sendNotification(
  userId: string,
  payload: {
    title: string;
    body: string;
    data?: any;
  }
): Promise<void> {
  console.log(`[Notification for user ${userId}] ${payload.title}: ${payload.body}`, payload.data);

  try {
    const rows = db
      .prepare("SELECT key, value FROM user_settings WHERE user_id = ? AND key IN (?, ?)")
      .all(userId, "notification_type", "notification_config") as {
        key: string;
        value: string;
      }[];
    const settings: Record<string, string> = {};
    rows.forEach((row) => {
      settings[row.key] = row.value;
    });

    if (settings.notification_type && settings.notification_config) {
      let config: NotificationConfig;
      try {
        config = JSON.parse(settings.notification_config);
      } catch (e) {
        console.error("Failed to parse notification config for user:", userId, e);
        return;
      }

      await NotificationService.send(
        settings.notification_type as NotificationType,
        config,
        payload.title,
        payload.body,
      );
    }
  } catch (error) {
    console.error("Error in global sendNotification:", error);
  }
}
