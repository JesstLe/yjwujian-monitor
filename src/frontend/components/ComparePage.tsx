import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import type { Item, CompareItem } from "@shared/types";
import CapturePreview from "./CapturePreview";
import { saveAs } from "file-saver";
import JSZip from "jszip";

// Icons
const SearchIcon = () => (
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
      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />
  </svg>
);

const PlusIcon = () => (
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
);

const TrashIcon = () => (
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
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

const CloseIcon = () => (
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
      d="M6 18L18 6M6 6l12 12"
    />
  </svg>
);

// 将外部图片URL转换为代理URL
const getProxyImageUrl = (
  url: string | null | undefined,
): string | undefined => {
  if (!url) return undefined;
  // 检查是否是需要代理的域名
  const proxyDomains = [
    "cbg-capture.res.netease.com",
    "cbg-yaots.res.netease.com",
    "img.cbgtf.163.com",
    "game.gtimg.cn",
  ];
  try {
    const urlObj = new URL(url);
    if (proxyDomains.some((domain) => urlObj.hostname.includes(domain))) {
      return `/api/compare/proxy-image?url=${encodeURIComponent(url)}`;
    }
  } catch {
    // URL解析失败，返回原URL
  }
  return url;
};

const CompareCard = ({
  item,
  onRemove,
  onClick,
}: {
  item: CompareItem;
  onRemove: (id: string) => void;
  onClick: (item: CompareItem) => void;
}) => {
  const formatPrice = (price: number) => (price / 100).toFixed(2);
  const proxyImageUrl = getProxyImageUrl(item.imageUrl);

  return (
    <div
      className="group relative bg-white rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border border-gray-100 shadow-sm"
      onClick={() => onClick(item)}
    >
      {/* 预览图 */}
      <div className="relative aspect-square bg-gradient-to-br from-slate-50 via-gray-50 to-slate-100">
        {proxyImageUrl ? (
          <img
            src={proxyImageUrl}
            alt={item.name}
            className="w-full h-full object-cover"
            crossOrigin="anonymous"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
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
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
        {/* 稀有度标签 */}
        <div
          className={`absolute top-3 left-3 px-2.5 py-1 rounded-lg text-xs font-semibold shadow-md backdrop-blur-sm ${item.rarity === "red"
            ? "bg-gradient-to-r from-red-500 to-red-600 text-white"
            : "bg-gradient-to-r from-amber-500 to-amber-600 text-white"
            }`}
        >
          {item.rarity === "red" ? "红皮" : "金皮"}
        </div>
        {/* 删除按钮 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`确定要从对比列表中移除 "${item.name}" 吗？`)) {
              onRemove(item.id);
            }
          }}
          className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur-sm rounded-xl transition-all duration-300 hover:bg-red-50 hover:scale-110 text-gray-400 hover:text-red-500 shadow-md"
        >
          <TrashIcon />
        </button>
      </div>

      {/* 信息 */}
      <div className="p-4">
        <h4 className="text-sm font-semibold text-gray-900 truncate mb-1.5 group-hover:text-blue-600 transition-colors">
          {item.name}
        </h4>
        <p className="text-xs text-gray-400 mb-2.5 truncate">
          {item.serialNum || "无编号"}
        </p>
        <div className="flex items-baseline gap-1">
          <span className="text-xs text-gray-400">¥</span>
          <span className="text-xl font-bold text-blue-600">
            {formatPrice(item.currentPrice)}
          </span>
        </div>
      </div>
    </div>
  );
};

// 属性对比表格组件
const CompareTable = ({ items }: { items: CompareItem[] }) => {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-24 h-24 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-3xl flex items-center justify-center mb-5 shadow-sm">
          <svg
            className="w-12 h-12 text-blue-300"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>
        <p className="text-base font-semibold text-gray-600 mb-1">
          添加物品后显示对比
        </p>
        <p className="text-sm text-gray-400">在上方搜索并添加物品</p>
      </div>
    );
  }

  const formatPrice = (price: number) => (price / 100).toFixed(2);

  const rows = [
    { label: "名称", key: "name" as const },
    { label: "编号", key: "serialNum" as const },
    { label: "价格", key: "currentPrice" as const, format: formatPrice },
    { label: "分类", key: "category" as const },
    { label: "稀有度", key: "rarity" as const },
    { label: "英雄", key: "hero" as const },
    { label: "武器", key: "weapon" as const },
    { label: "星格", key: "starGrid" as const },
    { label: "变体", key: "variationInfo" as const },
  ];

  const getValue = (item: CompareItem, key: string) => {
    switch (key) {
      case "name":
        return item.name;
      case "serialNum":
        return item.serialNum || "-";
      case "currentPrice":
        return `¥${formatPrice(item.currentPrice)}`;
      case "category":
        return item.category === "hero_skin"
          ? "英雄皮肤"
          : item.category === "weapon_skin"
            ? "武器皮肤"
            : "道具";
      case "rarity":
        return item.rarity === "red" ? "红" : "金";
      case "hero":
        return item.hero || "-";
      case "weapon":
        return item.weapon || "-";
      case "starGrid":
        return (
          item.starGrid?.slots
            ?.map((s) => (s !== null ? String(s) : "-"))
            .join(" / ") ?? "-"
        );
      case "variationInfo":
        return item.variationInfo?.variationName || "-";
      default:
        return "-";
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <th className="text-left p-4 text-gray-600 font-semibold w-36 border-b border-gray-200">
                属性
              </th>
              {items.map((item, idx) => (
                <th
                  key={idx}
                  className="text-left p-4 text-gray-900 font-semibold min-w-44 border-b border-gray-200"
                >
                  {item.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr
                key={row.key}
                className={`transition-colors ${rowIdx % 2 === 0 ? "bg-white" : "bg-slate-50/70"
                  } hover:bg-blue-50/60`}
              >
                <td className="p-4 text-gray-500 font-medium border-r border-gray-100">
                  {row.label}
                </td>
                {items.map((item, idx) => (
                  <td key={idx} className="p-4 text-gray-800">
                    {getValue(item, row.key)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default function ComparePage() {
  const navigate = useNavigate();
  const [types, setTypes] = useState<Item[]>([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [typesError, setTypesError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<Item | null>(null);
  const [serialNum, setSerialNum] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState<Item | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [compareList, setCompareList] = useState<CompareItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<CompareItem | null>(null);
  const compareCardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  // 导出全部选中物品的 3D 帧图片为 ZIP
  const exportCompareCard = useCallback(async () => {
    // 选出所有包含 captureUrls 的物品
    const itemsWithCapture = compareList.filter(
      (item) => item.captureUrls && item.captureUrls.length > 0,
    );

    if (itemsWithCapture.length === 0) {
      alert("对比列表中没有包含 3D 模型的物品");
      return;
    }

    setExporting(true);
    try {
      const zip = new JSZip();

      for (const item of itemsWithCapture) {
        // 如果有多个物品，建立子文件夹
        const folderName =
          itemsWithCapture.length > 1
            ? `${item.name.replace(/[^\w\u4e00-\u9fa5]/g, "_")}_${item.serialNum}`
            : "";
        const folder = folderName ? zip.folder(folderName) : zip;

        if (!folder) continue;

        // 下载 32 帧
        const downloadPromises = item.captureUrls!.map(async (url, index) => {
          try {
            const proxyUrl = getProxyImageUrl(url) || url;
            const res = await fetch(proxyUrl);
            const blob = await res.blob();
            folder.file(`${index}.png`, blob);
          } catch (err) {
            console.error(
              `Failed to download frame ${index} for ${item.name}`,
              err,
            );
          }
        });

        await Promise.all(downloadPromises);
      }

      // 生成 ZIP
      const content = await zip.generateAsync({ type: "blob" });
      const fileName =
        itemsWithCapture.length === 1
          ? `${itemsWithCapture[0].name.replace(/[^\w\u4e00-\u9fa5]/g, "_")}_3dframes.zip`
          : `compare_3dframes_selected.zip`;
      saveAs(content, fileName);
    } catch (error) {
      console.error("导出 ZIP 失败:", error);
      alert("导出图片打包失败，请重试");
    } finally {
      setExporting(false);
    }
  }, [compareList]);

  // 加载物品类型列表
  useEffect(() => {
    setTypesLoading(true);
    setTypesError(null);
    api.compare
      .getTypes()
      .then(setTypes)
      .catch((err) => {
        console.error(err);
        setTypesError("加载物品类型失败，请刷新重试");
      })
      .finally(() => setTypesLoading(false));
  }, []);

  // 加载对比列表
  useEffect(() => {
    api.compare.getAll().then(setCompareList).catch(console.error);
  }, []);

  // 搜索子物品
  const handleSearch = useCallback(async () => {
    if (!selectedType || !serialNum.trim()) {
      setSearchError("请选择物品类型并输入编号");
      return;
    }

    setSearching(true);
    setSearchError(null);
    setSearchResult(null);

    try {
      const result = await api.compare.searchBySerialNum(
        selectedType.id,
        serialNum.trim(),
        10,
      );
      setSearchResult(result);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "搜索失败");
    } finally {
      setSearching(false);
    }
  }, [selectedType, serialNum]);

  // 添加到对比列表
  const handleAddToCompare = useCallback(
    async (item: Item) => {
      try {
        const compareItem: Omit<CompareItem, "id"> = {
          itemId: item.id,
          parentTypeId: selectedType?.id || "",
          name: item.name,
          imageUrl: item.imageUrl,
          captureUrls: item.captureUrls || [],
          serialNum: item.serialNum || "",
          currentPrice: item.currentPrice,
          category: item.category,
          rarity: item.rarity,
          hero: item.hero,
          weapon: item.weapon,
          starGrid: item.starGrid,
          variationInfo: item.variationInfo,
        };
        const added = await api.compare.add(compareItem);
        setCompareList((prev) => [...prev, added]);
        setSearchResult(null);
        setSerialNum("");
      } catch (error) {
        console.error("添加失败:", error);
      }
    },
    [selectedType],
  );

  // 从对比列表移除
  const handleRemove = useCallback(
    async (id: string) => {
      try {
        await api.compare.remove(id);
        setCompareList((prev) => prev.filter((item) => item.id !== id));
        if (selectedItem?.id === id) {
          setSelectedItem(null);
        }
      } catch (error) {
        console.error("移除失败:", error);
      }
    },
    [selectedItem],
  );

  return (
    <div className="space-y-8">
      {/* 页面标题 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">物品对比</h1>
        <p className="text-gray-500">搜索并添加物品，对比属性和价格差异</p>
      </div>

      {/* 搜索区域 */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-5">搜索物品</h2>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* 物品类型选择 */}
          <div className="md:col-span-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              物品类型
            </label>
            <select
              value={selectedType?.id || ""}
              onChange={(e) => {
                const type = types.find((t) => t.id === e.target.value);
                setSelectedType(type || null);
                setSearchResult(null);
              }}
              disabled={typesLoading || !!typesError}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">
                {typesLoading
                  ? "加载中..."
                  : typesError
                    ? "加载失败"
                    : "请选择物品类型..."}
              </option>
              {types.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
            {typesError && (
              <p className="text-xs text-red-500 mt-2">{typesError}</p>
            )}
          </div>

          {/* 编号输入 */}
          <div className="md:col-span-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              物品编号
            </label>
            <input
              type="text"
              value={serialNum}
              onChange={(e) => setSerialNum(e.target.value)}
              placeholder="如 Y001573"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-900 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:bg-white transition-all"
            />
          </div>

          {/* 搜索按钮 */}
          <div className="md:col-span-4 flex items-end">
            <button
              onClick={handleSearch}
              disabled={!selectedType || !serialNum.trim() || searching}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-sm hover:shadow-md disabled:shadow-none disabled:cursor-not-allowed"
            >
              <SearchIcon />
              {searching ? "搜索中..." : "搜索"}
            </button>
          </div>
        </div>

        {/* 搜索错误 */}
        {searchError && (
          <div className="mt-5 p-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-sm flex items-center gap-2">
            <svg
              className="w-5 h-5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            {searchError}
          </div>
        )}

        {/* 搜索结果 */}
        {searchResult && (
          <div className="mt-6 p-5 bg-gradient-to-r from-emerald-50 to-green-50 rounded-2xl border border-emerald-200 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                {searchResult.imageUrl && (
                  <img
                    src={getProxyImageUrl(searchResult.imageUrl)}
                    alt={searchResult.name}
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-white shadow-md"
                    crossOrigin="anonymous"
                  />
                )}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {searchResult.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {searchResult.serialNum}
                  </p>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-sm text-emerald-600">¥</span>
                    <span className="text-2xl font-bold text-emerald-600">
                      {(searchResult.currentPrice / 100).toFixed(2)}
                    </span>
                  </div>
                </div>

                {compareList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <div className="w-24 h-24 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-3xl flex items-center justify-center mb-5 shadow-sm">
                      <svg
                        className="w-12 h-12 text-blue-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                        />
                      </svg>
                    </div>
                    <p className="text-base font-semibold text-gray-600 mb-1">
                      暂无对比物品
                    </p>
                    <p className="text-sm text-gray-400">
                      搜索并添加物品开始对比
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {compareList.map((item) => (
                      <CompareCard
                        key={item.id}
                        item={item}
                        onRemove={handleRemove}
                        onClick={setSelectedItem}
                      />
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => handleAddToCompare(searchResult)}
                className="flex-shrink-0 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-xl font-medium transition-all duration-200 flex items-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0"
              >
                <PlusIcon />
                添加对比
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 对比列表 */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">对比列表</h2>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600 rounded-full text-sm font-medium border border-blue-100">
              {compareList.length} 个物品
            </span>
            {compareList.length >= 2 && (
              <button
                onClick={() => navigate("/compare/3d")}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white text-sm font-medium rounded-xl transition-all shadow-md hover:shadow-lg"
              >
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
                    d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                  />
                </svg>
                <span>3D对比</span>
              </button>
            )}
            {compareList.length >= 1 && (
              <button
                onClick={exportCompareCard}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-gray-400 disabled:to-gray-500 text-white text-sm font-medium rounded-xl transition-all shadow-md hover:shadow-lg disabled:shadow-none disabled:cursor-not-allowed"
              >
                {!exporting && (
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
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                )}
                {exporting ? (
                  <svg
                    className="animate-spin -ml-1 mr-1 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : null}
                <span>{exporting ? "打包下载中..." : "导出图片"}</span>
              </button>
            )}
          </div>
        </div>

        {compareList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-3xl flex items-center justify-center mb-5 shadow-sm">
              <svg
                className="w-12 h-12 text-blue-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
            </div>
            <p className="text-base font-semibold text-gray-600 mb-1">
              暂无对比物品
            </p>
            <p className="text-sm text-gray-400">搜索并添加物品开始对比</p>
          </div>
        ) : (
          <div
            ref={compareCardRef}
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
          >
            {compareList.map((item) => (
              <CompareCard
                key={item.id}
                item={item}
                onRemove={handleRemove}
                onClick={setSelectedItem}
              />
            ))}
          </div>
        )}
      </div>

      {/* 属性对比表格 */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h2 className="text-base font-semibold text-gray-900 mb-5">属性对比</h2>
        <CompareTable items={compareList} />
      </div>

      {/* 3D 预览模态框 */}
      {selectedItem && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedItem(null)}
        >
          <div
            className="bg-white rounded-3xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-gray-100 animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedItem.name}
                </h3>
                <p className="text-sm text-gray-400 mt-1">
                  {selectedItem.serialNum}
                </p>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200 hover:scale-110"
              >
                <CloseIcon />
              </button>
            </div>

            {/* 3D预览组件 */}
            <CapturePreview
              captureUrls={selectedItem.captureUrls || []}
              fallbackUrl={selectedItem.imageUrl}
              alt={selectedItem.name}
            />
          </div>
        </div>
      )}
    </div>
  );
}
