import type { Item } from "@shared/types";
import { memo } from "react";
import { Link } from "react-router-dom";
import StarGridSlots from "./StarGridSlots";
import CapturePreview from "./CapturePreview";

interface ItemCardProps {
  item: Item;
  onAddToWatchlist?: (item: Item) => void;
  onClick?: (item: Item) => void;
  showActions?: boolean;
  isListing?: boolean;
}

const Icons = {
  heart: (
    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
        clipRule="evenodd"
      />
    </svg>
  ),
  plus: (
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
        d="M12 4v16m8-8H4"
      />
    </svg>
  ),
  cube: (
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
      />
    </svg>
  ),
};

function ItemCard({
  item,
  onAddToWatchlist,
  onClick,
  showActions = true,
  isListing = false,
}: ItemCardProps) {
  // 格式化价格：分转元
  const formatPrice = (cents: number) => `¥${(cents / 100).toFixed(2)}`;

  const rarityConfig = {
    red: {
      label: "红",
      badgeClass: "bg-red-50 text-red-600 border-red-200",
      barColor: "bg-gradient-to-r from-red-500 to-red-400",
      glowClass: "hover:shadow-lg hover:shadow-red-500/10",
      borderHover: "hover:border-red-200",
    },
    gold: {
      label: "金",
      badgeClass: "bg-amber-50 text-amber-600 border-amber-200",
      barColor: "bg-gradient-to-r from-amber-500 to-amber-400",
      glowClass: "hover:shadow-lg hover:shadow-amber-500/10",
      borderHover: "hover:border-amber-200",
    },
  };

  const categoryLabels: Record<string, string> = {
    hero_skin: "英雄皮肤",
    weapon_skin: "兵器皮肤",
    item: "道具",
  };

  const rarity = rarityConfig[item.rarity];

  const handleClick = () => {
    if (onClick) {
      onClick(item);
    }
  };

  return (
    <div
      onClick={onClick ? handleClick : undefined}
      className={`group relative rounded-2xl bg-white border border-gray-100 ${rarity.borderHover} hover:shadow-xl transition-all duration-300 overflow-hidden ${rarity.glowClass} ${onClick ? "cursor-pointer" : ""}`}
    >
      {/* 顶部稀有度指示条 */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${rarity.barColor}`} />

      {/* 预览图区域 */}
      {isListing || onClick ? (
        <div className="block relative">
          <CapturePreview
            captureUrls={item.captureUrls}
            fallbackUrl={item.imageUrl}
            alt={item.name}
          />
        </div>
      ) : (
        <Link to={`/item/${item.id}`} className="block relative">
          <CapturePreview
            captureUrls={item.captureUrls}
            fallbackUrl={item.imageUrl}
            alt={item.name}
          />
        </Link>
      )}

      <div className="p-4">
        {/* 名称 + 稀有度 */}
        <div className="flex items-start justify-between gap-3 mb-2">
          {isListing || onClick ? (
            <h3
              className="font-semibold text-gray-900 line-clamp-1 flex-1 group-hover:text-blue-600 transition-colors"
              title={item.name}
            >
              {item.name}
            </h3>
          ) : (
            <Link
              to={`/item/${item.id}`}
              className="flex-1 min-w-0"
              title={item.name}
            >
              <h3 className="font-semibold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                {item.name}
              </h3>
            </Link>
          )}
          <span
            className={`flex-shrink-0 px-2.5 py-1 text-xs font-semibold rounded-lg border ${rarity.badgeClass}`}
          >
            {rarity.label}
          </span>
        </div>

        {/* 英雄/武器 + 类别标签 */}
        <div className="flex flex-wrap items-center gap-1.5 mb-3">
          <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-100 text-gray-600">
            {categoryLabels[item.category] || item.category}
          </span>
          {item.hero && (
            <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              {item.hero}
            </span>
          )}
          {item.weapon && (
            <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-purple-50 text-purple-600 border border-purple-100">
              {item.weapon}
            </span>
          )}
          {item.status === "draw" && (
            <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-violet-50 text-violet-600 border border-violet-100">
              抽签期
            </span>
          )}
        </div>

        {isListing && item.variationInfo && (
          <div className="mb-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
            <StarGridSlots variationInfo={item.variationInfo} dense={true} />
          </div>
        )}

        {/* 编号 - 仅子物品显示 */}
        {isListing && item.serialNum && (
          <div className="text-xs text-gray-400 mb-2">
            编号: {item.serialNum}
          </div>
        )}

        {/* 价格 + 在售数量 */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-baseline gap-0.5">
            <span className="text-xs text-gray-400">¥</span>
            <span className="text-xl font-bold text-blue-600">
              {formatPrice(item.currentPrice).replace("¥", "")}
            </span>
          </div>
          {isListing ? (
            <span
              className="flex items-center gap-1 text-xs text-gray-400"
              title="收藏人数"
            >
              {Icons.heart}
              {item.collectCount}
            </span>
          ) : (
            <span className="text-gray-400 text-xs text-right">
              {item.collectCount}
              {typeof item.collectCount === "number" ? "人在售" : "在售"}
            </span>
          )}
        </div>

        {/* 添加到监控按钮 */}
        {showActions && onAddToWatchlist && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAddToWatchlist(item);
            }}
            className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 text-sm font-medium rounded-xl border border-blue-200 hover:border-blue-300 transition-all duration-200"
          >
            {Icons.plus}
            <span>添加到监控</span>
          </button>
        )}
      </div>
    </div>
  );
}

function areEqual(prev: ItemCardProps, next: ItemCardProps): boolean {
  const prevItem = prev.item;
  const nextItem = next.item;

  const sameCaptureUrls =
    prevItem.captureUrls.length === nextItem.captureUrls.length &&
    prevItem.captureUrls.every((url, index) => url === nextItem.captureUrls[index]);

  const prevVariation = prevItem.variationInfo;
  const nextVariation = nextItem.variationInfo;
  const sameVariation =
    prevVariation?.variationId === nextVariation?.variationId &&
    prevVariation?.variationQuality === nextVariation?.variationQuality &&
    prevVariation?.variationUnlockNum === nextVariation?.variationUnlockNum;

  return (
    prevItem.id === nextItem.id &&
    prevItem.name === nextItem.name &&
    prevItem.imageUrl === nextItem.imageUrl &&
    prevItem.currentPrice === nextItem.currentPrice &&
    prevItem.collectCount === nextItem.collectCount &&
    prevItem.serialNum === nextItem.serialNum &&
    prevItem.rarity === nextItem.rarity &&
    prevItem.category === nextItem.category &&
    prevItem.hero === nextItem.hero &&
    prevItem.weapon === nextItem.weapon &&
    prevItem.status === nextItem.status &&
    sameCaptureUrls &&
    sameVariation &&
    prev.showActions === next.showActions &&
    prev.isListing === next.isListing &&
    prev.onClick === next.onClick &&
    prev.onAddToWatchlist === next.onAddToWatchlist
  );
}

export default memo(ItemCard, areEqual);
