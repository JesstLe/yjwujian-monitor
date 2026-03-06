import { useEffect, useState } from "react";
import { api } from "../services/api";
import type { Item } from "@shared/types";
import CapturePreview from "./CapturePreview";
import StarGridSlots from "./StarGridSlots";

interface ItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item | null;
}

export default function ItemDetailModal({
  isOpen,
  onClose,
  item: initialItem,
}: ItemDetailModalProps) {
  const [detailedItem, setDetailedItem] = useState<Item | null>(initialItem);

  useEffect(() => {
    if (isOpen) {
      setDetailedItem(initialItem);
      if (initialItem && initialItem.gameOrdersn && !initialItem.rawDesc) {
        fetchDetail(initialItem);
      }
    }
  }, [isOpen, initialItem]);

  const fetchDetail = async (item: Item) => {
    try {
      const detail = await api.items.getById(item.id, item.gameOrdersn!);
      setDetailedItem({
        ...detail,
        variationInfo: detail.variationInfo ?? item.variationInfo,
      });
    } catch (error) {
      console.error("Failed to fetch item detail:", error);
    }
  };

  if (!isOpen || !detailedItem) return null;
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
                  <span
                    className={`px-2 py-0.5 text-sm font-bold rounded border ${
                      detailedItem.rarity === "red"
                        ? "bg-red-500/10 text-red-400 border-red-500/30"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    }`}
                  >
                    {detailedItem.rarity === "red" ? "红" : "金"}品质
                  </span>
                </h3>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-200 transition-colors p-1 rounded hover:bg-slate-800"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
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
                    <div className="text-3xl font-bold text-cyan-400 tracking-tight">
                      {formatPrice(detailedItem.currentPrice)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-slate-400 mb-1">收藏</div>
                    <div className="text-xl font-semibold text-slate-200">
                      {detailedItem.collectCount}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right: Detailed Attributes */}
              <div className="space-y-6 flex flex-col h-full">
                {/* 星格 - 全宽大卡片 */}
                {detailedItem.variationInfo && (
                  <div className="p-5 rounded-xl bg-gradient-to-br from-amber-900/20 to-orange-900/10 border border-amber-700/30">
                    <div className="text-sm text-amber-400 mb-3 font-medium flex items-center gap-2">
                      <span className="text-lg">★</span>
                      星格 (Star Grid)
                    </div>
                    <StarGridSlots variationInfo={detailedItem.variationInfo} />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 hover:bg-slate-800/50 transition-colors flex flex-col justify-center">
                    <div className="text-sm text-slate-400 mb-1">编号</div>
                    <div
                      className="font-mono text-slate-200 text-lg truncate"
                      title={detailedItem.serialNum || ""}
                    >
                      {detailedItem.serialNum || "-"}
                    </div>
                  </div>
                </div>

                {/* 卖家信息 */}
                {detailedItem.sellerName && (
                  <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700/50">
                    <div className="text-sm text-slate-400 mb-1">卖家</div>
                    <div className="text-lg font-medium text-slate-200">
                      {detailedItem.sellerName}
                    </div>
                  </div>
                )}

                <div className="flex-1" />

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
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
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
