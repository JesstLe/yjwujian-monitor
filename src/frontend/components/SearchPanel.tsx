import { useState, useEffect, useCallback } from "react";
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
      className="w-16 h-16"
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
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");

  // Star grid filters
  const [starLevel, setStarLevel] = useState<string>("");
  const [slot1Min, setSlot1Min] = useState<string>("");
  const [slot1Max, setSlot1Max] = useState<string>("");
  const [slot2Min, setSlot2Min] = useState<string>("");
  const [slot2Max, setSlot2Max] = useState<string>("");
  const [slot3Min, setSlot3Min] = useState<string>("");
  const [slot3Max, setSlot3Max] = useState<string>("");
  const [slot4Min, setSlot4Min] = useState<string>("");
  const [slot4Max, setSlot4Max] = useState<string>("");

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<{
    total: number;
    pageCount: number;
    cached?: boolean;
  } | null>(null);

  const searchItems = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.items.search({
        q: query || undefined,
        category,
        rarity: rarity || undefined,
        minPrice: minPrice ? Number(minPrice) : undefined,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        starLevel: starLevel ? Number(starLevel) : undefined,
        slot1Min: slot1Min ? Number(slot1Min) : undefined,
        slot1Max: slot1Max ? Number(slot1Max) : undefined,
        slot2Min: slot2Min ? Number(slot2Min) : undefined,
        slot2Max: slot2Max ? Number(slot2Max) : undefined,
        slot3Min: slot3Min ? Number(slot3Min) : undefined,
        slot3Max: slot3Max ? Number(slot3Max) : undefined,
        slot4Min: slot4Min ? Number(slot4Min) : undefined,
        slot4Max: slot4Max ? Number(slot4Max) : undefined,
        page,
        limit: 15,
      });
      setItems(result.data || []);
      setMeta(result.meta || null);
    } catch (error) {
      console.error("Search failed:", error);
    } finally {
      setLoading(false);
    }
  }, [
    query,
    category,
    rarity,
    minPrice,
    maxPrice,
    starLevel,
    slot1Min,
    slot1Max,
    slot2Min,
    slot2Max,
    slot3Min,
    slot3Max,
    slot4Min,
    slot4Max,
    page,
  ]);

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
    minPrice,
    maxPrice,
    starLevel,
    slot1Min,
    slot1Max,
    slot2Min,
    slot2Max,
    slot3Min,
    slot3Max,
    slot4Min,
    slot4Max,
  ]);

  const handleAddToWatchlist = async (item: Item) => {
    try {
      await api.watchlist.add({ itemId: item.id, item });
      // Could show toast here
    } catch (error) {
      alert(error instanceof Error ? error.message : "添加失败");
    }
  };

  const categories: { value: ItemCategory; label: string }[] = [
    { value: "hero_skin", label: "英雄皮肤" },
    { value: "weapon_skin", label: "兵器皮肤" },
    { value: "item", label: "道具" },
  ];

  const rarities = [
    {
      value: "red",
      label: "红色品质",
      color: "text-red-400 border-red-500/50",
    },
    {
      value: "gold",
      label: "金色品质",
      color: "text-amber-400 border-amber-500/50",
    },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Sidebar Filters */}
      <aside className="w-full lg:w-64 flex-shrink-0 space-y-8">
        {/* Category Filter */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            物品分类
          </h3>
          <div className="space-y-1">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`w-full text-left px-4 py-2.5 rounded-lg transition-all ${
                  category === cat.value
                    ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/30"
                    : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Price Filter */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            价格区间 (元)
          </h3>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="最低"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none"
            />
            <span className="text-slate-600">-</span>
            <input
              type="number"
              placeholder="最高"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none"
            />
          </div>
        </div>

        {/* Rarity Filter */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
            稀有度
          </h3>
          <div className="space-y-2">
            {rarities.map((r) => (
              <label
                key={r.value}
                className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                  rarity === r.value
                    ? `bg-slate-800/80 ${r.color}`
                    : "border-slate-800 bg-slate-900/30 text-slate-500 hover:border-slate-700"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center ${
                    rarity === r.value
                      ? "bg-current border-current"
                      : "border-slate-600"
                  }`}
                >
                  {rarity === r.value && (
                    <div className="text-black transform scale-75">
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

        {/* Star Grid Filter */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-slate-800/40 to-slate-900/40 border border-slate-700/30">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-600/20 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-amber-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-slate-300">星格筛选</h3>
            {(starLevel ||
              slot1Min ||
              slot1Max ||
              slot2Min ||
              slot2Max ||
              slot3Min ||
              slot3Max ||
              slot4Min ||
              slot4Max) && (
              <span className="ml-auto px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-400 text-xs">
                已启用
              </span>
            )}
          </div>

          {/* Star Level */}
          <div className="space-y-3">
            <label className="text-xs font-medium text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              星数
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((level) => (
                <button
                  key={level}
                  onClick={() =>
                    setStarLevel(
                      starLevel === String(level) ? "" : String(level),
                    )
                  }
                  className={`relative py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
                    starLevel === String(level)
                      ? "bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-amber-500/30 scale-105"
                      : "bg-slate-800/60 text-slate-400 border border-slate-700/50 hover:bg-slate-700/50 hover:border-slate-600 hover:scale-102"
                  }`}
                >
                  <span className="flex items-center justify-center gap-1">
                    {level}
                    <svg
                      className="w-3.5 h-3.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Slot Ranges */}
          <div className="mt-4 space-y-2">
            <label className="text-xs font-medium text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              槽位数值范围
            </label>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-6 text-xs text-slate-500 font-medium">
                  槽1
                </span>
                <div className="flex-1 flex items-center gap-1">
                  <input
                    type="number"
                    placeholder="最小"
                    value={slot1Min}
                    onChange={(e) => setSlot1Min(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-800/70 border border-slate-700/50 rounded-md text-sm text-slate-200 placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all"
                  />
                  <span className="text-slate-600 text-xs">~</span>
                  <input
                    type="number"
                    placeholder="最大"
                    value={slot1Max}
                    onChange={(e) => setSlot1Max(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-800/70 border border-slate-700/50 rounded-md text-sm text-slate-200 placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-6 text-xs text-slate-500 font-medium">
                  槽2
                </span>
                <div className="flex-1 flex items-center gap-1">
                  <input
                    type="number"
                    placeholder="最小"
                    value={slot2Min}
                    onChange={(e) => setSlot2Min(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-800/70 border border-slate-700/50 rounded-md text-sm text-slate-200 placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all"
                  />
                  <span className="text-slate-600 text-xs">~</span>
                  <input
                    type="number"
                    placeholder="最大"
                    value={slot2Max}
                    onChange={(e) => setSlot2Max(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-800/70 border border-slate-700/50 rounded-md text-sm text-slate-200 placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-6 text-xs text-slate-500 font-medium">
                  槽3
                </span>
                <div className="flex-1 flex items-center gap-1">
                  <input
                    type="number"
                    placeholder="最小"
                    value={slot3Min}
                    onChange={(e) => setSlot3Min(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-800/70 border border-slate-700/50 rounded-md text-sm text-slate-200 placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all"
                  />
                  <span className="text-slate-600 text-xs">~</span>
                  <input
                    type="number"
                    placeholder="最大"
                    value={slot3Max}
                    onChange={(e) => setSlot3Max(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-800/70 border border-slate-700/50 rounded-md text-sm text-slate-200 placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="w-6 text-xs text-slate-500 font-medium">
                  槽4
                </span>
                <div className="flex-1 flex items-center gap-1">
                  <input
                    type="number"
                    placeholder="最小"
                    value={slot4Min}
                    onChange={(e) => setSlot4Min(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-800/70 border border-slate-700/50 rounded-md text-sm text-slate-200 placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all"
                  />
                  <span className="text-slate-600 text-xs">~</span>
                  <input
                    type="number"
                    placeholder="最大"
                    value={slot4Max}
                    onChange={(e) => setSlot4Max(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-800/70 border border-slate-700/50 rounded-md text-sm text-slate-200 placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none focus:ring-1 focus:ring-cyan-500/20 transition-all"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {/* Search Bar */}
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-500">
            {Icons.search}
          </div>
          <input
            type="text"
            placeholder={`在 ${categories.find((c) => c.value === category)?.label} 中搜索...`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-slate-800 rounded-xl text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all shadow-sm"
          />
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-slate-200 font-medium">
            {meta?.cached && (
              <span className="mr-2 px-2 py-0.5 rounded text-xs bg-amber-500/10 text-amber-500 border border-amber-500/20">
                本地缓存
              </span>
            )}
            {loading ? "搜索中..." : `找到 ${meta?.total || 0} 个物品`}
          </h2>
        </div>

        {/* Results Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="aspect-[4/5] rounded-xl bg-slate-800/30 animate-pulse"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 rounded-2xl bg-slate-900/30 border border-slate-800/50 border-dashed">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800/50 mb-4 text-slate-500">
              {Icons.empty}
            </div>
            <p className="text-lg font-medium text-slate-400">
              没有找到匹配的物品
            </p>
            <p className="text-sm mt-1 text-slate-500">
              尝试更换关键词或清除筛选条件
            </p>
            {(query ||
              rarity ||
              minPrice ||
              maxPrice ||
              starLevel ||
              slot1Min ||
              slot1Max ||
              slot2Min ||
              slot2Max ||
              slot3Min ||
              slot3Max ||
              slot4Min ||
              slot4Max) && (
              <button
                onClick={() => {
                  setQuery("");
                  setRarity("");
                  setMinPrice("");
                  setMaxPrice("");
                  setStarLevel("");
                  setSlot1Min("");
                  setSlot1Max("");
                  setSlot2Min("");
                  setSlot2Max("");
                  setSlot3Min("");
                  setSlot3Max("");
                  setSlot4Min("");
                  setSlot4Max("");
                }}
                className="mt-6 px-4 py-2 text-sm text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-lg transition-colors"
              >
                清除所有筛选
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in relative">
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
          <div className="flex items-center justify-center gap-4 pt-8 border-t border-slate-800/50 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              上一页
            </button>
            <span className="text-slate-500 text-sm">
              第 <span className="text-slate-200 font-medium">{page}</span> /{" "}
              {meta.pageCount} 页
            </span>
            <button
              onClick={() => setPage((p) => Math.min(meta.pageCount, p + 1))}
              disabled={page === meta.pageCount}
              className="px-4 py-2 rounded-lg bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              下一页
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
