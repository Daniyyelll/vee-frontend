import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import type { Category, Product } from "../api/store";
import ProductCard from "../components/ProductCard";
import "./collection.css";

type Props = {
  categories: Category[];
  products: Product[];
  loading: boolean;
  error: string;
  retry: () => void;
  bag: Record<string, number>;
  onOpen: (product: Product) => void;
  onAdd: (product: Product) => void;
};

function categoryFromUrl() {
  return new URLSearchParams(window.location.search).get("category") ?? "all";
}

export default function CollectionPage({
  categories,
  products,
  loading,
  error,
  retry,
  bag,
  onOpen,
  onAdd,
}: Props) {
  const [categoryId, setCategoryId] = useState(categoryFromUrl);
  const selected = categories.find((item) => item.id === categoryId);
  const activeId = selected?.id ?? "all";
  const visible = useMemo(
    () =>
      activeId === "all"
        ? products
        : products.filter((product) => product.categoryId === activeId),
    [activeId, products],
  );

  useEffect(() => {
    const update = () => setCategoryId(categoryFromUrl());
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);

  function chooseCategory(id: string) {
    const url = new URL(window.location.href);
    if (id === "all") url.searchParams.delete("category");
    else url.searchParams.set("category", id);
    window.history.pushState({}, "", url);
    setCategoryId(id);
  }

  const count = (id: string) =>
    id === "all"
      ? products.length
      : products.filter((product) => product.categoryId === id).length;

  return (
    <main id="main" className="collection-page">
      <div className="collection-intro">
        <h1>The collection.</h1>
        <p>Explore by category.</p>
      </div>
      <div className="collection-layout">
        <aside
          className="collection-directory"
          aria-label="Collection categories"
        >
          <h2>Categories</h2>
          <nav aria-label="Filter products by category">
            {[{ id: "all", categoryName: "All pieces" }, ...categories].map(
              (item) => (
                <button
                  key={item.id}
                  className={activeId === item.id ? "selected" : ""}
                  aria-pressed={activeId === item.id}
                  onClick={() => chooseCategory(item.id)}
                >
                  <span>{item.categoryName}</span>
                  <span className="directory-count">{count(item.id)}</span>
                  <ArrowRight size={17} aria-hidden="true" />
                </button>
              ),
            )}
          </nav>
        </aside>

        <section className="collection-gallery" aria-labelledby="gallery-title">
          <div className="collection-gallery-heading">
            <h2 id="gallery-title">{selected?.categoryName ?? "All pieces"}</h2>
            {!loading && !error && (
              <p>
                {visible.length} {visible.length === 1 ? "piece" : "pieces"}
              </p>
            )}
          </div>
          {loading ? (
            <div className="catalog-loading" role="status">
              Loading the collection…
            </div>
          ) : error ? (
            <div className="request-error" role="alert">
              <h3>A momentary pause.</h3>
              <p>{error}</p>
              <button className="text-link" onClick={retry}>
                Try again <ArrowRight size={16} />
              </button>
            </div>
          ) : visible.length === 0 ? (
            <div className="catalog-empty">
              <h3>
                {products.length
                  ? "Nothing in this category yet."
                  : "The collection is taking shape."}
              </h3>
              <p>
                {products.length
                  ? "Choose another category to continue browsing."
                  : "Please return soon to discover new pieces."}
              </p>
              {products.length > 0 && (
                <button
                  className="text-link"
                  onClick={() => chooseCategory("all")}
                >
                  View all pieces <ArrowRight size={16} />
                </button>
              )}
            </div>
          ) : (
            <div className="product-grid collection-gallery-grid">
              {visible.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  bagQuantity={bag[product.id] ?? 0}
                  onOpen={onOpen}
                  onAdd={onAdd}
                />
              ))}
            </div>
          )}
          <p className="collection-note">
            Prices and availability come from the store. Final totals are
            confirmed at checkout.
          </p>
        </section>
      </div>
    </main>
  );
}
