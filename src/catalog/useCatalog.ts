import { useEffect, useState } from "react";
import { messageOf } from "../api/client";
import { storeApi } from "../api/store";
import type { Category, Product } from "../api/store";

export function useCatalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    Promise.all([
      storeApi.products(controller.signal),
      storeApi.categories(controller.signal),
    ])
      .then(([items, groups]) => {
        if (!controller.signal.aborted) {
          setProducts(items);
          setCategories(groups);
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(messageOf(cause));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [reload]);
  return {
    products,
    categories,
    loading,
    error,
    retry: () => setReload((value) => value + 1),
  };
}
