import { useState, useCallback, useRef, useEffect } from 'react';
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
  cube: (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  ),
};

// 3D旋转预览组件：鼠标悬停时自动播放32帧旋转动画
function CapturePreview({ captureUrls, fallbackUrl, alt }: {
  captureUrls: string[];
  fallbackUrl: string | null;
  alt: string;
}) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasCapture = captureUrls.length > 0;

  // 预加载所有帧
  useEffect(() => {
    if (hasCapture) {
      captureUrls.forEach((url) => {
        const img = new Image();
        img.src = url;
      });
    }
  }, [captureUrls, hasCapture]);

  // 鼠标悬停时自动播放旋转动画
  const handleMouseEnter = useCallback(() => {
    if (!hasCapture) return;
    setIsHovering(true);
    intervalRef.current = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % captureUrls.length);
    }, 80); // 约12.5fps，流畅旋转
  }, [captureUrls.length, hasCapture]);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setCurrentFrame(0);
  }, []);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const displayUrl = hasCapture
    ? captureUrls[currentFrame]
    : fallbackUrl;

  if (!displayUrl) {
    // 无图片时显示占位符
    return (
      <div className="w-full aspect-square bg-slate-800/50 flex items-center justify-center">
        <span className="text-4xl opacity-20">🎮</span>
      </div>
    );
  }

  return (
    <div
      className="relative w-full aspect-square overflow-hidden bg-slate-900/50"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <img
        src={displayUrl}
        alt={alt}
        className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setImageLoaded(true)}
        loading="lazy"
      />
      {!imageLoaded && (
        <div className="absolute inset-0 loading-skeleton" />
      )}
      {/* 3D旋转指示器 */}
      {hasCapture && isHovering && (
        <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md bg-black/60 text-xs text-cyan-400 backdrop-blur-sm">
          {Icons.cube}
          <span>3D</span>
        </div>
      )}
    </div>
  );
}

export default function ItemCard({ item, onAddToWatchlist, showActions = true }: ItemCardProps) {
  // 格式化价格：分转元
  const formatPrice = (cents: number) => `¥${(cents / 100).toFixed(2)}`;

  const rarityConfig = {
    red: {
      label: '红',
      badgeClass: 'bg-red-500/10 text-red-400 border-red-500/30',
      barColor: 'bg-gradient-to-r from-red-500 to-red-400',
      glowClass: 'group-hover:shadow-[0_0_20px_rgba(239,68,68,0.15)]',
      borderHover: 'hover:border-red-500/30',
    },
    gold: {
      label: '金',
      badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      barColor: 'bg-gradient-to-r from-amber-500 to-amber-400',
      glowClass: 'group-hover:shadow-[0_0_20px_rgba(245,158,11,0.15)]',
      borderHover: 'hover:border-amber-500/30',
    },
  };

  const categoryLabels: Record<string, string> = {
    hero_skin: '英雄皮肤',
    weapon_skin: '兵器皮肤',
    item: '道具',
  };

  const rarity = rarityConfig[item.rarity];

  return (
    <div className={`group relative rounded-xl bg-slate-900/40 border border-slate-800/50 ${rarity.borderHover} hover:bg-slate-800/40 transition-all duration-300 overflow-hidden ${rarity.glowClass}`}>
      {/* 顶部稀有度指示条 */}
      <div className={`absolute top-0 left-0 right-0 h-0.5 ${rarity.barColor} opacity-60`} />

      {/* 预览图区域 */}
      <CapturePreview
        captureUrls={item.captureUrls}
        fallbackUrl={item.imageUrl}
        alt={item.name}
      />

      <div className="p-4">
        {/* 名称 + 稀有度 */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-medium text-slate-200 line-clamp-1 flex-1" title={item.name}>
            {item.name}
          </h3>
          <span className={`flex-shrink-0 px-2 py-0.5 text-xs font-semibold rounded border ${rarity.badgeClass}`}>
            {rarity.label}
          </span>
        </div>

        {/* 英雄/武器 + 类别标签 */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <span className="px-2 py-0.5 text-xs font-medium rounded bg-slate-800/70 text-slate-400 border border-slate-700/50">
            {categoryLabels[item.category] || item.category}
          </span>
          {item.hero && (
            <span className="px-2 py-0.5 text-xs font-medium rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              {item.hero}
            </span>
          )}
          {item.weapon && (
            <span className="px-2 py-0.5 text-xs font-medium rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
              {item.weapon}
            </span>
          )}
          {item.status === 'draw' && (
            <span className="px-2 py-0.5 text-xs font-medium rounded bg-purple-500/10 text-purple-400 border border-purple-500/30">
              抽签期
            </span>
          )}
        </div>

        {/* 价格 + 在售数量 */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800/50">
          <p className="text-xl font-bold text-cyan-400">
            {formatPrice(item.currentPrice)}
          </p>
          {typeof item.collectCount === 'number' && item.collectCount > 0 ? (
            <span className="flex items-center gap-1 text-xs text-slate-500">
              {Icons.heart}
              {item.collectCount}
            </span>
          ) : typeof item.collectCount === 'string' && (
            <span className="flex items-center gap-1 text-xs text-slate-500">
              在售 {item.collectCount}
            </span>
          )}
        </div>

        {/* 添加到监控按钮 */}
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
