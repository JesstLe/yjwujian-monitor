import { useState, useRef, useEffect, useCallback, useMemo } from "react";

const Icons = {
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

interface CapturePreviewProps {
  captureUrls: string[];
  fallbackUrl: string | null;
  alt: string;
  className?: string; // Allow custom sizing/styling
}

export default function CapturePreview({
  captureUrls,
  fallbackUrl,
  alt,
  className,
}: CapturePreviewProps) {
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isActivated, setIsActivated] = useState(false);

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

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    if (!hasCapture) {
      setIsActivated(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setIsActivated(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: "160px",
      },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [hasCapture]);

  // Preload all frames
  useEffect(() => {
    if (hasCapture && isActivated) {
      const preloadCount = hasInteracted
        ? proxiedCaptureUrls.length
        : Math.min(3, proxiedCaptureUrls.length);
      proxiedCaptureUrls.slice(0, preloadCount).forEach((url) => {
        const img = new Image();
        img.src = url;
      });
    }
  }, [proxiedCaptureUrls, hasCapture, isActivated, hasInteracted]);

  // Auto-play rotation animation on hover
  const handleMouseEnter = useCallback(() => {
    if (!hasCapture || !isActivated) return;
    setHasInteracted(true);
    setIsHovering(true);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    intervalRef.current = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % proxiedCaptureUrls.length);
    }, 80); // ~12.5fps for smooth rotation
  }, [proxiedCaptureUrls.length, hasCapture, isActivated]);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setCurrentFrame(0);
  }, []);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full aspect-square overflow-hidden bg-slate-900/50 ${className || ""}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 渲染并堆叠所有的帧，通过透明度切换而不是直接修改src以解决闪烁问题 */}
      {hasCapture && isActivated ? (
        proxiedCaptureUrls.map((url, idx) => (
          <img
            key={idx}
            src={url}
            alt={`${alt} - 帧 ${idx}`}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[50ms] ${currentFrame === idx ? "opacity-100" : "opacity-0"
              }`}
            loading="lazy"
            crossOrigin="anonymous"
          />
        ))
      ) : (
        <img
          src={proxiedFallbackUrl || ""}
          alt={alt}
          className={`w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setImageLoaded(true)}
          loading="lazy"
          crossOrigin="anonymous"
        />
      )}

      {/* 3D Rotation Indicator */}
      {hasCapture && isActivated && isHovering && (
        <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md bg-black/60 text-xs text-cyan-400 backdrop-blur-sm">
          {Icons.cube}
          <span>3D</span>
        </div>
      )}
    </div>
  );
}
