import { useEffect, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { ExternalLink, ImagePlus } from "lucide-react";
import { messageOf } from "../api/client";
import { fallbackLandingImages, landingApi } from "../api/landing";
import type { LandingImage, LandingSlot } from "../api/landing";

const slots: { id: LandingSlot; title: string; note: string }[] = [
  {
    id: "hero",
    title: "Hero image",
    note: "The first image visitors see. Keep the main subject clear at both wide and narrow sizes.",
  },
  {
    id: "ritual",
    title: "Ritual image",
    note: "The image beside the philosophy story. Check that its focal point holds on mobile.",
  },
];

function ImageEditor({
  token,
  image,
  onPublished,
}: {
  token: string;
  image: LandingImage;
  onPublished: (image: LandingImage) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [altText, setAltText] = useState(image.altText);
  const [caption, setCaption] = useState(image.caption);
  const [focalX, setFocalX] = useState(image.focalX);
  const [focalY, setFocalY] = useState(image.focalY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const slot = slots.find((item) => item.id === image.slot)!;
  const source = preview || image.imageUrl;
  const focus = `${focalX}% ${focalY}%`;
  const dirty =
    Boolean(file) ||
    altText !== image.altText ||
    caption !== image.caption ||
    focalX !== image.focalX ||
    focalY !== image.focalY;

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;
    setError("");
    setSuccess("");
    if (
      selected &&
      (!["image/png", "image/jpeg", "image/webp"].includes(selected.type) ||
        selected.size > 5 * 1024 * 1024)
    ) {
      setError("Choose a PNG, JPEG, or WebP image no larger than 5 MB.");
      event.target.value = "";
      setFile(null);
      return;
    }
    setFile(selected);
    if (
      selected &&
      caption === "Visual concept. Products shown are illustrative."
    ) {
      setCaption("");
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!dirty) return;
    const data = new FormData();
    data.set("altText", altText.trim());
    data.set("caption", caption.trim());
    data.set("focalX", String(focalX));
    data.set("focalY", String(focalY));
    if (file) data.set("imageFile", file);
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const published = await landingApi.publish(token, image.slot, data);
      onPublished(published);
      setFile(null);
      setSuccess(
        `${slot.title} published. The storefront now uses this image.`,
      );
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      className="admin-landing-editor admin-editor"
      onSubmit={save}
      aria-busy={busy}
    >
      <div className="admin-landing-heading">
        <div>
          <h2>{slot.title}</h2>
          <p className="admin-muted">{slot.note}</p>
        </div>
        <a href="/" target="_blank" rel="noopener noreferrer">
          View storefront <ExternalLink size={14} aria-hidden="true" />
        </a>
      </div>
      <div className="admin-landing-layout">
        <div className="admin-landing-previews">
          <figure>
            <div className="admin-landing-frame admin-landing-desktop">
              <img src={source} alt="" style={{ objectPosition: focus }} />
            </div>
            <figcaption>Desktop crop</figcaption>
          </figure>
          <figure>
            <div className="admin-landing-frame admin-landing-mobile">
              <img src={source} alt="" style={{ objectPosition: focus }} />
            </div>
            <figcaption>Mobile crop</figcaption>
          </figure>
        </div>
        <div className="admin-landing-controls admin-form-grid">
          <label className="admin-field-wide">
            Replace image{" "}
            <span className="admin-optional">
              PNG, JPEG, or WebP · up to 5 MB · at least 640 × 640 px
            </span>
            <span className="admin-landing-file">
              <ImagePlus size={18} aria-hidden="true" /> Choose image
            </span>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={chooseFile}
              disabled={busy}
            />
            {file && (
              <span className="admin-landing-filename">{file.name}</span>
            )}
          </label>
          <label className="admin-field-wide">
            Image description{" "}
            <span className="admin-optional">
              Required for screen reader users
            </span>
            <textarea
              value={altText}
              onChange={(event) => setAltText(event.target.value)}
              maxLength={240}
              rows={3}
              required
              disabled={busy}
            />
          </label>
          <label className="admin-field-wide">
            Caption{" "}
            <span className="admin-optional">
              Optional; shown under the image
            </span>
            <input
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              maxLength={300}
              disabled={busy}
            />
          </label>
          <label>
            Horizontal focus <span>{focalX}%</span>
            <input
              type="range"
              min="0"
              max="100"
              value={focalX}
              onChange={(event) => setFocalX(Number(event.target.value))}
              disabled={busy}
            />
          </label>
          <label>
            Vertical focus <span>{focalY}%</span>
            <input
              type="range"
              min="0"
              max="100"
              value={focalY}
              onChange={(event) => setFocalY(Number(event.target.value))}
              disabled={busy}
            />
          </label>
          <div className="admin-field-wide">
            <button
              className="admin-primary"
              type="submit"
              disabled={busy || !dirty || !altText.trim()}
            >
              {busy ? "Publishing…" : "Save and publish"}
            </button>
            <p className="admin-muted">
              Saving makes this image live immediately.
            </p>
          </div>
        </div>
      </div>
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
    </form>
  );
}

export default function LandingImagesSection({ token }: { token: string }) {
  const [images, setImages] = useState<Record<LandingSlot, LandingImage>>(
    fallbackLandingImages,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    landingApi
      .list(controller.signal)
      .then((items) => {
        setImages({
          hero:
            items.find((item) => item.slot === "hero") ??
            fallbackLandingImages.hero,
          ritual:
            items.find((item) => item.slot === "ritual") ??
            fallbackLandingImages.ritual,
        });
        setError("");
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(messageOf(cause));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  return (
    <>
      <div className="admin-heading">
        <div>
          <h1>Landing images</h1>
          <p>
            Replace the two storefront photographs. Preview both crops before
            publishing.
          </p>
        </div>
      </div>
      {loading && (
        <p className="admin-muted" role="status">
          Loading current images…
        </p>
      )}
      {error && (
        <p className="admin-alert" role="alert">
          Current images could not be loaded: {error}
        </p>
      )}
      {!loading &&
        !error &&
        slots.map((slot) => (
          <ImageEditor
            key={slot.id}
            token={token}
            image={images[slot.id]}
            onPublished={(image) =>
              setImages((current) => ({ ...current, [image.slot]: image }))
            }
          />
        ))}
    </>
  );
}
