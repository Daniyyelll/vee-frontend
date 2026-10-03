import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import type { Category, Product } from "../api/store";
import CollectionPage from "./CollectionPage";

const categories: Category[] = [
  { id: "lips", categoryName: "Lip Care", description: null },
  { id: "skin", categoryName: "Skin Care", description: null },
];
const products: Product[] = [
  {
    id: "lip",
    productSlug: "lip-balm",
    categoryId: "lips",
    productName: "Lip Balm",
    description: null,
    price: "170.00",
    currency: "EGP",
    stockQuantity: 3,
    imageUrl: null,
  },
  {
    id: "cream",
    productSlug: "face-cream",
    categoryId: "skin",
    productName: "Face Cream",
    description: null,
    price: "250.00",
    currency: "EGP",
    stockQuantity: 0,
    imageUrl: null,
  },
];

afterEach(() => {
  window.history.replaceState({}, "", "/");
});

it("filters the live catalog by category and restores selection from the URL", async () => {
  window.history.replaceState({}, "", "/collection");
  const add = vi.fn();
  const open = vi.fn();
  const user = userEvent.setup();
  render(
    <CollectionPage
      categories={categories}
      products={products}
      loading={false}
      error=""
      retry={vi.fn()}
      bag={{}}
      onOpen={open}
      onAdd={add}
    />,
  );

  expect(screen.getByRole("button", { name: "View Lip Balm" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "View Face Cream" })).toBeTruthy();
  await user.click(screen.getByRole("button", { name: /Lip Care/ }));
  expect(window.location.search).toBe("?category=lips");
  expect(screen.queryByRole("button", { name: "View Face Cream" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "Add Lip Balm to bag" }));
  expect(add).toHaveBeenCalledWith(products[0]);

  window.history.replaceState({}, "", "/collection?category=skin");
  fireEvent.popState(window);
  expect(screen.getByRole("button", { name: "View Face Cream" })).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Add Face Cream to bag" }),
  ).toHaveProperty("disabled", true);
});
