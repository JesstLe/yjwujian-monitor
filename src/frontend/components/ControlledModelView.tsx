import { useRef, useCallback, useEffect, useState, useMemo } from "react";

interface ControlledModelViewProps {
  captureUrls: string[];
  fallbackUrl: string | null;
  name: string;
  serialNum: string;
  price: number;
  angle: number; // 0-360
  onAngleChange?: (angle: number) => void;
  isDraggable?: boolean;
}

// 将外部图片URL转换为代理URL
function getProxyImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
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
}

// 将角度转换为帧索引（32帧对应0-360度）
function angleToFrameIndex(angle: number): number {
  const normalizedAngle = ((angle % 360) + 360) % 360;
  return Math.floor(normalizedAngle / 11.25) % 32;
}

export default function ControlledModelView({
  captureUrls,
  fallbackUrl,
  name,
  serialNum,
  price,
  angle,
  onAngleChange,
  isDraggable = true,
}: ControlledModelViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lastX, setLastX] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);

  // 将所有URL转换为代理URL
  const proxiedCaptureUrls = useMemo(
    () => captureUrls.map((url) => getProxyImageUrl(url) || url),
    [captureUrls],
  );
  const proxiedFallbackUrl = useMemo(
    () => getProxyImageUrl(fallbackUrl),
    [fallbackUrl],
  );

  const hasCapture = proxiedCaptureUrls.length > 0;
  const frameIndex = hasCapture ? angleToFrameIndex(angle) : 0;
  const displayUrl = hasCapture
    ? proxiedCaptureUrls[frameIndex]
    : proxiedFallbackUrl;

  // Preload all frames
  useEffect(() => {
    if (hasCapture) {
      proxiedCaptureUrls.forEach((url) => {
        const img = new Image();
        img.src = url;
      });
    }
  }, [proxiedCaptureUrls, hasCapture]);

  // Reset image loaded state when frame changes
  useEffect(() => {
    setImageLoaded(false);
  }, [frameIndex]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggable || !hasCapture) return;
      e.preventDefault();
      setIsDragging(true);
      setLastX(e.clientX);
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [isDraggable, hasCapture],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !onAngleChange) return;

      const deltaX = e.clientX - lastX;
      setLastX(e.clientX);

      // 将像素移动转换为角度变化（移动容器宽度时旋转180度）
      const containerWidth = containerRef.current?.clientWidth || 300;
      const angleChange = (deltaX / containerWidth) * 180;

      const newAngle = angle + angleChange;
      onAngleChange(newAngle);
    },
    [isDragging, lastX, onAngleChange, angle],
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  if (!displayUrl) {
    return (
      <div className="w-full aspect-square bg-slate-800/50 flex items-center justify-center rounded-xl">
        <span className="text-4xl opacity-20">🎮</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`select-none ${
        isDraggable && hasCapture ? "cursor-grab" : ""
      } ${isDragging ? "cursor-grabbing" : ""}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      {/* 3D 视图区域 */}
      <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 rounded-t-xl">
        <img
          src={displayUrl}
          alt={name}
          className={`w-full h-full object-cover transition-opacity duration-150 ${
            imageLoaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setImageLoaded(true)}
          loading="lazy"
          draggable={false}
          crossOrigin="anonymous"
        />
        {!imageLoaded && (
          <div className="absolute inset-0 bg-slate-200 animate-pulse" />
        )}
        {/* 拖拽提示 */}
        {isDraggable && hasCapture && !isDragging && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded-md bg-black/50 text-xs text-white backdrop-blur-sm">
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
                d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
              />
            </svg>
            <span>拖拽旋转</span>
          </div>
        )}
      </div>

      {/* 信息区域 */}
      <div className="p-3 bg-white rounded-b-xl border-t border-gray-100">
        <h4
          className="text-sm font-semibold text-gray-900 truncate"
          title={name}
        >
          {name}
        </h4>
        <p className="text-xs text-gray-400 mt-0.5">{serialNum || "无编号"}</p>
        <div className="flex items-baseline gap-0.5 mt-1.5">
          <span className="text-xs text-gray-400">¥</span>
          <span className="text-lg font-bold text-blue-600">
            {(price / 100).toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}
