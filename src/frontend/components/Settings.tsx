import { useState, useEffect } from "react";
import api from "../services/api";

const Icons = {
  play: (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  stop: (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z"
      />
    </svg>
  ),
  bolt: (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    </svg>
  ),
  check: (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  ),
  clock: (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  bell: (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  ),
  volume: (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
      />
    </svg>
  ),
  info: (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  ),
  send: (
    <svg
      className="w-4 h-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
      />
    </svg>
  ),
};

export default function Settings() {
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [monitorStatus, setMonitorStatus] = useState<{
    running: boolean;
    intervalMinutes: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [testSending, setTestSending] = useState(false);

  // Notification State
  const [notifType, setNotifType] = useState<string>("bark");
  const [url, setUrl] = useState("");
  // Feishu Specific State
  const [feishuAppId, setFeishuAppId] = useState("");
  const [feishuAppSecret, setFeishuAppSecret] = useState("");
  const [feishuReceiveIdType, setFeishuReceiveIdType] = useState<"open_id" | "user_id" | "union_id" | "email" | "chat_id">("user_id");
  const [feishuReceiveId, setFeishuReceiveId] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [settingsData, statusData] = await Promise.all([
          api.settings.get(),
          api.monitor.getStatus(),
        ]);
        setSettings(settingsData);
        setMonitorStatus(statusData);

        // Parse notification config
        if (settingsData.notification_type) {
          setNotifType(String(settingsData.notification_type));
        }
        if (settingsData.notification_config) {
          try {
            const config =
              typeof settingsData.notification_config === "string"
                ? JSON.parse(settingsData.notification_config)
                : settingsData.notification_config;
            if (config.url) setUrl(config.url);
            if (config.appId) setFeishuAppId(config.appId);
            if (config.appSecret) setFeishuAppSecret(config.appSecret);
            if (config.receiveIdType) setFeishuReceiveIdType(config.receiveIdType);
            if (config.receiveId) setFeishuReceiveId(config.receiveId);
          } catch (e) {
            console.error("Failed to parse notif config", e);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      let config: any = { url };
      if (notifType === "pushplus") {
        config = { token: url };
      } else if (notifType === "feishu") {
        config = {
          url,
          appId: feishuAppId,
          appSecret: feishuAppSecret,
          receiveIdType: feishuReceiveIdType,
          receiveId: feishuReceiveId,
        };
      }

      const updates = {
        ...settings,
        notification_type: notifType,
        notification_config: config,
      };
      await api.settings.update(updates);
      setSettings(updates);
      alert("设置已保存");
    } catch {
      alert("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleTestNotification = async () => {
    if (notifType === "feishu" && !feishuAppId && !url) {
      alert("请填写飞书 Webhook 地址，或者填写 App ID 与 App Secret。");
      return;
    } else if (notifType !== "feishu" && !url) {
      alert(
        notifType === "pushplus"
          ? "请先填写 PushPlus Token"
          : "请先填写 Webhook 地址",
      );
      return;
    }
    setTestSending(true);
    try {
      let config: any = { url };
      if (notifType === "pushplus") {
        config = { token: url };
      } else if (notifType === "feishu") {
        config = {
          url,
          appId: feishuAppId,
          appSecret: feishuAppSecret,
          receiveIdType: feishuReceiveIdType,
          receiveId: feishuReceiveId,
        };
      }
      await api.settings.testNotification({ type: notifType, config });
      alert("测试通知已发送，请检查接收端");
    } catch (e) {
      alert("发送失败: " + (e instanceof Error ? e.message : String(e)));
    } finally {
      setTestSending(false);
    }
  };

  const handleMonitorAction = async (action: "start" | "stop") => {
    setActionLoading(action);
    try {
      const result = await api.monitor[action]();
      setMonitorStatus(result);
    } catch {
      alert("操作失败");
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="h-8 w-32 rounded-lg bg-gray-200 animate-pulse" />
        <div className="h-96 rounded-xl bg-gray-200 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-gray-900">设置</h2>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-100">
        <div className="p-5 bg-gradient-to-r from-gray-50 to-white">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${monitorStatus?.running ? "bg-emerald-400" : "bg-gray-400"}`}
                />
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${monitorStatus?.running ? "bg-emerald-500" : "bg-gray-400"}`}
                />
              </span>
              监控引擎状态
            </div>

            <button
              onClick={() => handleMonitorAction(monitorStatus?.running ? "stop" : "start")}
              disabled={actionLoading !== null}
              className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${monitorStatus?.running
                ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                : "bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100"
                }`}
            >
              {actionLoading !== null ? (
                <span className={`w-3 h-3 border-2 border-t-transparent rounded-full animate-spin ${monitorStatus?.running ? "border-red-600" : "border-emerald-600"}`} />
              ) : monitorStatus?.running ? (
                Icons.stop
              ) : (
                Icons.play
              )}
              {monitorStatus?.running ? "暂停监控" : "恢复监控"}
            </button>
          </h3>
          <div className="space-y-4">
            <div className={`flex items-center justify-between p-3 rounded-xl border ${monitorStatus?.running ? "bg-emerald-50/50 border-emerald-100" : "bg-gray-50 border-gray-200"}`}>
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium ${monitorStatus?.running ? "text-emerald-600" : "text-gray-500"}`}>
                  {monitorStatus?.running ? "全局后台服务活跃中" : "全局后台服务已暂停"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                {Icons.clock}
                <span>
                  引擎每 5 分钟自动巡检系统内所有活跃收藏
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 bg-gradient-to-r from-gray-50 to-white">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            {Icons.bell}
            通知设置
          </h3>
          <div className="space-y-6">
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm text-gray-500 mb-2">
                  通知通道
                </label>
                <select
                  value={notifType}
                  onChange={(e) => setNotifType(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="pushplus">PushPlus (微信推送)</option>
                  <option value="bark">Bark (iOS)</option>
                  <option value="feishu">飞书 Webhook</option>
                  <option value="dingtalk">钉钉 Webhook</option>
                  <option value="custom">自定义 Webhook</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-500 mb-2">
                  {notifType === "pushplus"
                    ? "PushPlus Token"
                    : notifType === "bark"
                      ? "Bark 服务器地址 (例如: https://api.day.app/YOUR_TOKEN/)"
                      : notifType === "feishu"
                        ? "飞书 Webhook 地址 (群机器人模式)"
                        : "Webhook URL"}
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={
                    notifType === "pushplus"
                      ? "从 pushplus.plus 获取 token"
                      : notifType === "bark"
                        ? "https://api.day.app/key/"
                        : notifType === "feishu"
                          ? "选填：群机器人的 webhook url (如不使用App授权的话)"
                          : "https://example.com/webhook"
                  }
                  className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:border-blue-500 placeholder-gray-400"
                />
                {notifType === "pushplus" && (
                  <p className="mt-2 text-xs text-gray-500">
                    免费用户每日 200 条消息。获取 Token:{" "}
                    <a
                      href="https://www.pushplus.plus/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 underline"
                    >
                      访问 pushplus.plus
                    </a>{" "}
                    → 关注公众号并复制您的 Token
                  </p>
                )}
              </div>

              {notifType === "feishu" && (
                <div className="pt-4 border-t border-gray-100 space-y-4">
                  <p className="text-sm font-medium text-gray-700">高级机器人模式（企业自建应用）</p>
                  <p className="text-xs text-gray-500">
                    如果您希望机器人可以直接私聊给特定用户，或是由官方服务器推送，请填写下方信息。如果不填，则仅使用上方的 Webhook。
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-500 mb-2">App ID</label>
                      <input type="text" value={feishuAppId} onChange={e => setFeishuAppId(e.target.value)} placeholder="cli_..." className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:border-blue-500 placeholder-gray-400" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-500 mb-2">App Secret</label>
                      <input type="password" value={feishuAppSecret} onChange={e => setFeishuAppSecret(e.target.value)} placeholder="App Secret" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:border-blue-500 placeholder-gray-400" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-500 mb-2">接收者类型 (Receive ID Type)</label>
                      <select value={feishuReceiveIdType} onChange={e => setFeishuReceiveIdType(e.target.value as any)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:border-blue-500">
                        <option value="user_id">User ID (企业内部)</option>
                        <option value="open_id">Open ID (推荐，对应用唯一)</option>
                        <option value="union_id">Union ID</option>
                        <option value="chat_id">Chat ID (群聊)</option>
                        <option value="email">Email</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-500 mb-2">接收者 ID</label>
                      <input type="text" value={feishuReceiveId} onChange={e => setFeishuReceiveId(e.target.value)} placeholder="接收者的 ID" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-gray-900 text-sm focus:outline-none focus:border-blue-500 placeholder-gray-400" />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <button
                  onClick={handleTestNotification}
                  disabled={testSending || !url}
                  className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                >
                  {testSending ? (
                    <span className="w-3 h-3 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                  ) : (
                    Icons.send
                  )}
                  测试发送
                </button>
              </div>
            </div>

            <label className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors">
              <span className="text-sm text-gray-700">启用通知</span>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={settings.notification_enabled === true}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      notification_enabled: e.target.checked,
                    })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600" />
              </div>
            </label>
          </div>
        </div>

        <div className="p-5 bg-gradient-to-r from-gray-50 to-white">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            {Icons.info}
            关于
          </h3>
          <div className="text-sm text-gray-500 space-y-2">
            <p className="text-xs text-gray-500 mt-3 p-3 rounded-xl bg-gray-50 border border-gray-200">
              注意: 本工具仅供个人使用，请勿过度请求API
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-sm hover:shadow-md transition-colors"
        >
          {saving ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            Icons.check
          )}
          保存设置
        </button>
      </div>
    </div>
  );
}
