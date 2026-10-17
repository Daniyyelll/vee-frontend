import { useState } from "react";
import type { FormEvent } from "react";
import { adminApi } from "../api/admin";
import { messageOf } from "../api/client";
import type { Product } from "../api/store";
import ProductImage from "../components/ProductImage";
import { productPhotos } from "../components/ProductGallery";

export function validateProductPhotos(files: File[], existing = 0) {
  if (!files.length) throw new Error("Choose at least one product photo.");
  if (files.length + existing > 10)
    throw new Error("A product can have at most 10 photos.");
  if (files.reduce((size, file) => size + file.size, 0) > 5 * 1024 * 1024)
    throw new Error("Photos must total 5 MB or smaller per upload.");
}

export default function ProductPhotosEditor({
  token,
  product,
  onUpdated,
}: {
  token: string;
  product: Product;
  onUpdated: (product: Product) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const photos = productPhotos(product);
  async function mutate(action: () => Promise<Product>, message: string) {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      onUpdated(await action());
      setSuccess(message);
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }
  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.elements.namedItem("imageFiles") as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    try {
      validateProductPhotos(files, photos.length);
    } catch (cause) {
      setError(messageOf(cause));
      return;
    }
    const data = new FormData();
    files.forEach((file) => data.append("imageFiles", file));
    await mutate(async () => {
      const updated = await adminApi.addProductPhotos(
        token,
        product.productSlug,
        data,
      );
      form.reset();
      return updated;
    }, "Photos added.");
  }
  return (
    <section className="admin-product-photos" aria-label="Product photos">
      <h3>Product photos</h3>
      <p className="admin-muted">
        The cover appears in the collection and bag. Photo changes save
        immediately.
      </p>
      {error && (
        <p className="admin-alert" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="admin-success" role="status">
          {success}
        </p>
      )}
      <div className="admin-product-photo-list">
        {photos.map((url, index) => (
          <div key={url}>
            <ProductImage
              src={url}
              alt={`${product.productName} — photo ${index + 1}`}
            />
            <button
              type="button"
              className="admin-secondary"
              disabled={busy || index === 0}
              onClick={() =>
                void mutate(
                  () =>
                    adminApi.setProductCover(token, product.productSlug, url),
                  "Cover updated.",
                )
              }
            >
              {index === 0 ? "Cover photo" : "Use as cover"}
            </button>
            <button
              type="button"
              className="admin-secondary"
              aria-label={`Remove photo ${index + 1}`}
              disabled={busy || photos.length === 1}
              onClick={() =>
                void mutate(
                  () =>
                    adminApi.removeProductPhoto(
                      token,
                      product.productSlug,
                      url,
                    ),
                  "Photo removed.",
                )
              }
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <form onSubmit={upload}>
        <label>
          Add photos
          <input
            name="imageFiles"
            type="file"
            multiple
            required
            accept="image/png,image/jpeg,image/webp"
            disabled={busy || photos.length >= 10}
          />
        </label>
        <p className="admin-muted">
          Up to 10 photos per product. PNG, JPEG, or WebP. Up to 5 MB total per
          upload.
        </p>
        <button
          className="admin-primary"
          disabled={busy || photos.length >= 10}
        >
          {busy ? "Saving photos…" : "Upload photos"}
        </button>
      </form>
    </section>
  );
}
