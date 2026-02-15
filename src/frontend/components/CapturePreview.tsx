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
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const hasCapture = captureUrls.length > 0;

    // Preload all frames
    useEffect(() => {
        if (hasCapture) {
            captureUrls.forEach((url) => {
                const img = new Image();
                img.src = url;
            });
        }
    }, [captureUrls, hasCapture]);

    // Auto-play rotation animation on hover
    const handleMouseEnter = useCallback(() => {
        if (!hasCapture) return;
        setIsHovering(true);
        intervalRef.current = setInterval(() => {
            setCurrentFrame((prev) => (prev + 1) % captureUrls.length);
        }, 80); // ~12.5fps for smooth rotation
    }, [captureUrls.length, hasCapture]);

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

    const displayUrl = hasCapture
        ? captureUrls[currentFrame]
        : fallbackUrl;

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
            {hasCapture && isHovering && (
                <div className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-1 rounded-md bg-black/60 text-xs text-cyan-400 backdrop-blur-sm">
                    {Icons.cube}
                    <span>3D</span>
                </div>
            )}
        </div>
    );
}
