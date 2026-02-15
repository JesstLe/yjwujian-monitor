import { useState, useEffect } from 'react';
import api from '../services/api';

const Icons = {
  play: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  stop: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
    </svg>
  ),
  bolt: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  check: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  clock: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  bell: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  volume: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
    </svg>
  ),
  info: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export default function Settings() {
  const [settings, setSettings] = useState<Record<string, unknown>>({});
  const [monitorStatus, setMonitorStatus] = useState<{ running: boolean; intervalMinutes: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [settingsData, statusData] = await Promise.all([
          api.settings.get(),
          api.monitor.getStatus(),
        ]);
        setSettings(settingsData);
        setMonitorStatus(statusData);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.settings.update(settings);
      alert('设置已保存');
    } catch {
      alert('保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleMonitorAction = async (action: 'start' | 'stop' | 'checkNow') => {
    setActionLoading(action);
    try {
      if (action === 'checkNow') {
        const result = await api.monitor.checkNow();
        alert(`立即检查完成: ${result.message}`);
      } else {
        const result = await api.monitor[action === 'start' ? 'start' : 'stop']();
        setMonitorStatus(result);
      }
    } catch {
      alert('操作失败');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="h-8 w-32 rounded-lg bg-slate-800/30 animate-pulse" />
        <div className="h-96 rounded-xl bg-slate-800/30 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h2 className="text-xl font-bold text-slate-100">设置</h2>

      <div className="rounded-xl border border-slate-800/50 bg-slate-900/30 overflow-hidden divide-y divide-slate-800/50">
        <div className="p-5">
          <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${monitorStatus?.running ? 'bg-emerald-400' : 'bg-slate-400'}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${monitorStatus?.running ? 'bg-emerald-500' : 'bg-slate-500'}`} />
            </span>
            监控状态
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
              <div className="flex items-center gap-3">
                <span className={`text-sm font-medium ${monitorStatus?.running ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {monitorStatus?.running ? '运行中' : '已停止'}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                {Icons.clock}
                <span>检查间隔: {monitorStatus?.intervalMinutes || 5} 分钟</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleMonitorAction('start')}
                disabled={actionLoading === 'start' || monitorStatus?.running}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium rounded-lg border border-emerald-500/30 transition-colors"
              >
                {actionLoading === 'start' ? (
                  <span className="w-4 h-4 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                ) : Icons.play}
                启动监控
              </button>
              <button
                onClick={() => handleMonitorAction('stop')}
                disabled={actionLoading === 'stop' || !monitorStatus?.running}
                className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium rounded-lg border border-red-500/30 transition-colors"
              >
                {actionLoading === 'stop' ? (
                  <span className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                ) : Icons.stop}
                停止监控
              </button>
              <button
                onClick={() => handleMonitorAction('checkNow')}
                disabled={actionLoading === 'checkNow'}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium rounded-lg border border-cyan-500/30 transition-colors"
              >
                {actionLoading === 'checkNow' ? (
                  <span className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                ) : Icons.bolt}
                立即检查
              </button>
            </div>
          </div>
        </div>

        <div className="p-5">
          <h3 className="font-semibold text-slate-200 mb-4">监控设置</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                检查间隔 (分钟)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={String(settings.check_interval_minutes || 5)}
                onChange={(e) =>
                  setSettings({ ...settings, check_interval_minutes: parseInt(e.target.value) })
                }
                className="w-32 px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
              />
            </div>
          </div>
        </div>

        <div className="p-5">
          <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
            {Icons.bell}
            通知设置
          </h3>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700/30 cursor-pointer hover:bg-slate-800/50 transition-colors">
              <span className="text-sm text-slate-300">启用通知</span>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={settings.notification_enabled === true}
                  onChange={(e) =>
                    setSettings({ ...settings, notification_enabled: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500" />
              </div>
            </label>

            <label className="flex items-center justify-between p-3 rounded-lg bg-slate-800/30 border border-slate-700/30 cursor-pointer hover:bg-slate-800/50 transition-colors">
              <span className="text-sm text-slate-300">通知声音</span>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={settings.notification_sound === true}
                  onChange={(e) =>
                    setSettings({ ...settings, notification_sound: e.target.checked })
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500" />
              </div>
            </label>
          </div>
        </div>

        <div className="p-5">
          <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
            {Icons.info}
            关于
          </h3>
          <div className="text-sm text-slate-400 space-y-2">
            <p className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
              永劫无间藏宝阁监控系统 v1.0.0
            </p>
            <p className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
              数据来源: 网易藏宝阁官方API
            </p>
            <p className="text-xs text-slate-500 mt-3 p-3 rounded-lg bg-slate-800/30 border border-slate-700/30">
              注意: 本工具仅供个人使用，请勿过度请求API
            </p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-900 font-semibold rounded-lg transition-colors"
        >
          {saving ? (
            <span className="w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
          ) : Icons.check}
          保存设置
        </button>
      </div>
    </div>
  );
}
