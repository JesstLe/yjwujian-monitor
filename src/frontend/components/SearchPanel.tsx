import { useState, useEffect, useCallback, useRef } from "react";
import api from "../services/api";
import ItemCard from "./ItemCard";
import type { Item, ItemCategory } from "@shared/types";

const Icons = {
  search: (
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
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  ),
  filter: (
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
        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
      />
    </svg>
  ),
  chevronLeft: (
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
        d="M15 19l-7-7 7-7"
      />
    </svg>
  ),
  chevronRight: (
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
        d="M9 5l7 7-7 7"
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
        d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
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
        strokeWidth={3}
        d="M5 13l4 4L19 7"
      />
    </svg>
  ),
};

export default function SearchPanel() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ItemCategory>("hero_skin");
  const [rarity, setRarity] = useState<string>("");

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<{
    total: number;
    pageCount: number;
    cached?: boolean;
  } | null>(null);
  const [retryCountdown, setRetryCountdown] = useState(0);
  const [upstreamError, setUpstreamError] = useState<string | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 清除倒计时定时器
  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current) {
      clearInterval(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  // 启动30秒倒计时
  const startRetryCountdown = useCallback(() => {
    clearRetryTimer();
    setRetryCountdown(30);
    retryTimerRef.current = setInterval(() => {
      setRetryCountdown((prev) => {
        if (prev <= 1) {
          clearRetryTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [clearRetryTimer]);

  // 组件卸载时清除定时器
  useEffect(() => {
    return () => clearRetryTimer();
  }, [clearRetryTimer]);

  const searchItems = useCallback(async () => {
    setLoading(true);
    setUpstreamError(null);
    try {
      const result = await api.items.search({
        q: query || undefined,
        category,
        rarity: rarity || undefined,
        page,
        limit: 15,
      });
      setItems(result.data || []);
      setMeta(result.meta || null);

      // 检查是否使用了缓存数据（即上游API失败了）
      if (result.meta?.cached && result.error) {
        setUpstreamError(result.error);
        startRetryCountdown();
      } else {
        setUpstreamError(null);
        clearRetryTimer();
        setRetryCountdown(0);
      }
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  }, [
    query,
    category,
    rarity,
    page,
    startRetryCountdown,
    clearRetryTimer,
  ]);

  // 倒计时结束时自动重试
  useEffect(() => {
    if (retryCountdown === 0 && upstreamError) {
      searchItems();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryCountdown]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(searchItems, 500);
    return () => clearTimeout(timer);
  }, [searchItems]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [
    query,
    category,
    rarity,
  ]);

  const handleAddToWatchlist = useCallback(async (item: Item) => {
    try {
      await api.watchlist.add({ itemId: item.id, item });
      // Could show toast here
    } catch (error) {
      alert(error instanceof Error ? error.message : "添加失败");
    }
  }, []);

  const categories: { value: ItemCategory; label: string }[] = [
    { value: "hero_skin", label: "英雄皮肤" },
    { value: "weapon_skin", label: "兵器皮肤" },
    { value: "item", label: "道具" },
  ];

  const rarities = [
    {
      value: "red",
      label: "红色品质",
      color: "text-red-500 border-red-300",
    },
    {
      value: "gold",
      label: "金色品质",
      color: "text-amber-500 border-amber-300",
    },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Sidebar Filters */}
      <aside className="w-full lg:w-72 flex-shrink-0 space-y-6">
        {/* Category & Sub-Filters */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-6">
          <div>
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4">
              物品分类
            </h3>
            <div className="space-y-2">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 ${category === cat.value
                    ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/25"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 border border-gray-100 hover:border-gray-200"
                    }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* Rarity Filter */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4">
            稀有度
          </h3>
          <div className="space-y-3">
            {rarities.map((r) => (
              <label
                key={r.value}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 ${rarity === r.value
                  ? `border-current ${r.color} bg-gradient-to-r from-white to-gray-50 shadow-sm`
                  : "border-gray-100 bg-white text-gray-600 hover:border-gray-200 hover:bg-gray-50"
                  }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${rarity === r.value
                    ? "bg-current border-current"
                    : "border-gray-300"
                    }`}
                >
                  {rarity === r.value && (
                    <div className="text-white transform scale-75">
                      {Icons.check}
                    </div>
                  )}
                </div>
                <input
                  type="radio"
                  name="rarity"
                  value={r.value}
                  checked={rarity === r.value}
                  onChange={() => setRarity(rarity === r.value ? "" : r.value)}
                  onClick={(e) => {
                    if (rarity === r.value) {
                      e.preventDefault();
                      setRarity("");
                    }
                  }}
                  className="hidden"
                />
                <span className="text-sm font-medium">{r.label}</span>
              </label>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {/* Search Bar */}
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-gray-400">
            {Icons.search}
          </div>
          <input
            type="text"
            placeholder={`在 ${categories.find((c) => c.value === category)?.label} 中搜索...`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-12 pr-5 py-4 bg-white border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm hover:shadow-md"
          />
        </div>

        {/* 上游API失败提示 */}
        {upstreamError && (
          <div className="mb-5 p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-amber-800">数据获取失败，当前显示的是本地缓存数据</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  {retryCountdown > 0
                    ? `将在 ${retryCountdown} 秒后自动重试...`
                    : "正在重试中..."}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                clearRetryTimer();
                setRetryCountdown(0);
                setUpstreamError(null);
                searchItems();
              }}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors flex-shrink-0 disabled:opacity-50"
            >
              立即重试
            </button>
          </div>
        )}

        {/* Results Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <h2 className="text-gray-800 font-semibold text-lg">
              {loading ? "搜索中..." : `找到 ${meta?.total || 0} 个物品`}
            </h2>
          </div>
        </div>

        {/* Results Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="aspect-[4/5] rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 animate-pulse"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 rounded-3xl bg-gradient-to-br from-gray-50 to-white border border-gray-200 border-dashed">
            <div className="inline-flex items-center justify-center w-28 h-28 bg-gradient-to-br from-blue-100 to-indigo-150 rounded-3xl mb-5 text-blue-400 shadow-inner">
              {Icons.empty}
            </div>
            <p className="text-xl font-semibold text-gray-700 mb-2">
              没有找到匹配的物品
            </p>
            <p className="text-sm text-gray-500">
              尝试更换关键词或清除筛选条件
            </p>
            {(query ||
              rarity) && (
                <button
                  onClick={() => {
                    setQuery("");
                    setRarity("");
                  }}
                  className="mt-8 px-6 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl shadow-md shadow-blue-500/25 transition-all"
                >
                  清除所有筛选
                </button>
              )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-fade-in relative">
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onAddToWatchlist={handleAddToWatchlist}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {meta && meta.pageCount > 1 && (
          <div className="flex items-center justify-center gap-3 pt-10 mt-10 border-t border-gray-100">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              {Icons.chevronLeft}
              上一页
            </button>
            <div className="px-5 py-2.5 bg-gray-50 rounded-xl">
              <span className="text-gray-500 text-sm">
                第 <span className="text-gray-800 font-semibold">{page}</span> /{" "}
                <span className="text-gray-800 font-semibold">
                  {meta.pageCount}
                </span>{" "}
                页
              </span>
            </div>
            <button
              onClick={() => setPage((p) => Math.min(meta.pageCount, p + 1))}
              disabled={page === meta.pageCount}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
            >
              下一页
              {Icons.chevronRight}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
