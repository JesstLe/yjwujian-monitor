import { useState, useEffect, useCallback } from 'react';
import ItemCard from './ItemCard';
import ItemDetailModal from './ItemDetailModal';
import { api } from '../services/api';
import type { Item } from '@shared/types';

interface SubItemsListProps {
    equipType: string; // The aggregate item ID
    searchType: string;
    className?: string;
}

const SortOptions = [
    { value: 'price ASC', label: '价格从低到高' },
    { value: 'price DESC', label: '价格从高到低' },
    { value: 'selling_time DESC', label: '最新上架' },
];

export default function SubItemsList({ equipType, searchType, className = '' }: SubItemsListProps) {
    const [items, setItems] = useState<Item[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [sort, setSort] = useState('price ASC');
    const [error, setError] = useState<string | null>(null);
    const [selectedItem, setSelectedItem] = useState<Item | null>(null);
    const [showDetail, setShowDetail] = useState(false);

    const handleItemClick = (item: Item) => {
        setSelectedItem(item);
        setShowDetail(true);
    };

    const handleCloseDetail = () => {
        setShowDetail(false);
        setTimeout(() => setSelectedItem(null), 300); // Clear after fade out
    };

    const fetchItems = useCallback(async (isLoadMore = false) => {
        if (isLoadMore) {
            setLoadingMore(true);
        } else {
            setLoading(true);
        }
        setError(null);

        try {
            const result = await api.items.getListings(equipType, {
                searchType,
                page: isLoadMore ? page : 1, // Use current page state for load more, or reset to 1
                sort,
            });

            if (isLoadMore) {
                setItems((prev) => [...prev, ...(result.data || [])]);
            } else {
                setItems(result.data || []);
            }

            setHasMore(!result.meta?.isLastPage);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : '获取在售列表失败');
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [equipType, searchType, sort, page]);

    // Initial fetch or sort change
    useEffect(() => {
        // When sort changes, reset page to 1 and fetch
        // But we need to handle page state separately or just pass 1 directly in fetchItems
        // My logic above uses `page` state only for Load More. 
        // Let's simplfy: reset page to 1 on sort change, but effect dependency on page might trigger loop if not careful.

        // Better: only trigger fetch on mount or sort change. 
        // Load more will trigger fetch manually.
        setPage(1);
        fetchItems(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [equipType, searchType, sort]);

    // Effect for page change (Load More)
    useEffect(() => {
        if (page > 1) {
            fetchItems(true);
        }
    }, [page, fetchItems]);

    const handleLoadMore = () => {
        if (!loadingMore && hasMore) {
            setPage((p) => p + 1);
        }
    };

    const handleAddToWatchlist = async (item: Item) => {
        try {
            await api.watchlist.add({ itemId: item.id, item });
            alert(`已添加 ${item.name} (${item.serialNum}) 到监控列表`);
        } catch (error) {
            const message = error instanceof Error ? error.message : '添加失败';
            alert(message);
        }
    };

    return (
        <div className={`space-y-4 ${className}`}>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                    <span className="w-1 h-6 bg-cyan-500 rounded-full"></span>
                    在售列表
                    <span className="text-sm font-normal text-slate-500 ml-2">
                        共 {items.length}{hasMore ? '+' : ''} 件
                    </span>
                </h2>

                <div className="relative">
                    <select
                        value={sort}
                        onChange={(e) => setSort(e.target.value)}
                        className="appearance-none pl-4 pr-10 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-300 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all cursor-pointer"
                    >
                        {SortOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                                {opt.label}
                            </option>
                        ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                    {error}
                </div>
            )}

            {loading && page === 1 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="h-80 rounded-xl bg-slate-800/30 animate-pulse" />
                    ))}
                </div>
            ) : items.length === 0 ? (
                <div className="text-center py-16 text-slate-500 bg-slate-900/30 rounded-xl border border-slate-800/50">
                    <p className="text-lg font-medium text-slate-400">暂无在售物品</p>
                </div>
            ) : (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {items.map((item) => (
                            <ItemCard
                                key={item.id}
                                item={item}
                                onAddToWatchlist={handleAddToWatchlist}
                                onClick={handleItemClick}
                                isListing={true}
                            />
                        ))}
                    </div>

                    {hasMore && (
                        <div className="flex justify-center pt-8">
                            <button
                                onClick={handleLoadMore}
                                disabled={loadingMore}
                                className="px-6 py-2.5 bg-slate-800/50 hover:bg-slate-700/50 text-slate-300 rounded-lg border border-slate-700/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {loadingMore ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                                        加载中...
                                    </>
                                ) : (
                                    '加载更多'
                                )}
                            </button>
                        </div>
                    )}
                </>
            )}

            <ItemDetailModal
                isOpen={showDetail}
                onClose={handleCloseDetail}
                item={selectedItem}
            />
        </div>
    );
}
