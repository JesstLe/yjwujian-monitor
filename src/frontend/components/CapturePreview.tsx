import { useState, useRef, useEffect, useCallback } from 'react';

const Icons = {
    cube: (
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
    ),
};

interface CapturePreviewProps {
    captureUrls: string[];
    fallbackUrl: string | null;
    alt: string;
    className?: string; // Allow custom sizing/styling
}

export default function CapturePreview({ captureUrls, fallbackUrl, alt, className }: CapturePreviewProps) {
    const [currentFrame, setCurrentFrame] = useState(0);
    const [isHovering, setIsHovering] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [hasInteracted, setHasInteracted] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);
    const [isActivated, setIsActivated] = useState(false);
    const hasCapture = captureUrls.length > 0;

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
            const preloadCount = hasInteracted ? captureUrls.length : Math.min(3, captureUrls.length);
            captureUrls.slice(0, preloadCount).forEach((url) => {
                const img = new Image();
                img.src = url;
            });
        }
    }, [captureUrls, hasCapture, isActivated, hasInteracted]);

    // Auto-play rotation animation on hover
    const handleMouseEnter = useCallback(() => {
        if (!hasCapture || !isActivated) return;
        setHasInteracted(true);
        setIsHovering(true);
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        intervalRef.current = setInterval(() => {
            setCurrentFrame((prev) => (prev + 1) % captureUrls.length);
        }, 80); // ~12.5fps for smooth rotation
    }, [captureUrls.length, hasCapture, isActivated]);

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

    const displayUrl = (hasCapture && isActivated)
        ? captureUrls[currentFrame]
        : (fallbackUrl || captureUrls[0]);

    useEffect(() => {
        setImageLoaded(false);
    }, [displayUrl]);

    if (!displayUrl) {
        // Placeholder if no image is available
        return (
            <div className={`w-full aspect-square bg-slate-800/50 flex items-center justify-center ${className || ''}`}>
                <span className="text-4xl opacity-20">🎮</span>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={`relative w-full aspect-square overflow-hidden bg-slate-900/50 ${className || ''}`}
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
