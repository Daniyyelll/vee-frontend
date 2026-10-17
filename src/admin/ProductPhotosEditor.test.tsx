import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { adminApi } from "../api/admin";
import type { Product } from "../api/store";
import ProductPhotosEditor from "./ProductPhotosEditor";

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
  imageUrls: ["/front.jpg", "/back.jpg"],
};

function Editor({ initial = product }: { initial?: Product }) {
  const [current, setCurrent] = useState(initial);
  return (
    <ProductPhotosEditor
      token="admin-token"
      product={current}
      onUpdated={setCurrent}
    />
  );
}

afterEach(() => vi.restoreAllMocks());

it("uploads several photos with the admin token and updates the editor", async () => {
  const upload = vi.spyOn(adminApi, "addProductPhotos").mockResolvedValue({
    ...product,
    imageUrls: [...product.imageUrls!, "/side.jpg", "/top.jpg"],
  });
  render(<Editor />);
  const user = userEvent.setup();
  const files = [
    new File(["side"], "side.jpg", { type: "image/jpeg" }),
    new File(["top"], "top.jpg", { type: "image/jpeg" }),
  ];
  await user.upload(screen.getByLabelText("Add photos"), files);
  fireEvent.submit(screen.getByLabelText("Add photos").closest("form")!);
  await waitFor(() => expect(screen.getByText("Photos added.")).toBeTruthy());
  expect(upload.mock.calls[0].slice(0, 2)).toEqual(["admin-token", "balm"]);
  expect(upload.mock.calls[0][2].getAll("imageFiles")).toEqual(files);
  expect(screen.getByRole("img", { name: "Balm — photo 4" })).toBeTruthy();
});

it("changes the cover and removes a photo while preserving one photo", async () => {
  const cover = vi.spyOn(adminApi, "setProductCover").mockResolvedValue({
    ...product,
    imageUrl: "/back.jpg",
    imageUrls: ["/back.jpg", "/front.jpg"],
  });
  const remove = vi.spyOn(adminApi, "removeProductPhoto").mockResolvedValue({
    ...product,
    imageUrl: "/back.jpg",
    imageUrls: ["/back.jpg"],
  });
  render(<Editor />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Use as cover" }));
  await waitFor(() => expect(screen.getByText("Cover updated.")).toBeTruthy());
  expect(cover).toHaveBeenCalledWith("admin-token", "balm", "/back.jpg");
  await user.click(screen.getByRole("button", { name: "Remove photo 2" }));
  await waitFor(() => expect(screen.getByText("Photo removed.")).toBeTruthy());
  expect(remove).toHaveBeenCalledWith("admin-token", "balm", "/front.jpg");
  expect(screen.getByRole("button", { name: "Remove photo 1" })).toHaveProperty(
    "disabled",
    true,
  );
});

it("rejects an oversized batch before making a request", async () => {
  const upload = vi.spyOn(adminApi, "addProductPhotos");
  render(<Editor />);
  const user = userEvent.setup();
  await user.upload(
    screen.getByLabelText("Add photos"),
    new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.jpg", {
      type: "image/jpeg",
    }),
  );
  fireEvent.submit(screen.getByLabelText("Add photos").closest("form")!);
  expect(screen.getByRole("alert").textContent).toContain("5 MB");
  expect(upload).not.toHaveBeenCalled();
});
