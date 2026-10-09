import { imageUrl, request } from "./client";

export type LandingSlot = "hero" | "ritual";
export type LandingImage = {
  slot: LandingSlot;
  imageUrl: string;
  smallImageUrl: string;
  altText: string;
  caption: string;
  focalX: number;
  focalY: number;
};

export const fallbackLandingImages: Record<LandingSlot, LandingImage> = {
  hero: {
    slot: "hero",
    imageUrl: "/images/vee-atelier.webp",
    smallImageUrl: "/images/vee-atelier-640.webp",
    altText:
      "Vee concept cosmetics in soft peach-blush and rose gold, arranged on sunlit natural stone",
    caption: "Visual concept. Products shown are illustrative.",
    focalX: 50,
    focalY: 54,
  },
  ritual: {
    slot: "ritual",
    imageUrl: "/images/stone-ritual.webp",
    smallImageUrl: "/images/stone-ritual-640.webp",
    altText:
      "Ivory and amber concept cosmetics on natural limestone, surrounded by dried botanicals",
    caption: "Visual concept. Products shown are illustrative.",
    focalX: 50,
    focalY: 58,
  },
};

export function landingImageUrl(value: string): string | null {
  if (value.startsWith("/images/")) return value;
  return imageUrl(value);
}

export const landingApi = {
  list: (signal?: AbortSignal) =>
    request<LandingImage[]>("/landing-images", { signal }),
  publish: (token: string, slot: LandingSlot, data: FormData) =>
    request<LandingImage>(`/landing-images/${slot}`, {
      method: "PATCH",
      token,
      body: data,
      timeoutMs: 60000,
    }),
};
