import { useState } from 'react';
import { ImageOff } from 'lucide-react';

interface SafeImageProps {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

function isSafeImageSrc(src: string | null | undefined): src is string {
  if (!src) return false;
  const trimmed = src.trim();
  return (
    trimmed.startsWith('/') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:image/jpeg;base64,') ||
    trimmed.startsWith('data:image/png;base64,') ||
    trimmed.startsWith('data:image/webp;base64,')
  );
}

export function SafeImage({
  src,
  alt,
  className = '',
  fallbackTitle = 'Civic photograph unavailable',
}: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  if (!isSafeImageSrc(src) || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center gap-2 bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0] p-6 text-center ${className}`}
      >
        <ImageOff className="w-6 h-6 text-[#94A3B8]" aria-hidden="true" />
        <span className="text-xs font-medium text-[#475569]">{fallbackTitle}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
