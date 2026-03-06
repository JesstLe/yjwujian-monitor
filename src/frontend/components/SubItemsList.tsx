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
    const [slotIndex, setSlotIndex] = useState<string>('');
    const [variationUnlockLevel, setVariationUnlockLevel] = useState<string>('');
    const [targetValue, setTargetValue] = useState<string>('');
    const [minValue, setMinValue] = useState<string>('');
    const [maxValue, setMaxValue] = useState<string>('');

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
                variationUnlockLevel: variationUnlockLevel ? Number(variationUnlockLevel) : undefined,
                slotIndex: slotIndex ? Number(slotIndex) : undefined,
                targetValue: targetValue ? Number(targetValue) : undefined,
                minValue: minValue ? Number(minValue) : undefined,
                maxValue: maxValue ? Number(maxValue) : undefined,
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
    }, [
        equipType,
        searchType,
        sort,
        page,
        variationUnlockLevel,
        slotIndex,
        targetValue,
        minValue,
        maxValue,
    ]);

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
    }, [
        equipType,
        searchType,
        sort,
        variationUnlockLevel,
        slotIndex,
        targetValue,
        minValue,
        maxValue,
    ]);

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
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <span className="w-1 h-6 bg-cyan-500 rounded-full"></span>
                    在售列表
                    <span className="text-sm font-normal text-gray-500 ml-2">
                        共 {items.length}{hasMore ? '+' : ''} 件
                    </span>
                </h2>

                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <div className="relative">
                        <select
                            value={sort}
                            onChange={(e) => setSort(e.target.value)}
                            className="appearance-none pl-4 pr-10 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all cursor-pointer shadow-sm"
                        >
                            {SortOptions.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            value={variationUnlockLevel}
                            onChange={(e) => setVariationUnlockLevel(e.target.value)}
                            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 text-sm focus:outline-none focus:border-cyan-500/50 shadow-sm"
                        >
                            <option value="">星格</option>
                            <option value="2">星格部分解封</option>
                            <option value="1">星格全解封</option>
                        </select>

                        <select
                            value={slotIndex}
                            onChange={(e) => setSlotIndex(e.target.value)}
                            className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 text-sm focus:outline-none focus:border-cyan-500/50 shadow-sm"
                        >
                            <option value="">星格槽位</option>
                            <option value="1">槽1</option>
                            <option value="2">槽2</option>
                            <option value="3">槽3</option>
                            <option value="4">槽4</option>
                        </select>

                        <input
                            type="number"
                            value={targetValue}
                            onChange={(e) => setTargetValue(e.target.value)}
                            placeholder="定向值"
                            className="w-20 px-2.5 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 text-sm placeholder-gray-400 focus:outline-none focus:border-cyan-500/50 shadow-sm"
                        />

                        <input
                            type="number"
                            value={minValue}
                            onChange={(e) => setMinValue(e.target.value)}
                            placeholder="最小"
                            className="w-20 px-2.5 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 text-sm placeholder-gray-400 focus:outline-none focus:border-cyan-500/50 shadow-sm"
                        />

                        <input
                            type="number"
                            value={maxValue}
                            onChange={(e) => setMaxValue(e.target.value)}
                            placeholder="最大"
                            className="w-20 px-2.5 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 text-sm placeholder-gray-400 focus:outline-none focus:border-cyan-500/50 shadow-sm"
                        />

                        <button
                            onClick={() => {
                                setSlotIndex('');
                                setVariationUnlockLevel('');
                                setTargetValue('');
                                setMinValue('');
                                setMaxValue('');
                            }}
                            className="px-3 py-2 text-sm text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors shadow-sm bg-white"
                        >
                            清空
                        </button>
                    </div>
                </div>
            </div>

            {error && (
                <div className="p-4 rounded-lg bg-red-50 border border-red-100 text-red-600 text-sm shadow-sm">
                    {error}
                </div>
            )}

            {loading && page === 1 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="h-80 rounded-xl bg-gray-100 animate-pulse" />
                    ))}
                </div>
            ) : items.length === 0 ? (
                <div className="text-center py-16 text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-lg font-medium text-gray-400">当前筛选下暂无在售物品</p>
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
                                className="px-6 py-2.5 bg-white hover:bg-gray-50 text-gray-700 rounded-lg border border-gray-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-200"
                            >
                                {loadingMore ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
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
