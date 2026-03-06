import { useRef, useCallback, useEffect, useState, useMemo } from "react";

interface ControlledModelViewProps {
  captureUrls: string[];
  fallbackUrl: string | null;
  name: string;
  serialNum: string;
  price: number;
  angle: number; // 0-360
  scale?: number;
  interactionMode?: "rotate" | "pan";
  resetCounter?: number;
  onAngleChange?: (angle: number) => void;
  isDraggable?: boolean;
  globalPan?: { x: number; y: number };
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
  scale = 1,
  interactionMode = "rotate",
  resetCounter = 0,
  onAngleChange,
  isDraggable = true,
  globalPan = { x: 0, y: 0 },
}: ControlledModelViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [lastPos, setLastPos] = useState({ x: 0, y: 0 });
  const [localPan, setLocalPan] = useState({ x: 0, y: 0 });
  const [localScale, setLocalScale] = useState(1);
  const [loadedFrames, setLoadedFrames] = useState<Record<number, boolean>>({});
  const [frameAspectRatio, setFrameAspectRatio] = useState<number>(1884 / 900);

  // Reset local transform when resetCounter changes
  useEffect(() => {
    setLocalPan({ x: 0, y: 0 });
    setLocalScale(1);
  }, [resetCounter]);

  // 合并全局平移和本地平移
  const effectivePan = {
    x: globalPan.x + localPan.x,
    y: globalPan.y + localPan.y,
  };

  const effectiveScale = scale * localScale;

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

  // 重置加载状态当URL列表改变时
  useEffect(() => {
    setLoadedFrames({});
  }, [proxiedCaptureUrls]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!isDraggable || !hasCapture) return;
      e.preventDefault();
      setIsDragging(true);
      setLastPos({ x: e.clientX, y: e.clientY });
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [isDraggable, hasCapture],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;

      const deltaX = e.clientX - lastPos.x;
      const deltaY = e.clientY - lastPos.y;
      setLastPos({ x: e.clientX, y: e.clientY });

      const isPanning = interactionMode === "pan" || e.buttons === 2 || e.shiftKey;

      if (isPanning) {
        setLocalPan((prev) => ({
          x: prev.x + deltaX,
          y: prev.y + deltaY,
        }));
      } else if (onAngleChange) {
        // Rotate mode
        const containerWidth = containerRef.current?.clientWidth || 300;
        const angleChange = (deltaX / containerWidth) * 180;
        onAngleChange(angle + angleChange);
      }
    },
    [isDragging, lastPos, onAngleChange, angle, interactionMode],
  );

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!isDraggable) return;
    e.preventDefault();
    const zoomSensitivity = 0.002;
    const delta = -e.deltaY * zoomSensitivity;
    setLocalScale((prevScale) => Math.min(Math.max(0.5, prevScale + delta), 5));
  }, [isDraggable]);

  const handleFrameLoad = useCallback(
    (idx: number, event: React.SyntheticEvent<HTMLImageElement>) => {
      const image = event.currentTarget;
      if (image.naturalWidth > 0 && image.naturalHeight > 0) {
        setFrameAspectRatio(image.naturalWidth / image.naturalHeight);
      }
      setLoadedFrames((prev) => ({ ...prev, [idx]: true }));
    },
    [],
  );

  if (!hasCapture && !proxiedFallbackUrl) {
    return (
      <div className="w-full aspect-square bg-slate-800/50 flex items-center justify-center rounded-xl">
        <span className="text-4xl opacity-20">🎮</span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`select-none touch-none ${isDraggable && hasCapture ? "cursor-grab" : ""
        } ${isDragging ? "cursor-grabbing" : ""}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onWheel={handleWheel}
      onContextMenu={(e) => {
        if (isDraggable) e.preventDefault();
      }}
    >
      {/* 3D 视图区域 */}
      <div
        className="relative overflow-hidden bg-gradient-to-br from-slate-100 to-slate-200 rounded-t-xl group/view"
        style={{ aspectRatio: String(frameAspectRatio) }}
      >
        {/* 如果没有3D图片，只显示回退图片 */}
        {!hasCapture && proxiedFallbackUrl && (
          <img
            src={proxiedFallbackUrl}
            alt={name}
            className={`w-full h-full object-contain transition-opacity duration-150 transform-gpu origin-center ${loadedFrames[0] ? "opacity-100" : "opacity-0"
              }`}
              style={{
                transform: `translate(${localPan.x}px, ${localPan.y}px) scale(${effectiveScale})`,
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                imageRendering: "auto",
                willChange: "transform",
                backfaceVisibility: "hidden",
              }}
            onLoad={(event) => handleFrameLoad(0, event)}
            loading="lazy"
            draggable={false}
            crossOrigin="anonymous"
          />
        )}

        {/* 堆叠渲染所有32帧（或实际帧数），只显示当前帧可消除闪烁 */}
        {hasCapture &&
          proxiedCaptureUrls.map((url, idx) => (
            <img
              key={idx}
              src={url}
              alt={`${name} - 帧 ${idx}`}
              className={`absolute inset-0 w-full h-full object-contain transform-gpu origin-center ${idx === frameIndex ? "visible opacity-100" : "invisible opacity-0"
                }`}
              onLoad={(event) => handleFrameLoad(idx, event)}
              loading="lazy"
              draggable={false}
              crossOrigin="anonymous"
              style={{
                pointerEvents: idx === frameIndex ? "auto" : "none",
                transform: `translate(${effectivePan.x}px, ${effectivePan.y}px) scale(${effectiveScale})`,
                transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                imageRendering: "auto",
                willChange: "transform",
                backfaceVisibility: "hidden",
              }}
            />
          ))}

        {/* 只在完全没有加载任何图片并且有fallback时，保留一个最初的加载背景 */}
        {!hasCapture && proxiedFallbackUrl && !loadedFrames[0] && (
          <div className="absolute inset-0 bg-slate-200/80 animate-pulse pointer-events-none" />
        )}

        {/* 拖拽提示 */}
        {isDraggable && hasCapture && !isDragging && (
          <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded-md bg-black/50 text-xs text-white backdrop-blur-sm opacity-0 group-hover/view:opacity-100 transition-opacity">
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {interactionMode === "rotate" ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                />
              )}
            </svg>
            <span>{interactionMode === "rotate" ? "拖拽旋转" : "拖拽平移"}</span>
          </div>
        )}
      </div>

      {/* 信息区域 */}
      <div className="p-3 bg-white rounded-b-xl border-t border-gray-100 pointer-events-none">
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
