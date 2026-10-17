import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import type { Product } from "../api/store";
import ProductGallery from "./ProductGallery";

const product: Product = {
  id: "balm",
  productSlug: "balm",
  categoryId: "lips",
  productName: "Balm",
  description: null,
  price: "170.00",
  currency: "EGP",
  stockQuantity: 3,
  imageUrl: "/front.jpg",
  imageUrls: ["/front.jpg", "/back.jpg", "/side.jpg"],
};

it("browses all photos with thumbnails and wrapping previous/next controls", async () => {
  const user = userEvent.setup();
  render(<ProductGallery product={product} />);
  expect(
    new URL(
      screen.getByRole("img", { name: "Balm — photo 1" }).getAttribute("src")!,
      window.location.origin,
    ).pathname,
  ).toBe("/front.jpg");
  await user.click(screen.getByRole("button", { name: "Next photo" }));
  expect(screen.getByText("Photo 2 of 3")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Show photo 3" }));
  expect(
    new URL(
      screen.getByRole("img", { name: "Balm — photo 3" }).getAttribute("src")!,
      window.location.origin,
    ).pathname,
  ).toBe("/side.jpg");
  await user.click(screen.getByRole("button", { name: "Next photo" }));
  expect(screen.getByText("Photo 1 of 3")).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Previous photo" }));
  expect(screen.getByText("Photo 3 of 3")).toBeTruthy();
});

it("supports horizontal swipes while ignoring vertical page scrolling", () => {
  const { container } = render(<ProductGallery product={product} />);
  const frame = container.querySelector(".product-gallery-frame")!;
  fireEvent.touchStart(frame, { touches: [{ clientX: 200, clientY: 100 }] });
  fireEvent.touchEnd(frame, {
    changedTouches: [{ clientX: 100, clientY: 110 }],
  });
  expect(screen.getByText("Photo 2 of 3")).toBeTruthy();
  fireEvent.touchStart(frame, { touches: [{ clientX: 200, clientY: 100 }] });
  fireEvent.touchEnd(frame, {
    changedTouches: [{ clientX: 190, clientY: 200 }],
  });
  expect(screen.getByText("Photo 2 of 3")).toBeTruthy();
});

it("keeps legacy single photos and missing/broken photos usable", () => {
  const { rerender } = render(
    <ProductGallery product={{ ...product, imageUrls: undefined }} />,
  );
  expect(screen.queryByRole("button", { name: "Next photo" })).toBeNull();
  fireEvent.error(screen.getByRole("img", { name: "Balm" }));
  expect(
    screen.getByRole("img", { name: "Balm. Image unavailable." }),
  ).toBeTruthy();
  rerender(
    <ProductGallery product={{ ...product, imageUrl: null, imageUrls: [] }} />,
  );
  expect(screen.getByText("Image unavailable")).toBeTruthy();
});
