import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import type { WatchlistEntry, WatchlistGroup, Alert } from "@shared/types";

const ACTIVE_POLL_MS = 30_000;
const BACKGROUND_POLL_MS = 180_000;

const Icons = {
  refresh: (
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
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  ),
  plus: (
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
        d="M12 4v16m8-8H4"
      />
    </svg>
  ),
  bell: (
    <svg
      className="w-5 h-5"
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
  trash: (
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
        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
      />
    </svg>
  ),
  edit: (
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
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  ),
  empty: (
    <svg
      className="w-12 h-12"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
      />
    </svg>
  ),
  folder: (
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
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
      />
    </svg>
  ),
  arrowRight: (
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
        d="M9 5l7 7-7 7"
      />
    </svg>
  ),
  compare: (
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
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  ),
  close: (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  ),
};

export default function Watchlist() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);
  const [groups, setGroups] = useState<WatchlistGroup[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editPrice, setEditPrice] = useState<string>("");
  const [isCompareMode, setIsCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [addingToCompare, setAddingToCompare] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 手动刷新用的回调（不受 stopped 控制）
  const manualRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
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
    } catch (err) {
      console.error("Failed to fetch watchlist data:", err);
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setError(null);
      try {
        const [watchlistData, groupsData, alertsData] = await Promise.all([
          api.watchlist.getAll(),
          api.groups.getAll(),
          api.alerts.getAll(true),
        ]);
        if (stopped) return;
        setEntries(watchlistData);
        setGroups(groupsData);
        setAlerts(alertsData);
        setLastUpdated(new Date());
      } catch (err) {
        console.error("Failed to fetch watchlist data:", err);
        if (!stopped) {
          setError(err instanceof Error ? err.message : "加载失败");
        }
      } finally {
        if (!stopped) {
          setLoading(false);
        }
      }
    };

    const getPollDelay = () =>
      document.visibilityState === "hidden"
        ? BACKGROUND_POLL_MS
        : ACTIVE_POLL_MS;

    let timer: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;
    let inFlight = false;

    const runFetch = async () => {
      if (stopped || inFlight) {
        return;
      }

      inFlight = true;
      try {
        await fetchData();
      } finally {
        inFlight = false;
      }
    };

    const scheduleNext = () => {
      if (stopped || timer) return;
      timer = setTimeout(async () => {
        timer = null;
        await runFetch();
        if (stopped) {
          return;
        }
        scheduleNext();
      }, getPollDelay());
    };

    const handleVisibilityChange = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      scheduleNext();
    };

    runFetch();
    scheduleNext();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      stopped = true;
      if (timer) {
        clearTimeout(timer);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const formatPrice = (cents: number) => `¥${(cents / 100).toFixed(2)}`;
  const parsePrice = (yuan: string) => Math.round(parseFloat(yuan) * 100);

  const formatLastUpdated = (date: Date | null) => {
    if (!date) return "未更新";
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}秒前`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前`;
    return date.toLocaleString("zh-CN");
  };

  const getFreshnessClass = (date: Date | null) => {
    if (!date) return "text-gray-400";
    const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
    if (minutes < 5) return "text-emerald-500";
    if (minutes < 30) return "text-amber-500";
    return "text-red-500";
  };

  const handleUpdatePrice = async (id: number) => {
    if (!editPrice) return;
    try {
      await api.watchlist.update(id, { targetPrice: parsePrice(editPrice) });
      setEditingId(null);
      setEditPrice("");
      manualRefresh();
    } catch {
      alert("更新失败");
    }
  };

  const handleToggleAlert = async (id: number, enabled: boolean) => {
    try {
      await api.watchlist.update(id, { alertEnabled: !enabled });
      manualRefresh();
    } catch {
      alert("更新失败");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("确定要删除这个监控项吗？")) return;
    try {
      await api.watchlist.delete(id);
      manualRefresh();
    } catch {
      alert("删除失败");
    }
  };

  const handleCreateGroup = async () => {
    const name = prompt("输入分组名称");
    if (!name) return;
    try {
      await api.groups.create({ name });
      manualRefresh();
    } catch {
      alert("创建失败");
    }
  };

  const handleMarkAlertRead = async (alertId: number) => {
    try {
      await api.alerts.markRead(alertId);
      manualRefresh();
    } catch {
      alert("标记失败");
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAddToCompare = async () => {
    const selectedEntries = entries.filter((e) => selectedIds.has(e.id));
    if (selectedEntries.length === 0) return;

    setAddingToCompare(true);
    try {
      await Promise.all(
        selectedEntries.map((entry) => {
          if (!entry.item) return Promise.resolve();
          return api.compare.add({
            itemId: entry.item.id,
            parentTypeId: entry.item.id,
            name: entry.item.name,
            imageUrl: entry.item.imageUrl,
            captureUrls: entry.item.captureUrls || [],
            serialNum: entry.item.serialNum || "",
            currentPrice: entry.item.currentPrice,
            category: entry.item.category,
            rarity: entry.item.rarity,
            hero: entry.item.hero,
            weapon: entry.item.weapon,
            starGrid: entry.item.starGrid,
            variationInfo: entry.item.variationInfo,
          });
        }),
      );
      setIsCompareMode(false);
      setSelectedIds(new Set());
      navigate("/compare");
    } catch {
      alert("添加到对比列表失败");
    } finally {
      setAddingToCompare(false);
    }
  };

  const cancelCompareMode = () => {
    setIsCompareMode(false);
    setSelectedIds(new Set());
  };

  const entryByItemId = useMemo(() => {
    const map = new Map<string, WatchlistEntry>();
    for (const entry of entries) {
      if (!map.has(entry.itemId)) {
        map.set(entry.itemId, entry);
      }
    }
    return map;
  }, [entries]);

  const entriesByGroup = useMemo(() => {
    const grouped = new Map<number, WatchlistEntry[]>();
    for (const entry of entries) {
      const existing = grouped.get(entry.groupId);
      if (existing) {
        existing.push(entry);
      } else {
        grouped.set(entry.groupId, [entry]);
      }
    }
    return grouped;
  }, [entries]);

  const groupedEntries = useMemo(
    () =>
      groups.map((group) => ({
        ...group,
        entries: entriesByGroup.get(group.id) ?? [],
      })),
    [groups, entriesByGroup],
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-12 rounded-xl bg-gray-100 animate-pulse" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-48 rounded-xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">监控列表</h2>
          <button
            onClick={() => manualRefresh()}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {Icons.refresh}
            重试
          </button>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 font-medium">加载失败</p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
          <p className="text-gray-500 text-xs mt-3">请检查浏览器控制台获取详细错误信息</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-bold text-gray-900">监控列表</h2>
          <span className={`text-sm ${getFreshnessClass(lastUpdated)}`}>
            更新于 {formatLastUpdated(lastUpdated)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {entries.length > 0 && (
            <button
              onClick={() => setIsCompareMode(!isCompareMode)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${isCompareMode
                ? "bg-purple-500 text-white border-purple-500 hover:bg-purple-600"
                : "bg-purple-50 text-purple-600 border-purple-200 hover:bg-purple-100"
                }`}
            >
              {Icons.compare}
              {isCompareMode ? "取消选择" : "对比"}
            </button>
          )}
          <button
            onClick={() => manualRefresh()}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 disabled:opacity-40 text-gray-700 text-sm font-medium rounded-lg border border-gray-200 shadow-sm transition-colors"
          >
            <span className={refreshing ? "animate-spin" : ""}>
              {Icons.refresh}
            </span>
            {refreshing ? "刷新中..." : "刷新"}
          </button>
          <button
            onClick={handleCreateGroup}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-600 text-sm font-medium rounded-lg border border-blue-200 transition-colors"
          >
            {Icons.plus}
            新建分组
          </button>
        </div>
      </div>

      {alerts.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 to-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-red-600 mb-4">
            {Icons.bell}
            <h3 className="font-semibold">未读提醒</h3>
            <span className="ml-auto text-sm text-red-500 font-medium">
              {alerts.length} 个
            </span>
          </div>
          <div className="space-y-2">
            {alerts.slice(0, 5).map((alert) => {
              const entry = entryByItemId.get(alert.itemId);
              return (
                <div
                  key={alert.id}
                  className="flex items-center justify-between bg-white rounded-xl p-4 border border-gray-100 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2 h-2 rounded-full ${entry?.item?.rarity === "red" ? "bg-red-500" : "bg-amber-500"}`}
                    />
                    <div>
                      <p className="font-medium text-gray-900">
                        {entry?.item?.name || alert.itemId}
                      </p>
                      <p className="text-sm text-gray-600">
                        现价{" "}
                        <span className="text-red-600 font-semibold">
                          {formatPrice(alert.triggeredPrice)}
                        </span>{" "}
                        / 目标{" "}
                        <span className="text-gray-700 font-medium">
                          {formatPrice(alert.targetPrice)}
                        </span>
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleMarkAlertRead(alert.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    {Icons.check}
                    已读
                  </button>
                </div>
              );
            })}
            {alerts.length > 5 && (
              <p className="text-center text-sm text-gray-600 pt-2">
                还有 {alerts.length - 5} 个未读提醒...
              </p>
            )}
          </div>
        </div>
      )}

      {entries.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-3xl flex items-center justify-center mb-5 mx-auto shadow-sm">
            <span className="text-blue-300">{Icons.empty}</span>
          </div>
          <p className="text-lg font-medium text-gray-700">暂无监控物品</p>
          <a
            href="/search"
            className="inline-flex items-center gap-1 mt-3 text-blue-600 hover:text-blue-700 font-medium"
          >
            去搜索添加
            {Icons.arrowRight}
          </a>
        </div>
      ) : (
        groupedEntries.map((group) => (
          <div
            key={group.id}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
          >
            <div
              className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white"
              style={{
                borderLeftWidth: 3,
                borderLeftColor: group.color || "#2563eb",
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-gray-600">{Icons.folder}</span>
                <h3 className="font-semibold text-gray-900">{group.name}</h3>
                <span className="text-sm text-gray-600 font-medium">
                  ({group.entries.length})
                </span>
              </div>
              {group.id !== 1 && (
                <button
                  onClick={async () => {
                    if (confirm("确定删除这个分组吗？物品会移到默认分组")) {
                      await api.groups.delete(group.id);
                      manualRefresh();
                    }
                  }}
                  className="text-sm text-red-500 hover:text-red-600 transition-colors"
                >
                  删除
                </button>
              )}
            </div>

            <div className="p-4 space-y-3">
              {group.entries.map((entry) => (
                <div
                  key={entry.id}
                  className={`p-4 rounded-xl bg-white border transition-all ${selectedIds.has(entry.id)
                    ? "border-purple-400 bg-purple-50 shadow-md"
                    : "border-gray-100 hover:border-blue-200 hover:shadow-md"
                    }`}
                >
                  <div className="flex items-start gap-3">
                    {isCompareMode && (
                      <div
                        className="flex-shrink-0 mt-1 cursor-pointer"
                        onClick={() => toggleSelect(entry.id)}
                      >
                        <div
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${selectedIds.has(entry.id)
                            ? "bg-purple-500 border-purple-500"
                            : "border-gray-300 hover:border-purple-400"
                            }`}
                        >
                          {selectedIds.has(entry.id) && (
                            <svg
                              className="w-3 h-3 text-white"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={3}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                        </div>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-medium text-gray-900 truncate">
                              {entry.item?.name || entry.itemId}
                            </h4>
                            <span
                              className={`px-2 py-0.5 text-xs font-semibold rounded border ${entry.item?.rarity === "red"
                                ? "bg-red-50 text-red-600 border-red-200"
                                : "bg-amber-50 text-amber-600 border-amber-200"
                                }`}
                            >
                              {entry.item?.rarity === "red" ? "红" : "金"}
                            </span>
                            {entry.item?.status === "draw" && (
                              <span className="px-2 py-0.5 text-xs font-medium rounded bg-purple-50 text-purple-600 border border-purple-200">
                                抽签期
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                            <span className="text-blue-600 font-semibold">
                              {entry.item
                                ? formatPrice(entry.item.currentPrice)
                                : "-"}
                            </span>
                            {entry.targetPrice && (
                              <span className="text-gray-600">
                                目标:{" "}
                                <span className="text-gray-800 font-medium">
                                  {formatPrice(entry.targetPrice)}
                                </span>
                              </span>
                            )}
                            {entry.item?.lastCheckedAt && (
                              <span
                                className={`text-xs ${getFreshnessClass(new Date(entry.item.lastCheckedAt))}`}
                              >
                                更新于{" "}
                                {formatLastUpdated(
                                  new Date(entry.item.lastCheckedAt),
                                )}
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
                                className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 w-32 focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-200"
                              />
                              <button
                                onClick={() => handleUpdatePrice(entry.id)}
                                className="px-3 py-1.5 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
                              >
                                保存
                              </button>
                              <button
                                onClick={() => {
                                  setEditingId(null);
                                  setEditPrice("");
                                }}
                                className="px-3 py-1.5 text-gray-500 hover:text-gray-700 text-sm transition-colors"
                              >
                                取消
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingId(entry.id);
                                setEditPrice(
                                  entry.targetPrice
                                    ? (entry.targetPrice / 100).toString()
                                    : "",
                                );
                              }}
                              className="flex items-center gap-1 mt-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
                            >
                              {Icons.edit}
                              {entry.targetPrice ? "修改目标价" : "设置目标价"}
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={entry.alertEnabled}
                                onChange={() =>
                                  handleToggleAlert(
                                    entry.id,
                                    entry.alertEnabled,
                                  )
                                }
                                className="sr-only peer"
                              />
                              <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-500 shadow-sm" />
                            </div>
                            <span className="hidden sm:inline">提醒</span>
                          </label>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="删除"
                          >
                            {Icons.trash}
                          </button>
                        </div>
                      </div>

                      {entry.targetPrice &&
                        entry.item &&
                        entry.item.currentPrice <= entry.targetPrice && (
                          <div className="mt-3 p-3 bg-gradient-to-r from-emerald-50 to-white border border-emerald-200 rounded-xl">
                            <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
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
                                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              价格已达标！当前{" "}
                              {formatPrice(entry.item.currentPrice)} ≤ 目标{" "}
                              {formatPrice(entry.targetPrice)}
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* 底部浮动对比栏 */}
      {isCompareMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="flex items-center gap-4 px-6 py-4 bg-white rounded-2xl shadow-xl border border-purple-200">
            <span className="text-sm text-gray-600">
              已选择{" "}
              <span className="font-semibold text-purple-600">
                {selectedIds.size}
              </span>{" "}
              个物品
            </span>
            <div className="w-px h-6 bg-gray-200" />
            <button
              onClick={handleAddToCompare}
              disabled={addingToCompare}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {Icons.compare}
              {addingToCompare ? "添加中..." : "加入对比"}
            </button>
            <button
              onClick={cancelCompareMode}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {Icons.close}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
