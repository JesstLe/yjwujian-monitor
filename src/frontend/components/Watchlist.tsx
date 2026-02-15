import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import type { WatchlistEntry, WatchlistGroup, Alert } from '@shared/types';

const Icons = {
  refresh: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
  ),
  plus: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  bell: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  check: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  trash: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  ),
  edit: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  empty: (
    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
    </svg>
  ),
  folder: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  ),
  arrowRight: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
};

export default function Watchlist() {
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);
  const [groups, setGroups] = useState<WatchlistGroup[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState<string>('');

  const fetchData = useCallback(async (showLoading = false) => {
    if (showLoading) setRefreshing(true);
    try {
      const [watchlistData, groupsData, alertsData] = await Promise.all([
        api.watchlist.getAll(),
        api.groups.getAll(),
        api.alerts.getAll(true),
      ]);
      setEntries(watchlistData);
      setGroups(groupsData);
      setAlerts(alertsData);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
      if (showLoading) setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const formatPrice = (cents: number) => `¥${(cents / 100).toFixed(2)}`;
  const parsePrice = (yuan: string) => Math.round(parseFloat(yuan) * 100);

  const formatLastUpdated = (date: Date | null) => {
    if (!date) return '未更新';
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}秒前`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;
    return date.toLocaleString('zh-CN');
  };

  const getFreshnessClass = (date: Date | null) => {
    if (!date) return 'text-slate-500';
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 5) return 'text-emerald-400';
    if (minutes < 30) return 'text-amber-400';
    return 'text-red-400';
  };

  const handleUpdatePrice = async (id: number) => {
    if (!editPrice) return;
    try {
      await api.watchlist.update(id, { targetPrice: parsePrice(editPrice) });
      setEditingId(null);
      setEditPrice('');
      fetchData();
    } catch {
      alert('更新失败');
    }
  };

  const handleToggleAlert = async (id: number, enabled: boolean) => {
    try {
      await api.watchlist.update(id, { alertEnabled: !enabled });
      fetchData();
    } catch {
      alert('更新失败');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个监控项吗？')) return;
    try {
      await api.watchlist.delete(id);
      fetchData();
    } catch {
      alert('删除失败');
    }
  };

  const handleCreateGroup = async () => {
    const name = prompt('输入分组名称');
    if (!name) return;
    try {
      await api.groups.create({ name });
      fetchData();
    } catch {
      alert('创建失败');
    }
  };

  const handleMarkAlertRead = async (alertId: number) => {
    try {
      await api.alerts.markRead(alertId);
      fetchData();
    } catch {
      alert('标记失败');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-12 rounded-xl bg-slate-800/30 animate-pulse" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-48 rounded-xl bg-slate-800/30 animate-pulse" />
        ))}
      </div>
    );
  }

  const groupedEntries = groups.map((group) => ({
    ...group,
    entries: entries.filter((e) => e.groupId === group.id),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-slate-100">监控列表</h2>
          <span className={`text-sm ${getFreshnessClass(lastUpdated)}`}>
            更新于 {formatLastUpdated(lastUpdated)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 disabled:opacity-40 text-slate-300 text-sm font-medium rounded-lg border border-slate-700/50 transition-colors"
          >
            <span className={refreshing ? 'animate-spin' : ''}>{Icons.refresh}</span>
            {refreshing ? '刷新中...' : '刷新'}
          </button>
          <button
            onClick={handleCreateGroup}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-sm font-medium rounded-lg border border-cyan-500/30 transition-colors"
          >
            {Icons.plus}
            新建分组
          </button>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="rounded-xl border border-red-800/30 bg-gradient-to-br from-red-950/20 to-red-900/10 p-5">
          <div className="flex items-center gap-2 text-red-400 mb-4">
            {Icons.bell}
            <h3 className="font-semibold">未读提醒</h3>
            <span className="ml-auto text-sm text-red-300/70">{alerts.length} 个</span>
          </div>
          <div className="space-y-2">
            {alerts.slice(0, 5).map((alert) => {
              const entry = entries.find((w) => w.itemId === alert.itemId);
              return (
                <div
                  key={alert.id}
                  className="flex items-center justify-between bg-slate-900/50 rounded-lg p-3 border border-slate-800/50"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${entry?.item?.rarity === 'red' ? 'bg-red-500' : 'bg-amber-500'}`} />
                    <div>
                      <p className="font-medium text-slate-200">{entry?.item?.name || alert.itemId}</p>
                      <p className="text-sm text-slate-500">
                        现价 <span className="text-red-400 font-medium">{formatPrice(alert.triggeredPrice)}</span>
                        {' '} / 目标 <span className="text-slate-400">{formatPrice(alert.targetPrice)}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleMarkAlertRead(alert.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-slate-400 hover:text-slate-200 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg transition-colors"
                  >
                    {Icons.check}
                    已读
                  </button>
                </div>
              );
            })}
            {alerts.length > 5 && (
              <p className="text-center text-sm text-slate-500 pt-2">
                还有 {alerts.length - 5} 个未读提醒...
              </p>
            )}
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800/50 mb-4">
            {Icons.empty}
          </div>
          <p className="text-lg font-medium text-slate-400">暂无监控物品</p>
          <a href="/search" className="inline-flex items-center gap-1 mt-3 text-cyan-400 hover:text-cyan-300 font-medium">
            去搜索添加
            {Icons.arrowRight}
          </a>
        </div>
      ) : (
        groupedEntries.map((group) => (
          <div key={group.id} className="rounded-xl border border-slate-800/50 bg-slate-900/30 overflow-hidden">
            <div
              className="px-5 py-4 border-b border-slate-800/50 flex items-center justify-between bg-slate-800/20"
              style={{ borderLeftWidth: 3, borderLeftColor: group.color || '#06b6d4' }}
            >
              <div className="flex items-center gap-2">
                {Icons.folder}
                <h3 className="font-semibold text-slate-200">{group.name}</h3>
                <span className="text-sm text-slate-500">({group.entries.length})</span>
              </div>
              {group.id !== 1 && (
                <button
                  onClick={async () => {
                    if (confirm('确定删除这个分组吗？物品会移到默认分组')) {
                      await api.groups.delete(group.id);
                      fetchData();
                    }
                  }}
                  className="text-sm text-red-400 hover:text-red-300 transition-colors"
                >
                  删除
                </button>
              )}
            </div>

            <div className="divide-y divide-slate-800/50">
              {group.entries.map((entry) => (
                <div key={entry.id} className="p-4 hover:bg-slate-800/20 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-slate-200 truncate">{entry.item?.name || entry.itemId}</h4>
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded border ${
                          entry.item?.rarity === 'red'
                            ? 'bg-red-500/10 text-red-400 border-red-500/30'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}>
                          {entry.item?.rarity === 'red' ? '红' : '金'}
                        </span>
                        {entry.item?.status === 'draw' && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded bg-purple-500/10 text-purple-400 border border-purple-500/30">
                            抽签期
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                        <span className="text-cyan-400 font-semibold">
                          {entry.item ? formatPrice(entry.item.currentPrice) : '-'}
                        </span>
                        {entry.targetPrice && (
                          <span className="text-slate-500">
                            目标: <span className="text-slate-300">{formatPrice(entry.targetPrice)}</span>
                          </span>
                        )}
                        {entry.item?.lastCheckedAt && (
                          <span className={`text-xs ${getFreshnessClass(new Date(entry.item.lastCheckedAt))}`}>
                            更新于 {formatLastUpdated(new Date(entry.item.lastCheckedAt))}
                          </span>
                        )}
                      </div>

                      {editingId === entry.id ? (
                        <div className="flex items-center gap-2 mt-3">
                          <input
                            type="number"
                            step="0.01"
                            placeholder="目标价格 (元)"
                            value={editPrice}
                            onChange={(e) => setEditPrice(e.target.value)}
                            className="px-3 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 w-32 focus:outline-none focus:border-cyan-500/50"
                          />
                          <button
                            onClick={() => handleUpdatePrice(entry.id)}
                            className="px-3 py-1.5 bg-cyan-500/20 text-cyan-400 text-sm font-medium rounded-lg hover:bg-cyan-500/30 transition-colors"
                          >
                            保存
                          </button>
                          <button
                            onClick={() => { setEditingId(null); setEditPrice(''); }}
                            className="px-3 py-1.5 text-slate-400 hover:text-slate-300 text-sm transition-colors"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(entry.id);
                            setEditPrice(entry.targetPrice ? (entry.targetPrice / 100).toString() : '');
                          }}
                          className="flex items-center gap-1 mt-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors"
                        >
                          {Icons.edit}
                          {entry.targetPrice ? '修改目标价' : '设置目标价'}
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                        <div className="relative">
                          <input
                            type="checkbox"
                            checked={entry.alertEnabled}
                            onChange={() => handleToggleAlert(entry.id, entry.alertEnabled)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500" />
                        </div>
                        <span className="hidden sm:inline">提醒</span>
                      </label>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="删除"
                      >
                        {Icons.trash}
                      </button>
                    </div>
                  </div>

                  {entry.targetPrice && entry.item && entry.item.currentPrice <= entry.targetPrice && (
                    <div className="mt-3 p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                      <div className="flex items-center gap-2 text-emerald-400 text-sm font-medium">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        价格已达标！当前 {formatPrice(entry.item.currentPrice)} ≤ 目标 {formatPrice(entry.targetPrice)}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
