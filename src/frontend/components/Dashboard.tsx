import { useState, useEffect } from "react";
import api from "../services/api";
import type { WatchlistEntry, Alert } from "@shared/types";

const Icons = {
  alert: (
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
  trendingDown: (
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
        d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"
      />
    </svg>
  ),
  eye: (
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
        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
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
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
      />
    </svg>
  ),
};

function StatCard({
  label,
  value,
  icon,
  variant = "default",
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  variant?: "default" | "alert" | "success";
}) {
  const variantStyles = {
    default: "border-blue-200 bg-gradient-to-br from-white to-blue-50/50",
    alert: "border-red-200 bg-gradient-to-br from-red-50 to-white",
    success: "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white",
  };

  const iconStyles = {
    default: "text-blue-500",
    alert: "text-red-500",
    success: "text-emerald-500",
  };

  const valueStyles = {
    default: "text-gray-900",
    alert: "text-red-600",
    success: "text-emerald-600",
  };

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${variantStyles[variant]} p-6 shadow-sm hover:shadow-md transition-shadow`}
    >
      <div className="flex items-center gap-3 text-gray-600 mb-3">
        <span className={iconStyles[variant]}>{icon}</span>
        <span className="text-sm font-semibold">{label}</span>
      </div>
      <p className={`text-4xl font-bold ${valueStyles[variant]}`}>{value}</p>
    </div>
  );
}

function AlertBanner({
  alerts,
  watchlist,
  onMarkRead,
}: {
  alerts: Alert[];
  watchlist: WatchlistEntry[];
  onMarkRead: (id: number) => void;
}) {
  const formatPrice = (cents: number) => `¥${(cents / 100).toFixed(2)}`;

  if (alerts.length === 0) return null;

  return (
    <div className="rounded-2xl border border-red-200 bg-gradient-to-r from-red-50 to-white p-6 shadow-sm">
      <div className="flex items-center gap-2 text-red-600 mb-4">
        {Icons.alert}
        <h3 className="font-semibold">价格提醒</h3>
        <span className="ml-auto text-sm text-red-400 bg-red-100 px-2.5 py-1 rounded-full">
          {alerts.length} 个未读
        </span>
      </div>
      <div className="space-y-2">
        {alerts.slice(0, 5).map((alert) => {
          const entry = watchlist.find((w) => w.itemId === alert.itemId);
          return (
            <div
              key={alert.id}
              className="flex items-center justify-between bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    entry?.item?.rarity === "red"
                      ? "bg-red-500"
                      : "bg-amber-500"
                  }`}
                />
                <div>
                  <p className="font-medium text-gray-900">
                    {entry?.item?.name || alert.itemId}
                  </p>
                  <p className="text-sm text-gray-500">
                    现价{" "}
                    <span className="text-red-600 font-semibold">
                      {formatPrice(alert.triggeredPrice)}
                    </span>{" "}
                    / 目标{" "}
                    <span className="text-gray-600">
                      {formatPrice(alert.targetPrice)}
                    </span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => onMarkRead(alert.id)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
              >
                {Icons.check}
                已读
              </button>
            </div>
          );
        })}
        {alerts.length > 5 && (
          <p className="text-center text-sm text-gray-400 pt-2">
            还有 {alerts.length - 5} 个提醒...
          </p>
        )}
      </div>
    </div>
  );
}

function WatchlistPreview({ watchlist }: { watchlist: WatchlistEntry[] }) {
  const formatPrice = (cents: number) => `¥${(cents / 100).toFixed(2)}`;

  const getProgress = (entry: WatchlistEntry) => {
    if (!entry.targetPrice || !entry.item) return null;
    const current = entry.item.currentPrice;
    const target = entry.targetPrice;
    if (current <= target) return 100;
    return Math.max(0, Math.min(100, (target / current) * 100));
  };

  if (watchlist.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-100 mb-5 shadow-sm">
          {Icons.empty}
        </div>
        <p className="text-base font-semibold text-gray-600 mb-1">
          暂无监控物品
        </p>
        <a
          href="/search"
          className="inline-flex items-center gap-1 mt-2 text-blue-600 hover:text-blue-700 font-medium"
        >
          去搜索添加
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
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {watchlist.slice(0, 6).map((entry) => {
        const progress = getProgress(entry);
        const isReached = progress === 100;

        return (
          <div
            key={entry.id}
            className="group flex items-center gap-4 p-4 rounded-xl bg-white border border-gray-100 hover:border-blue-200 hover:shadow-md transition-all"
          >
            <span
              className={`flex-shrink-0 w-1.5 h-10 rounded-full ${
                entry.item?.rarity === "red" ? "bg-red-500" : "bg-amber-500"
              }`}
            />

            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                {entry.item?.name || entry.itemId}
              </h4>
              <p className="text-sm text-gray-600">
                {entry.item?.category === "hero_skin"
                  ? "英雄皮肤"
                  : entry.item?.category === "weapon_skin"
                    ? "兵器皮肤"
                    : "道具"}
              </p>
            </div>

            <div className="text-right">
              <p
                className={`font-bold ${isReached ? "text-emerald-600" : "text-gray-900"}`}
              >
                {entry.item ? formatPrice(entry.item.currentPrice) : "-"}
              </p>
              {entry.targetPrice && (
                <p className="text-xs text-gray-500">
                  目标 {formatPrice(entry.targetPrice)}
                </p>
              )}
            </div>

            {progress !== null && (
              <div className="w-24">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isReached
                        ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                        : "bg-gradient-to-r from-blue-500 to-blue-400"
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                {isReached && (
                  <p className="text-xs text-emerald-600 text-center mt-1 font-medium">
                    已达标
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}

      {watchlist.length > 6 && (
        <a
          href="/watchlist"
          className="flex items-center justify-center gap-1 py-3 text-sm text-gray-500 hover:text-blue-600 transition-colors"
        >
          查看全部 {watchlist.length} 个物品
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
        </a>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [watchlistData, alertsData] = await Promise.all([
          api.watchlist.getAll(),
          api.alerts.getAll(true),
        ]);
        setWatchlist(watchlistData);
        setAlerts(alertsData);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkRead = async (alertId: number) => {
    try {
      await api.alerts.markRead(alertId);
      setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    } catch (error) {
      console.error("Failed to mark alert as read:", error);
    }
  };

  const reachedCount = watchlist.filter(
    (e) => e.targetPrice && e.item && e.item.currentPrice <= e.targetPrice,
  ).length;

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-2xl bg-gray-100 animate-pulse"
            />
          ))}
        </div>
        <div className="h-64 rounded-2xl bg-gray-100 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="监控物品"
          value={watchlist.length}
          icon={Icons.eye}
          variant="default"
        />
        <StatCard
          label="未读提醒"
          value={alerts.length}
          icon={Icons.alert}
          variant={alerts.length > 0 ? "alert" : "default"}
        />
        <StatCard
          label="价格达标"
          value={reachedCount}
          icon={Icons.trendingDown}
          variant={reachedCount > 0 ? "success" : "default"}
        />
      </div>

      <AlertBanner
        alerts={alerts}
        watchlist={watchlist}
        onMarkRead={handleMarkRead}
      />

      <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <h3 className="font-semibold text-gray-900">监控列表</h3>
          <a
            href="/watchlist"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            管理
          </a>
        </div>
        <div className="p-5">
          <WatchlistPreview watchlist={watchlist} />
        </div>
      </div>
    </div>
  );
}
