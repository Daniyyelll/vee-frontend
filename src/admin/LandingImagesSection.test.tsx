import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { fallbackLandingImages, landingApi } from "../api/landing";
import LandingImagesSection from "./LandingImagesSection";

afterEach(() => {
  vi.restoreAllMocks();
});

it("previews a replacement and publishes the selected slot with accessible text", async () => {
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: vi.fn(() => "blob:preview"),
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: vi.fn(),
  });
  vi.spyOn(landingApi, "list").mockResolvedValue(
    Object.values(fallbackLandingImages),
  );
  const published = {
    ...fallbackLandingImages.hero,
    imageUrl: "https://example.test/hero.webp",
    smallImageUrl: "https://example.test/hero-640.webp",
    altText: "Amber cosmetics on stone",
    caption: "",
  };
  const publish = vi.spyOn(landingApi, "publish").mockResolvedValue(published);

  render(<LandingImagesSection token="admin-token" />);
  await screen.findByRole("heading", { name: "Hero image" });
  const file = new File(["image"], "hero.webp", { type: "image/webp" });
  fireEvent.change(screen.getAllByLabelText(/Replace image/)[0], {
    target: { files: [file] },
  });
  expect(screen.getByText("hero.webp")).toBeTruthy();
  expect(
    (screen.getAllByLabelText(/Caption/)[0] as HTMLInputElement).value,
  ).toBe("");
  fireEvent.change(screen.getAllByLabelText(/Image description/)[0], {
    target: { value: "Amber cosmetics on stone" },
  });
  await userEvent
    .setup()
    .click(screen.getAllByRole("button", { name: "Save and publish" })[0]);

  await waitFor(() => expect(publish).toHaveBeenCalledTimes(1));
  const [token, slot, data] = publish.mock.calls[0];
  expect(token).toBe("admin-token");
  expect(slot).toBe("hero");
  expect(data.get("imageFile")).toBe(file);
  expect(data.get("altText")).toBe("Amber cosmetics on stone");
  expect(data.get("caption")).toBe("");
  expect(screen.getByText(/Hero image published/)).toBeTruthy();
});
