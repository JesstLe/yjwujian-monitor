import type { Item } from '@shared/types';

interface ItemCardProps {
  item: Item;
  onAddToWatchlist?: (item: Item) => void;
  showActions?: boolean;
}

const Icons = {
  heart: (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
    </svg>
  ),
  plus: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
};

export default function ItemCard({ item, onAddToWatchlist, showActions = true }: ItemCardProps) {
  const formatPrice = (cents: number) => `¥${(cents / 100).toFixed(2)}`;

  const rarityConfig = {
    red: {
      label: '红',
      className: 'bg-red-500/10 text-red-400 border-red-500/30',
      barColor: 'bg-red-500',
    },
    gold: {
      label: '金',
      className: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      barColor: 'bg-amber-500',
    },
  };

  const categoryLabels: Record<string, string> = {
    hero_skin: '英雄皮肤',
    weapon_skin: '兵器皮肤',
    item: '道具',
  };

  const rarity = rarityConfig[item.rarity];

  return (
    <div className="group relative rounded-xl bg-slate-900/40 border border-slate-800/50 hover:border-slate-700/50 hover:bg-slate-800/40 transition-all duration-200 overflow-hidden">
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${rarity.barColor} opacity-60`} />

      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-medium text-slate-200 line-clamp-1 flex-1" title={item.name}>
            {item.name}
          </h3>
          <span className={`flex-shrink-0 px-2 py-0.5 text-xs font-semibold rounded border ${rarity.className}`}>
            {rarity.label}
          </span>
        </div>

        {item.serialNum && (
          <p className="text-xs text-slate-500 mb-3 font-mono">#{item.serialNum}</p>
        )}

        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="px-2 py-1 text-xs font-medium rounded bg-slate-800/70 text-slate-400 border border-slate-700/50">
            {categoryLabels[item.category] || item.category}
          </span>
          {item.status === 'draw' && (
            <span className="px-2 py-1 text-xs font-medium rounded bg-purple-500/10 text-purple-400 border border-purple-500/30">
              抽签期
            </span>
          )}
        </div>

        {item.starGrid && (
          <div className="flex flex-wrap gap-2 mb-3 text-xs">
            <span className="px-2 py-1 rounded bg-slate-800/50 text-slate-500">
              颜色 {item.starGrid.color}
            </span>
            <span className="px-2 py-1 rounded bg-slate-800/50 text-slate-500">
              式样 {item.starGrid.style}
            </span>
            {item.starGrid.special !== undefined && (
              <span className="px-2 py-1 rounded bg-slate-800/50 text-slate-500">
                特殊 {item.starGrid.special}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-slate-800/50">
          <p className="text-xl font-bold text-cyan-400">
            {formatPrice(item.currentPrice)}
          </p>
          {item.collectCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-slate-500">
              {Icons.heart}
              {item.collectCount}
            </span>
          )}
        </div>

        {showActions && onAddToWatchlist && (
          <button
            onClick={() => onAddToWatchlist(item)}
            className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 hover:text-cyan-300 text-sm font-medium rounded-lg border border-cyan-500/30 hover:border-cyan-500/50 transition-all duration-200 group/btn"
          >
            {Icons.plus}
            <span>添加到监控</span>
          </button>
        )}
      </div>
    </div>
  );
}
