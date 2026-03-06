import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";
import type { CompareItem } from "@shared/types";
import ControlledModelView from "./ControlledModelView";
import { saveAs } from "file-saver";

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
  download: (
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
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l4-4m5 3V8m0 6a3 3 0 003 3h10a3 3 0 003-3V8m0-6V4m0 16v1a3 3 0 003 3h10a3 3 0 003-3v-1"
      />
    </svg>
  ),
};

export default function Compare3DPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<CompareItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [angle, setAngle] = useState(0);
  const [isAutoRotating, setIsAutoRotating] = useState(false);
  const autoRotateRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // 拖拽控制
  const handleDragStart = useCallback(
    (e: React.PointerEvent) => {
      if (isAutoRotating) return;

      const startX = e.clientX;
      const startAngle = angle;

      const handleMove = (moveEvent: PointerEvent) => {
        const deltaX = moveEvent.clientX - startX;
        // 水平移动转换为角度变化（每10像素约11.25度）
        const deltaAngle = (deltaX / 10) * 11.25;
        setAngle((((startAngle + deltaAngle) % 360) + 360) % 360);
      };

      const handleUp = () => {
        document.removeEventListener("pointermove", handleMove);
        document.removeEventListener("pointerup", handleUp);
        if (containerRef.current) {
          containerRef.current.releasePointerCapture(e.pointerId);
        }
      };

      document.addEventListener("pointermove", handleMove);
      document.addEventListener("pointerup", handleUp);
      if (containerRef.current) {
        containerRef.current.setPointerCapture(e.pointerId);
      }
    },
    [angle, isAutoRotating],
  );

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
  }, []);

  // 切换自动旋转
  const toggleAutoRotate = useCallback(() => {
    setIsAutoRotating((prev) => !prev);
  }, []);

  // 导出当前角度的单张图片
  const exportCurrentImage = useCallback(
    async (item: CompareItem) => {
      if (!item.captureUrls || item.captureUrls.length === 0) {
        alert("该物品没有3D图片可导出");
        return;
      }

      // 获取当前角度对应的图片URL
      const frameIndex = Math.floor((((angle % 360) + 360) / 360) * 32) % 32;
      const currentImageUrl = item.captureUrls[frameIndex];
      const fileName = `${item.name.replace(/[^\w\u4e00-\u9fa5]/g, "_") || "item"}_${Math.round(angle)}deg.png`;

      try {
        // 直接下载图片
        const response = await fetch(currentImageUrl);
        const blob = await response.blob();
        saveAs(blob, fileName);
      } catch (error) {
        console.error("Export failed:", error);
        // 如果fetch失败，尝试直接打开链接
        window.open(currentImageUrl, "_blank");
      }
    },
    [angle],
  );

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
              title="旋转 -15°"
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
              title="旋转 +15°"
            >
              {Icons.right}
            </button>

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

            {/* 自动旋转 */}
            <button
              onClick={toggleAutoRotate}
              className={`px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5 text-sm font-medium ${
                isAutoRotating
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 hover:bg-gray-200 text-gray-600"
              }`}
            >
              {isAutoRotating ? Icons.pause : Icons.play}
              {isAutoRotating ? "暂停" : "自动"}
            </button>
          </div>
        </div>
      </div>

      {/* 3D 展示区域 */}
      <div
        ref={containerRef}
        onPointerDown={handleDragStart}
        className={`px-4 py-8 ${!isAutoRotating ? "cursor-grab active:cursor-grabbing" : ""}`}
      >
        <div className="max-w-full overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max px-4">
            {items.map((item) => (
              <div key={item.id} className="flex-shrink-0 w-64 group relative">
                <ControlledModelView
                  captureUrls={item.captureUrls || []}
                  fallbackUrl={item.imageUrl}
                  name={item.name}
                  serialNum={item.serialNum}
                  price={item.currentPrice}
                  angle={angle}
                  isDraggable={false}
                />
                {/* 导出按钮 */}
                {item.captureUrls && item.captureUrls.length > 0 && (
                  <button
                    onClick={() => exportCurrentImage(item)}
                    className="absolute bottom-16 right-2 p-2 bg-white/90 hover:bg-white rounded-lg shadow-md opacity-0 group-hover:opacity-100 transition-opacity text-xs font-medium text-gray-600 hover:text-blue-600 flex items-center gap-1"
                    title="保存当前角度图片"
                  >
                    {Icons.download}
                    <span className="hidden sm:inline">保存</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 提示 */}
        <div className="text-center mt-4">
          <p className="text-sm text-gray-400">
            {isAutoRotating ? "自动旋转中..." : "← 拖拽此区域旋转所有模型 →"}
          </p>
        </div>
      </div>
    </div>
  );
}
