import { useEffect, useState } from "react";
import { Image } from "lucide-react";
import { imageUrl } from "../api/client";

export default function ProductImage({
  src,
  alt,
  className = "",
  eager = false,
}: {
  src: string | null;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const resolved = imageUrl(src);
  useEffect(() => setFailed(false), [src]);
  if (!resolved || failed)
    return (
      <div
        className={`image-placeholder ${className}`}
        role="img"
        aria-label={`${alt}. Image unavailable.`}
      >
        <Image size={32} strokeWidth={1} />
        <span>Image unavailable</span>
      </div>
    );
  return (
    <img
      className={className}
      src={resolved}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      width="600"
      height="750"
      onError={() => setFailed(true)}
    />
  );
}
