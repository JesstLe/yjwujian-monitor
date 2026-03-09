import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import type { CompareItem } from "@shared/types";
import ControlledModelView, { ControlledModelViewRef } from "./ControlledModelView";
import JSZip from "jszip";

const MIN_COMPARE_SCALE = 1;
const MAX_COMPARE_SCALE = 8;

// 将外部图片URL转换为代理URL（与 ControlledModelView 保持一致）
function getProxyImageUrl(url: string): string {
  const proxyDomains = [
    "cbg-capture.res.netease.com",
    "cbg-yaots.res.netease.com",
    "img.cbgtf.163.com",
    "game.gtimg.cn",
  ];
  try {
    const urlObj = new URL(url);
    if (proxyDomains.some((domain) => urlObj.hostname.includes(domain))) {
      return `/ api / compare / proxy - image ? url = ${encodeURIComponent(url)} `;
    }
  } catch {
    // 忽略
  }
  return url;
}

const Icons = {
  back: (
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
        d="M10 19l-7-7m0 0l7-7m-7 7h18"
      />
    </svg>
  ),
  reset: (
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
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  ),
  play: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8 5v14l11-7z" />
    </svg>
  ),
  pause: (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
    </svg>
  ),
  left: (
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
        d="M15 19l-7-7 7-7"
      />
    </svg>
  ),
  right: (
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
        d="M9 5l7 7-7 7"
      />
    </svg>
  ),
  up: (
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
        d="M5 15l7-7 7 7"
      />
    </svg>
  ),
  down: (
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
        d="M19 9l-7 7-7-7"
      />
    </svg>
  ),
  cube: (
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
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
      />
    </svg>
  ),
  empty: (
    <svg
      className="w-16 h-16"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
      />
    </svg>
  ),
  camera: (
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
        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  ),
  close: (
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
  ),
  download: (
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
        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  ),
  downloadSmall: (
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
        d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  ),
  zoomIn: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
    </svg>
  ),
  zoomOut: (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
    </svg>
  ),
};

/**
 * 全屏图片预览弹窗
 * 显示原始高清大图，支持下载保存
 */
function ImagePreviewModal({
  imageUrl,
  itemName,
  angle,
  onClose,
}: {
  imageUrl: string;
  itemName: string;
  angle: number;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  // 通过代理下载原始图并保存
  const handleSave = async () => {
    setSaving(true);
    const fileName = `${itemName.replace(/[^\w\u4e00-\u9fa5]/g, "_") || "item"}_${Math.round(angle)} deg.png`;
    try {
      const proxyUrl = getProxyImageUrl(imageUrl);
      const response = await fetch(proxyUrl);
      const blob = await response.blob();
      // 使用原生 <a> 标签下载
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = dlUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(dlUrl);
      }, 1000);
    } catch (error) {
      console.error("保存失败:", error);
      // 降级：在新标签页打开代理 URL
      window.open(getProxyImageUrl(imageUrl), "_blank");
    } finally {
      setSaving(false);
    }
  };

  // ESC 关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // 预览使用代理 URL
  const previewUrl = getProxyImageUrl(imageUrl);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* 弹窗内容 */}
      <div
        className="relative max-w-[90vw] max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 顶部工具栏 */}
        <div className="flex items-center justify-between bg-gray-900/90 backdrop-blur-sm rounded-t-2xl px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="text-white font-semibold text-sm truncate max-w-[300px]">
              {itemName}
            </span>
            <span className="text-gray-400 text-xs bg-gray-800 px-2 py-0.5 rounded-full">
              {Math.round(angle)}°
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {Icons.download}
              {saving ? "保存中..." : "保存图片"}
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors"
            >
              {Icons.close}
            </button>
          </div>
        </div>

        {/* 图片区域 —— 显示原始大尺寸图片 */}
        <div className="relative bg-gray-900 rounded-b-2xl overflow-auto max-h-[calc(90vh-52px)]">
          {!imageLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
            </div>
          )}
          <img
            src={previewUrl}
            alt={`${itemName} - ${Math.round(angle)}°`}
            className={`block max - w - none transition - opacity duration - 300 ${imageLoaded ? "opacity-100" : "opacity-0"
              } `}
            style={{ minWidth: "600px", minHeight: "600px" }}
            onLoad={() => setImageLoaded(true)}
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
}

export default function Compare3DPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CompareItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [angle, setAngle] = useState(0);
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const [scale, setScale] = useState(1);
  const [resetCounter, setResetCounter] = useState(0);
  const [globalPan, setGlobalPan] = useState({ x: 0, y: 0 });
  const autoRotateRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefsRef = useRef<Map<string, ControlledModelViewRef>>(new Map());
  // 预览弹窗状态
  const [previewItem, setPreviewItem] = useState<CompareItem | null>(null);
  const [exporting, setExporting] = useState(false);

  // 加载对比列表
  useEffect(() => {
    api.compare
      .getAll()
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // 自动旋转
  useEffect(() => {
    if (isAutoRotating) {
      autoRotateRef.current = setInterval(() => {
        setAngle((prev) => (prev + 11.25) % 360);
      }, 100);
    } else {
      if (autoRotateRef.current) {
        clearInterval(autoRotateRef.current);
        autoRotateRef.current = null;
      }
    }
    return () => {
      if (autoRotateRef.current) {
        clearInterval(autoRotateRef.current);
      }
    };
  }, [isAutoRotating]);

  // 缩放操作
  const handleZoom = useCallback((direction: 'in' | 'out') => {
    setScale((prev) =>
      Math.min(
        Math.max(
          MIN_COMPARE_SCALE,
          prev + (direction === 'in' ? 0.5 : -0.5),
        ),
        MAX_COMPARE_SCALE,
      ),
    );
  }, []);

  // 滑块控制
  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setAngle(Number(e.target.value));
    },
    [],
  );

  // 步进控制
  const stepAngle = useCallback((delta: number) => {
    setAngle((prev) => (((prev + delta) % 360) + 360) % 360);
  }, []);

  // 重置
  const handleReset = useCallback(() => {
    setAngle(0);
    setScale(1);
    setGlobalPan({ x: 0, y: 0 });
    setResetCounter(prev => prev + 1);
  }, []);

  // 切换自动旋转
  const toggleAutoRotate = useCallback(() => {
    setIsAutoRotating((prev) => !prev);
  }, []);

  // 获取当前角度对应的原图 URL
  const getFrameUrl = useCallback(
    (item: CompareItem) => {
      if (!item.captureUrls || item.captureUrls.length === 0) return null;
      const frameIndex =
        Math.floor((((angle % 360) + 360) / 360) * 32) % 32;
      return item.captureUrls[frameIndex];
    },
    [angle],
  );

  // 打开预览弹窗（暂停自动旋转）
  const handleOpenPreview = useCallback(
    (item: CompareItem) => {
      if (!item.captureUrls || item.captureUrls.length === 0) {
        alert("该物品没有3D图片");
        return;
      }
      setIsAutoRotating(false);
      setPreviewItem(item);
    },
    [],
  );

  // 导出所有物品的当前视图截图（Canvas drawImage 精准裁切）
  const handleExportAll = useCallback(async () => {
    if (items.length === 0) return;

    setExporting(true);
    try {
      const zip = new JSZip();

      for (const item of items) {
        const itemRef = itemRefsRef.current.get(item.id);
        const params = itemRef?.getExportParams();
        if (!params) continue;

        const { frameUrl, containerRect, effectiveScale, effectivePan } = params;

        // 通过代理获取原始图片
        const response = await fetch(frameUrl);
        const blob = await response.blob();
        const bitmap = await createImageBitmap(blob);
        const imgW = bitmap.width;
        const imgH = bitmap.height;

        // 计算 object-contain 在容器中的显示尺寸
        const containerW = containerRect.w;
        const containerH = containerRect.h;
        const scaleToFit = Math.min(containerW / imgW, containerH / imgH);
        const displayW = imgW * scaleToFit;
        const displayH = imgH * scaleToFit;

        // 经过 scale 和 pan 变换后，图片在容器中的位置
        // transform-origin 是 center，所以缩放以容器中心为基准
        const scaledDisplayW = displayW * effectiveScale;
        const scaledDisplayH = displayH * effectiveScale;
        const imgLeft = (containerW - scaledDisplayW) / 2 + effectivePan.x;
        const imgTop = (containerH - scaledDisplayH) / 2 + effectivePan.y;

        // 容器可见窗口 [0, 0, containerW, containerH] 映射回图片坐标
        const sx = Math.max(0, (0 - imgLeft) / scaledDisplayW * imgW);
        const sy = Math.max(0, (0 - imgTop) / scaledDisplayH * imgH);
        const visibleRight = Math.min(containerW, imgLeft + scaledDisplayW);
        const visibleBottom = Math.min(containerH, imgTop + scaledDisplayH);
        const visibleLeft = Math.max(0, imgLeft);
        const visibleTop = Math.max(0, imgTop);
        const sw = (visibleRight - visibleLeft) / scaledDisplayW * imgW;
        const sh = (visibleBottom - visibleTop) / scaledDisplayH * imgH;

        // 输出 Canvas 尺寸 = 容器可见区域大小 (2x 高清)
        const outputScale = 2;
        const canvasW = Math.round(containerW * outputScale);
        const canvasH = Math.round(containerH * outputScale);

        const canvas = document.createElement('canvas');
        canvas.width = canvasW;
        canvas.height = canvasH;
        const ctx = canvas.getContext('2d')!;

        // 填充背景色（与容器一致的浅灰色）
        ctx.fillStyle = '#e8ecf0';
        ctx.fillRect(0, 0, canvasW, canvasH);

        // 图片在 canvas 上的绘制位置
        const drawX = Math.max(0, imgLeft) * outputScale;
        const drawY = Math.max(0, imgTop) * outputScale;
        const drawW = (visibleRight - visibleLeft) * outputScale;
        const drawH = (visibleBottom - visibleTop) * outputScale;

        if (sw > 0 && sh > 0 && drawW > 0 && drawH > 0) {
          ctx.drawImage(bitmap, sx, sy, sw, sh, drawX, drawY, drawW, drawH);
        }

        bitmap.close();

        const pngBlob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b!), 'image/png');
        });

        const prefix = item.serialNum || item.name.replace(/[^\w\u4e00-\u9fa5]/g, '_');
        zip.file(`${prefix}_${Math.round(angle)}deg.png`, pngBlob);
      }

      const content = await zip.generateAsync({ type: 'blob', mimeType: 'application/zip' });
      const fileName = `compare_${Math.round(angle)}deg_${Date.now()}.zip`;

      // 使用原生 <a> 标签下载，避免 saveAs 文件名异常
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();

      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 1000);
    } catch (error) {
      console.error('导出失败:', error);
      alert('导出失败，请重试');
    } finally {
      setExporting(false);
    }
  }, [items, angle]);

  // 物品少于2个时显示提示
  if (!loading && items.length < 2) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center p-8">
        <div className="w-32 h-32 bg-gradient-to-br from-blue-100 to-indigo-150 rounded-3xl flex items-center justify-center mb-6 shadow-lg">
          {Icons.empty}
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">需要更多物品</h2>
        <p className="text-gray-500 mb-6 text-center max-w-md">
          3D 对比功能需要至少 2 个物品。请先在对比列表中添加物品。
        </p>
        <button
          onClick={() => navigate("/compare")}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors flex items-center gap-2"
        >
          {Icons.back}
          返回对比列表
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const currentFrameAngle = Math.round(angle);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* 全屏预览弹窗 */}
      {previewItem && (
        <ImagePreviewModal
          imageUrl={getFrameUrl(previewItem) || ""}
          itemName={previewItem.name}
          angle={angle}
          onClose={() => setPreviewItem(null)}
        />
      )}

      {/* 头部 */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate("/compare")}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            {Icons.back}
            <span className="font-medium">返回对比列表</span>
          </button>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            {Icons.cube}
            3D 模型对比
          </h1>
          <div className="w-32" />
        </div>
      </header>

      {/* 控制栏 */}
      <div className="bg-white/60 backdrop-blur border-b border-gray-100 sticky top-[65px] z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4 flex-wrap justify-center">
            {/* 左箭头 */}
            <button
              onClick={() => stepAngle(-11.25)}
              disabled={isAutoRotating}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="旋转 -11.25°"
            >
              {Icons.left}
            </button>

            {/* 滑块 */}
            <div className="flex items-center gap-3 flex-1 max-w-md">
              <span className="text-xs text-gray-400 w-8">0°</span>
              <input
                type="range"
                min="0"
                max="360"
                step="0.1"
                value={angle}
                onChange={handleSliderChange}
                disabled={isAutoRotating}
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed accent-blue-500"
              />
              <span className="text-xs text-gray-400 w-12">360°</span>
            </div>

            {/* 右箭头 */}
            <button
              onClick={() => stepAngle(11.25)}
              disabled={isAutoRotating}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="旋转 +11.25°"
            >
              {Icons.right}
            </button>

            <div className="w-px h-6 bg-gray-200 mx-2" />

            {/* 缩放按钮 */}
            <button
              onClick={() => handleZoom('in')}
              disabled={scale >= MAX_COMPARE_SCALE}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="放大"
            >
              {Icons.zoomIn}
            </button>
            <div className="px-2 py-1 text-xs font-medium text-gray-500 min-w-[40px] text-center">
              {Math.round(scale * 100)}%
            </div>
            <button
              onClick={() => handleZoom('out')}
              disabled={scale <= MIN_COMPARE_SCALE}
              className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="缩小"
            >
              {Icons.zoomOut}
            </button>

            <div className="w-px h-6 bg-gray-200 mx-2" />

            {/* 角度显示 */}
            <div className="px-4 py-2 bg-blue-50 rounded-lg border border-blue-100 min-w-[80px] text-center">
              <span className="text-sm font-bold text-blue-600">
                {currentFrameAngle}°
              </span>
            </div>

            {/* 重置按钮 */}
            <button
              onClick={handleReset}
              disabled={isAutoRotating}
              className="px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5 text-sm font-medium text-gray-600"
            >
              {Icons.reset}
              重置
            </button>



            <div className="w-px h-6 bg-gray-200 mx-2" />

            {/* 自动旋转 */}
            <button
              onClick={toggleAutoRotate}
              className={`px - 3 py - 2 rounded - lg transition - colors flex items - center gap - 1.5 text - sm font - medium ${isAutoRotating
                ? "bg-blue-500 text-white"
                : "bg-gray-100 hover:bg-gray-200 text-gray-600"
                } `}
            >
              {isAutoRotating ? Icons.pause : Icons.play}
              {isAutoRotating ? "暂停" : "自动"}
            </button>

            <div className="w-px h-6 bg-gray-200 mx-2" />

            <button
              onClick={handleExportAll}
              disabled={exporting || items.length === 0}
              className="px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {exporting ? (
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              ) : Icons.download}
              {exporting ? "导出中..." : "导出全部"}
            </button>
          </div>
        </div>
      </div>

      {/* 3D 展示区域 */}
      <div
        ref={containerRef}
        className="px-4 py-8 overflow-hidden"
      >
        <div className="max-w-full overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max px-4 items-start">
            {items.map((item) => (
              <div
                key={item.id}
                className="flex-shrink-0 group relative"
                style={{ width: "clamp(18rem, calc((100vw - 8rem) / 3), 24rem)" }}
              >
                <ControlledModelView
                  ref={(el) => {
                    if (el) {
                      itemRefsRef.current.set(item.id, el);
                    } else {
                      itemRefsRef.current.delete(item.id);
                    }
                  }}
                  captureUrls={item.captureUrls || []}
                  fallbackUrl={item.imageUrl}
                  name={item.name}
                  serialNum={item.serialNum}
                  price={item.currentPrice}
                  angle={angle}
                  scale={scale}
                  resetCounter={resetCounter}
                  globalPan={globalPan}
                />
                {/* 截图保存按钮 */}
                {item.captureUrls && item.captureUrls.length > 0 && (
                  <button
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      handleOpenPreview(item);
                    }}
                    className="absolute bottom-16 right-2 z-50 p-2.5 bg-white/90 hover:bg-blue-500 hover:text-white rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-all text-xs font-medium text-gray-600 flex items-center gap-1.5 border border-gray-200 hover:border-blue-500 cursor-pointer"
                    title="查看大图并保存"
                  >
                    {Icons.camera}
                    <span className="hidden sm:inline">截图</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 提示 */}
        <div className="text-center mt-4">
          <p className="text-sm text-gray-400">
            {isAutoRotating
              ? "自动旋转中..."
              : "← 鼠标悬停独立操作：左键拖拽旋转/平移 · 滚轮缩放 · 右下角📷截图 →"}
          </p>
        </div>
      </div>
    </div>
  );
}
