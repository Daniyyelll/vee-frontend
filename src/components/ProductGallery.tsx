import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Product } from "../api/store";
import ProductImage from "./ProductImage";
import "./product-gallery.css";

export function productPhotos(product: Product): string[] {
  return [...new Set([product.imageUrl, ...(product.imageUrls ?? [])])].filter(
    (url): url is string => !!url,
  );
}

export default function ProductGallery({ product }: { product: Product }) {
  const photos = productPhotos(product);
  const [selected, setSelected] = useState<string | null>(null);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const index = Math.max(0, selected ? photos.indexOf(selected) : 0);
  const move = (direction: number) =>
    setSelected(photos[(index + direction + photos.length) % photos.length]);

  return (
    <div className="product-gallery" role="group" aria-label="Product photos">
      <div
        className="product-gallery-frame"
        onTouchStart={(event) => {
          if (event.touches.length !== 1) {
            touch.current = null;
            return;
          }
          touch.current = {
            x: event.touches[0].clientX,
            y: event.touches[0].clientY,
          };
        }}
        onTouchCancel={() => {
          touch.current = null;
        }}
        onTouchEnd={(event) => {
          if (!touch.current || !event.changedTouches.length) return;
          const dx = event.changedTouches[0].clientX - touch.current.x;
          const dy = event.changedTouches[0].clientY - touch.current.y;
          touch.current = null;
          if (
            photos.length > 1 &&
            Math.abs(dx) > 40 &&
            Math.abs(dx) > Math.abs(dy)
          )
            move(dx < 0 ? 1 : -1);
        }}
      >
        <ProductImage
          key={photos[index] ?? "unavailable"}
          className="product-gallery-image"
          src={photos[index] ?? null}
          alt={`${product.productName}${photos.length > 1 ? ` — photo ${index + 1}` : ""}`}
          eager
        />
      </div>
      {photos.length > 1 && (
        <>
          <div className="product-gallery-controls">
            <button
              type="button"
              aria-label="Previous photo"
              onClick={() => move(-1)}
            >
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <span aria-live="polite" aria-atomic="true">
              Photo {index + 1} of {photos.length}
            </span>
            <button
              type="button"
              aria-label="Next photo"
              onClick={() => move(1)}
            >
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          </div>
          <div
            className="product-gallery-thumbnails"
            aria-label="Choose a photo"
          >
            {photos.map((src, photoIndex) => (
              <button
                key={src}
                type="button"
                aria-label={`Show photo ${photoIndex + 1}`}
                aria-pressed={photoIndex === index}
                onClick={() => setSelected(src)}
              >
                <ProductImage
                  src={src}
                  alt={`${product.productName} — thumbnail ${photoIndex + 1}`}
                />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
