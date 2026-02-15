import { useEffect, useState } from 'react';
import { api } from '../services/api';
import type { Item } from '@shared/types';
import CapturePreview from './CapturePreview';

interface ItemDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: Item | null;
}

export default function ItemDetailModal({ isOpen, onClose, item: initialItem }: ItemDetailModalProps) {
    const [detailedItem, setDetailedItem] = useState<Item | null>(initialItem);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setDetailedItem(initialItem);
            if (initialItem && initialItem.gameOrdersn && !initialItem.rawDesc) {
                fetchDetail(initialItem);
            }
        }
    }, [isOpen, initialItem]);

    const fetchDetail = async (item: Item) => {
        setLoading(true);
        try {
            const detail = await api.items.getById(item.id, item.gameOrdersn!);
            setDetailedItem(detail);
        } catch (error) {
            console.error('Failed to fetch item detail:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !detailedItem) return null;

    const { rawDesc, starGrid } = detailedItem;
    const formatPrice = (cents: number) => `¥${(cents / 100).toFixed(2)}`;

    return (
        <div className="relative z-50">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="fixed inset-0 overflow-y-auto pointer-events-none">
                <div className="flex min-h-full items-center justify-center p-4 text-center pointer-events-auto">
                    <div className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-slate-900 border border-slate-700 p-6 text-left align-middle shadow-xl transition-all relative animate-fade-in-up">

                        {/* Header */}
                        <div className="flex justify-between items-start mb-6 border-b border-slate-800 pb-4">
                            <div>
                                <h3 className="text-2xl font-bold leading-6 text-slate-100 flex items-center gap-3">
                                    {detailedItem.name}
                                    <span className={`px-2 py-0.5 text-sm font-bold rounded border ${detailedItem.rarity === 'red'
                                            ? 'bg-red-500/10 text-red-400 border-red-500/30'
                                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                        }`}>
                                        {detailedItem.rarity === 'red' ? '红' : '金'}品质
                                    </span>
                                </h3>
                            </div>
                            <button
                                onClick={onClose}
                                className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded hover:bg-slate-800"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Left: Image & Basic Info */}
                            <div className="space-y-6">
                                <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-800/50 aspect-square relative group">
                                    <CapturePreview
                                        captureUrls={detailedItem.captureUrls}
                                        fallbackUrl={detailedItem.imageUrl}
                                        alt={detailedItem.name}
                                        className="w-full h-full object-contain"
                                    />
                                </div>

                                <div className="flex justify-between items-end p-4 rounded-lg bg-slate-800/50 border border-slate-700 shadow-inner">
                                    <div>
                                        <div className="text-sm text-slate-400 mb-1">价格</div>
                                        <div className="text-3xl font-bold text-cyan-400 tracking-tight">{formatPrice(detailedItem.currentPrice)}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm text-slate-400 mb-1">收藏</div>
                                        <div className="text-xl font-semibold text-slate-200">{detailedItem.collectCount}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Detailed Attributes */}
                            <div className="space-y-6 flex flex-col h-full">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 hover:bg-slate-800/50 transition-colors">
                                        <div className="text-sm text-slate-400 mb-2">星格 (Star Grid)</div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex flex-col items-center">
                                                <span className="text-xs text-slate-500">颜色</span>
                                                <span className="text-yellow-400 font-mono text-xl font-bold">{starGrid?.color || '-'}</span>
                                            </div>
                                            <div className="h-8 w-px bg-slate-700"></div>
                                            <div className="flex flex-col items-center">
                                                <span className="text-xs text-slate-500">类型</span>
                                                <span className="text-blue-400 font-mono text-xl font-bold">{starGrid?.style || '-'}</span>
                                            </div>
                                            {starGrid?.special && (
                                                <>
                                                    <div className="h-8 w-px bg-slate-700"></div>
                                                    <div className="flex flex-col items-center">
                                                        <span className="text-xs text-slate-500">特殊</span>
                                                        <span className="text-purple-400 font-mono text-xl font-bold">{starGrid.special}</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 hover:bg-slate-800/50 transition-colors flex flex-col justify-center">
                                        <div className="text-sm text-slate-400 mb-1">编号</div>
                                        <div className="font-mono text-slate-200 text-lg truncate" title={detailedItem.serialNum || ''}>
                                            {detailedItem.serialNum || '-'}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1">
                                    {loading ? (
                                        <div className="h-full flex flex-col items-center justify-center py-12 space-y-3">
                                            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                                            <span className="text-slate-500 text-sm">加载详细属性中...</span>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <h4 className="text-lg font-semibold text-slate-200 flex items-center gap-2 border-l-4 border-purple-500 pl-3">
                                                详细属性
                                            </h4>

                                            {rawDesc ? (
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="p-4 rounded bg-slate-800/30 border border-slate-700/30">
                                                        <div className="text-xs text-slate-500 mb-1">收藏分 (Score)</div>
                                                        <div className="text-2xl font-bold text-purple-400">
                                                            {rawDesc.collection_score || '-'}
                                                        </div>
                                                    </div>
                                                    <div className="p-4 rounded bg-slate-800/30 border border-slate-700/30">
                                                        <div className="text-xs text-slate-500 mb-1">洗练次数 (Washed)</div>
                                                        <div className="text-2xl font-bold text-emerald-400">
                                                            {rawDesc.washed_count !== undefined ? rawDesc.washed_count : '-'}
                                                        </div>
                                                    </div>
                                                    {rawDesc.counter_value !== undefined && (
                                                        <div className="p-4 rounded bg-red-900/10 border border-red-900/30 col-span-2">
                                                            <div className="text-xs text-red-300 mb-1 flex items-center gap-2">
                                                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                                                                </svg>
                                                                击杀/计数数据 (Counter)
                                                            </div>
                                                            <div className="text-3xl font-bold text-red-500 flex items-baseline gap-2">
                                                                {rawDesc.counter_value}
                                                                <span className="text-sm font-normal text-red-400/70">Kills/Counts</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ) : (
                                                <div className="text-slate-500 text-sm italic p-4 bg-slate-800/20 rounded border border-slate-800">
                                                    {detailedItem.gameOrdersn ? '正在获取属性...' : '无详细属性信息'}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="pt-6 border-t border-slate-700/50 flex justify-end gap-3 mt-auto">
                                    <button
                                        onClick={onClose}
                                        className="px-5 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors font-medium"
                                    >
                                        关闭
                                    </button>
                                    <a
                                        href={`https://y.163.com/g/2/equip_detail/${detailedItem.id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2"
                                    >
                                        <span>前往藏宝阁购买</span>
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                        </svg>
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
