import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { messageOf } from "../api/client";
import { formatPrice, storeApi } from "../api/store";
import type { Product } from "../api/store";
import ProductImage from "./ProductImage";
import ReviewsPanel from "./ReviewsPanel";

export default function ProductPanel({
  product,
  onAdd,
  onSignIn,
}: {
  product: Product;
  onAdd: (product: Product) => void;
  onSignIn: () => void;
}) {
  const [detail, setDetail] = useState(product);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    storeApi
      .product(product.productSlug, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setDetail(value);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(messageOf(cause));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [product.productSlug, reload]);
  return (
    <div className="product-detail-content">
      <div className="product-detail-top">
        <ProductImage
          className="detail-image"
          src={detail.imageUrl}
          alt={detail.productName}
          eager
        />
        <div className="detail-copy">
          <h2 id="dialog-title">{detail.productName}</h2>
          <p className="product-price">{formatPrice(detail)}</p>
          <p className="product-description">{detail.description}</p>
          {loading ? (
            <p role="status">Checking product details…</p>
          ) : error ? (
            <div role="alert" className="request-error">
              <p>{error}</p>
              <button
                className="text-link"
                onClick={() => setReload((value) => value + 1)}
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              <p className="stock-status">
                {detail.stockQuantity > 0
                  ? "Available"
                  : "Currently out of stock"}
              </p>
              <button
                className="solid-link"
                disabled={detail.stockQuantity === 0}
                onClick={() => onAdd(detail)}
              >
                Add to preview bag <Plus size={17} />
              </button>
              <p className="form-note">
                The bag is a preview. Checkout is not connected yet.
              </p>
            </>
          )}
        </div>
      </div>
      {!loading && !error && (
        <ReviewsPanel productId={detail.id} onSignIn={onSignIn} />
      )}
    </div>
  );
}
