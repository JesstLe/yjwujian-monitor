import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import type { Item } from '@shared/types';
import SubItemsList from './SubItemsList';
import CapturePreview from './CapturePreview';

const CategoryToSearchType: Record<string, string> = {
    hero_skin: 'role_skin',
    weapon_skin: 'weapon_skin',
    item: 'item',
};

const RarityConfig = {
    red: {
        label: '红',
        color: 'text-red-400',
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
    },
    gold: {
        label: '金',
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
    },
};

export default function ItemDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [item, setItem] = useState<Item | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        loadItem();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id]);

    const loadItem = async () => {
        setLoading(true);
        try {
            const data = await api.items.getById(id!);
            setItem(data);
        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : '获取物品详情失败');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (error || !item) {
        return (
            <div className="text-center py-12">
                <p className="text-red-400 mb-4">{error || '物品未找到'}</p>
                <button
                    onClick={() => navigate(-1)}
                    className="px-4 py-2 rounded bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                >
                    返回上一页
                </button>
            </div>
        );
    }

    const rarity = RarityConfig[item.rarity];
    const searchType = CategoryToSearchType[item.category] || 'role_skin';
    const formatPrice = (cents: number) => `¥${(cents / 100).toFixed(2)}`;

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
            {/* Back Button */}
            <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 mb-6 transition-colors group"
            >
                <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                返回列表
            </button>

            {/* Hero Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                {/* Left: Preview */}
                <div className="md:col-span-1">
                    <div className={`rounded-xl overflow-hidden border ${rarity.border} bg-slate-900/50 relative group shadow-lg`}>
                        <CapturePreview
                            captureUrls={item.captureUrls}
                            fallbackUrl={item.imageUrl}
                            alt={item.name}
                            className="aspect-square"
                        />
                        <div className="absolute top-3 right-3">
                            <span className={`px-2.5 py-1 text-xs font-bold rounded border ${rarity.bg} ${rarity.color} ${rarity.border} backdrop-blur-sm shadow-sm`}>
                                {rarity.label}品质
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right: Info */}
                <div className="md:col-span-2 space-y-6">
                    <div>
                        <h1 className="text-4xl font-bold text-slate-100 mb-3 tracking-tight">{item.name}</h1>
                        <div className="flex flex-wrap gap-2">
                            {item.hero && (
                                <span className="px-3 py-1 rounded-md bg-slate-800/80 text-slate-300 text-sm font-medium border border-slate-700/50">
                                    {item.hero}
                                </span>
                            )}
                            {item.weapon && (
                                <span className="px-3 py-1 rounded-md bg-slate-800/80 text-slate-300 text-sm font-medium border border-slate-700/50">
                                    {item.weapon}
                                </span>
                            )}
                            <span className="px-3 py-1 rounded-md bg-slate-800/80 text-slate-300 text-sm font-medium border border-slate-700/50">
                                {item.category === 'hero_skin' ? '英雄皮肤' : item.category === 'weapon_skin' ? '兵器皮肤' : '道具'}
                            </span>
                        </div>
                    </div>

                    <div className="p-6 rounded-xl bg-gradient-to-br from-slate-900/60 to-slate-900/40 border border-slate-800/50 shadow-inner backdrop-blur-sm">
                        <div className="text-sm text-slate-500 mb-1">全服最低价格</div>
                        <div className="flex items-end gap-3">
                            <div className="text-4xl font-bold text-cyan-400 tracking-tight">{formatPrice(item.currentPrice)}</div>
                            {/* Could add price trend indicator here */}
                        </div>

                        <div className="mt-6 flex items-center gap-6 pt-6 border-t border-slate-800/50">
                            <div className="flex flex-col">
                                <span className="text-xs text-slate-500 mb-1">当前在售</span>
                                <span className="text-lg font-semibold text-slate-200">{item.collectCount}</span>
                            </div>
                            {/* Could add more stats here */}
                        </div>
                    </div>

                    <div className="text-slate-400 text-sm leading-relaxed max-w-2xl">
                        {/* Description placeholder or future content */}
                        <p>该物品的所有在售信息将显示在下方列表中。您可以查看每件物品的独立编号、星格属性以及独特的 3D 预览。</p>
                    </div>
                </div>
            </div>

            {/* Sub Items List */}
            <div className="border-t border-slate-800/50 pt-8">
                <SubItemsList
                    equipType={item.id}
                    searchType={searchType}
                />
            </div>
        </div>
    );
}
