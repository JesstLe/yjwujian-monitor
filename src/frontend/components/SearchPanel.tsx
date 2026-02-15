import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import ItemCard from './ItemCard';
import type { Item, ItemCategory } from '@shared/types';

const Icons = {
  search: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  filter: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
    </svg>
  ),
  chevronLeft: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  ),
  chevronRight: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  empty: (
    <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export default function SearchPanel() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ItemCategory>('hero_skin');
  const [rarity, setRarity] = useState<string>('');
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<{ total: number; pageCount: number } | null>(null);

  const searchItems = useCallback(async () => {
    setLoading(true);
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
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  }, [query, category, rarity, page]);

  useEffect(() => {
    const timer = setTimeout(searchItems, 300);
    return () => clearTimeout(timer);
  }, [searchItems]);

  const handleAddToWatchlist = async (item: Item) => {
    try {
      await api.watchlist.add({ itemId: item.id, item });
      alert(`已添加 ${item.name} 到监控列表`);
    } catch (error) {
      const message = error instanceof Error ? error.message : '添加失败';
      alert(message);
    }
  };

  const categoryOptions: { value: ItemCategory; label: string }[] = [
    { value: 'hero_skin', label: '英雄皮肤' },
    { value: 'weapon_skin', label: '兵器皮肤' },
    { value: 'item', label: '道具' },
  ];

  const rarityOptions: { value: string; label: string; color: string }[] = [
    { value: '', label: '全部稀有度', color: 'text-slate-400' },
    { value: 'red', label: '红色', color: 'text-red-400' },
    { value: 'gold', label: '金色', color: 'text-amber-400' },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-800/50 bg-slate-900/30 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
              {Icons.search}
            </div>
            <input
              type="text"
              placeholder="搜索物品名称..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
            />
          </div>

          <div className="flex gap-3">
            <div className="relative">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ItemCategory)}
                className="appearance-none px-4 py-2.5 pr-10 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all cursor-pointer"
              >
                {categoryOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            <div className="relative">
              <select
                value={rarity}
                onChange={(e) => setRarity(e.target.value)}
                className="appearance-none px-4 py-2.5 pr-10 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-200 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all cursor-pointer"
              >
                {rarityOptions.map((opt) => (
                  <option key={opt.value || 'all'} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {meta && (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-800/50 text-sm text-slate-500">
            {Icons.filter}
            <span>共找到 {meta.total} 个物品</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 rounded-xl bg-slate-800/30 animate-pulse" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800/50 mb-4">
            {Icons.empty}
          </div>
          <p className="text-lg font-medium text-slate-400">没有找到物品</p>
          <p className="text-sm mt-1">尝试调整搜索条件</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map((item) => (
              <ItemCard
                key={item.id}
                item={item}
                onAddToWatchlist={handleAddToWatchlist}
              />
            ))}
          </div>

          {meta && meta.pageCount > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="flex items-center gap-1 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 rounded-lg border border-slate-700/50 transition-colors"
              >
                {Icons.chevronLeft}
                上一页
              </button>
              <span className="px-4 py-2 text-slate-400 text-sm font-medium">
                {page} / {meta.pageCount}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(meta.pageCount, p + 1))}
                disabled={page === meta.pageCount}
                className="flex items-center gap-1 px-4 py-2 bg-slate-800/50 hover:bg-slate-700/50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 rounded-lg border border-slate-700/50 transition-colors"
              >
                下一页
                {Icons.chevronRight}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
