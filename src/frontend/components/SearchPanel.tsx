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
  const [minPrice, setMinPrice] = useState<string>("");
  const [maxPrice, setMaxPrice] = useState<string>("");

  const [variationUnlockLevel, setVariationUnlockLevel] = useState<string>("");

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
        variationUnlockLevel: variationUnlockLevel
          ? Number(variationUnlockLevel)
          : undefined,
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
    variationUnlockLevel,
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
    variationUnlockLevel,
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
      color: "text-red-500 border-red-300",
    },
    {
      value: "gold",
      label: "金色品质",
      color: "text-amber-500 border-amber-300",
    },
  ];

  const starUnlockOptions = [
    { value: "", label: "星格" },
    { value: "2", label: "星格部分解封" },
    { value: "1", label: "星格全解封" },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      {/* Sidebar Filters */}
      <aside className="w-full lg:w-64 flex-shrink-0 space-y-8">
        {/* Category Filter */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            物品分类
          </h3>
          <div className="space-y-1">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setCategory(cat.value)}
                className={`w-full text-left px-4 py-2.5 rounded-xl transition-all ${
                  category === cat.value
                    ? "bg-blue-50 text-blue-600 border border-blue-200"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="mt-4 pl-3 border-l border-gray-200 space-y-2">
            <label className="text-xs font-medium text-gray-500 flex items-center gap-2">
              <span className="text-amber-500">★</span>
              星格（目录子筛选）
            </label>
            <select
              value={variationUnlockLevel}
              onChange={(e) => setVariationUnlockLevel(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
            >
              {starUnlockOptions.map((option) => (
                <option key={option.value || "all"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Price Filter */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            价格区间 (元)
          </h3>
          <div className="flex items-center gap-2">
            <input
              type="number"
              placeholder="最低"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
            />
            <span className="text-gray-400">-</span>
            <input
              type="number"
              placeholder="最高"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Rarity Filter */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
            稀有度
          </h3>
          <div className="space-y-2">
            {rarities.map((r) => (
              <label
                key={r.value}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all shadow-sm ${
                  rarity === r.value
                    ? `bg-white ${r.color}`
                    : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                }`}
              >
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center ${
                    rarity === r.value
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
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">
            {Icons.search}
          </div>
          <input
            type="text"
            placeholder={`在 ${categories.find((c) => c.value === category)?.label} 中搜索...`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all shadow-sm"
          />
        </div>

        {/* Results Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-gray-900 font-medium">
            {meta?.cached && (
              <span className="mr-2 px-2 py-0.5 rounded text-xs bg-amber-50 text-amber-600 border border-amber-200">
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
                className="aspect-[4/5] rounded-2xl bg-gray-100 animate-pulse"
              />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 rounded-2xl bg-gray-50 border border-gray-200 border-dashed">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-3xl mb-4 text-blue-300">
              {Icons.empty}
            </div>
            <p className="text-lg font-medium text-gray-700">
              没有找到匹配的物品
            </p>
            <p className="text-sm mt-1 text-gray-500">
              尝试更换关键词或清除筛选条件
            </p>
            {(query ||
              rarity ||
              minPrice ||
              maxPrice ||
              variationUnlockLevel) && (
              <button
                onClick={() => {
                  setQuery("");
                  setRarity("");
                  setMinPrice("");
                  setMaxPrice("");
                  setVariationUnlockLevel("");
                }}
                className="mt-6 px-4 py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-xl transition-colors"
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
          <div className="flex items-center justify-center gap-4 pt-8 border-t border-gray-200 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              上一页
            </button>
            <span className="text-gray-500 text-sm">
              第 <span className="text-gray-900 font-medium">{page}</span> /{" "}
              {meta.pageCount} 页
            </span>
            <button
              onClick={() => setPage((p) => Math.min(meta.pageCount, p + 1))}
              disabled={page === meta.pageCount}
              className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
            >
              下一页
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
