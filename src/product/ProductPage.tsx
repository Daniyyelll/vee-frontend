import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import { ApiError, messageOf } from "../api/client";
import { formatPrice, storeApi } from "../api/store";
import type { Category, Product } from "../api/store";
import { navigateTo } from "../navigation";
import ProductImage from "../components/ProductImage";
import ReviewsPanel from "../components/ReviewsPanel";
import "./product.css";

type Props = {
  slug: string;
  categories: Category[];
  onAdd: (product: Product) => void;
  onSignIn: () => void;
  onLoaded: (product: Product) => void;
};

export default function ProductPage({
  slug,
  categories,
  onAdd,
  onSignIn,
  onLoaded,
}: Props) {
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [missing, setMissing] = useState(false);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setProduct(null);
    setError("");
    setMissing(false);
    storeApi
      .product(slug, controller.signal)
      .then((item) => {
        if (!controller.signal.aborted) {
          setProduct(item);
          onLoaded(item);
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) {
          setMissing(cause instanceof ApiError && cause.status === 404);
          setError(messageOf(cause));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [slug, reload, onLoaded]);

  useEffect(() => {
    document.title = product ? `${product.productName} | Vee` : "Vee";
  }, [product]);

  const category = product
    ? categories.find((item) => item.id === product.categoryId)
    : undefined;

  return (
    <main id="main" className="product-page">
      <nav className="product-breadcrumb" aria-label="Breadcrumb">
        <a
          href="/collection"
          onClick={(event) => navigateTo(event, "/collection")}
        >
          The collection
        </a>
        <ArrowRight size={14} aria-hidden="true" />
        {product && category ? (
          <a
            href={`/collection?category=${encodeURIComponent(category.id)}`}
            onClick={(event) =>
              navigateTo(
                event,
                `/collection?category=${encodeURIComponent(category.id)}`,
              )
            }
          >
            {category.categoryName}
          </a>
        ) : (
          <span aria-current="page">Product</span>
        )}
      </nav>

      {loading ? (
        <div className="product-page-loading" role="status">
          <div className="product-image-skeleton" aria-hidden="true" />
          <div className="product-copy-skeleton" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <span className="visually-hidden">Loading this product…</span>
        </div>
      ) : error ? (
        <section
          className="product-page-message"
          aria-labelledby="product-message-title"
        >
          <h1 id="product-message-title">
            {missing
              ? "This product is no longer available."
              : "A momentary pause."}
          </h1>
          <p>
            {missing
              ? "Return to the collection to discover what is available now."
              : error}
          </p>
          {missing ? (
            <a
              className="solid-link"
              href="/collection"
              onClick={(event) => navigateTo(event, "/collection")}
            >
              Explore the collection <ArrowRight size={17} />
            </a>
          ) : (
            <button
              className="text-link"
              onClick={() => setReload((value) => value + 1)}
            >
              Try again <ArrowRight size={16} />
            </button>
          )}
        </section>
      ) : product ? (
        <>
          <section className="product-stage" aria-labelledby="product-title">
            <div className="product-media">
              <ProductImage
                className="product-page-image"
                src={product.imageUrl}
                alt={product.productName}
                eager
              />
            </div>
            <div className="product-purchase">
              <h1 id="product-title">{product.productName}</h1>
              <p className="product-page-price">{formatPrice(product)}</p>
              {product.description && (
                <p className="product-page-description">
                  {product.description}
                </p>
              )}
              <p
                className={`product-page-stock ${
                  product.stockQuantity > 0 ? "in-stock" : "out-of-stock"
                }`}
                aria-live="polite"
              >
                {product.stockQuantity > 0
                  ? "Available"
                  : "Currently out of stock"}
              </p>
              <button
                className="solid-link product-page-add"
                disabled={product.stockQuantity === 0}
                onClick={() => onAdd(product)}
              >
                {product.stockQuantity > 0 ? "Add to bag" : "Out of stock"}
                {product.stockQuantity > 0 && <Plus size={17} />}
              </button>
              <a
                className="product-back-link"
                href="/collection"
                onClick={(event) => navigateTo(event, "/collection")}
              >
                <ArrowLeft size={16} /> Continue browsing
              </a>
            </div>
          </section>
          <ReviewsPanel productId={product.id} onSignIn={onSignIn} />
        </>
      ) : null}
    </main>
  );
}
