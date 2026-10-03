import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import App from "./App";

const productId = "11111111-1111-4111-8111-111111111111";

vi.mock("./catalog/useCatalog", () => ({
  useCatalog: () => ({
    products: [
      {
        id: productId,
        productSlug: "lip-balm",
        categoryId: "lips",
        productName: "Lip Balm",
        description: null,
        price: "170.00",
        currency: "EGP",
        stockQuantity: 5,
        imageUrl: null,
      },
    ],
    categories: [{ id: "lips", categoryName: "Lip Care", description: null }],
    loading: false,
    error: "",
    retry: vi.fn(),
  }),
}));

vi.mock("./auth/Session", () => ({
  useSession: () => ({ user: null, token: null }),
}));

beforeEach(() => {
  window.history.replaceState({}, "", "/collection");
  vi.stubGlobal("scrollY", 0);
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute("open");
  };
});

afterEach(() => {
  sessionStorage.clear();
  window.history.replaceState({}, "", "/");
  vi.unstubAllGlobals();
});

it("opens the bag as a right drawer and closes it without losing the bag", async () => {
  sessionStorage.setItem("vee-bag", JSON.stringify({ [productId]: 2 }));
  const user = userEvent.setup();
  render(<App />);

  const bagButton = screen.getByRole("button", { name: "Open bag, 2 items" });
  await user.click(bagButton);
  const dialog = screen.getByRole("dialog");
  expect(dialog.classList.contains("bag-dialog")).toBe(true);
  expect(bagButton.getAttribute("aria-expanded")).toBe("true");
  expect(
    screen.getByRole("textbox", { name: "Lip Balm quantity" }),
  ).toHaveProperty("value", "2");
  expect(screen.getByRole("link", { name: /Checkout/ })).toBeTruthy();
  expect(
    screen.getByText("Estimated items subtotal").parentElement?.textContent,
  ).toContain("340.00");

  await user.click(screen.getByRole("button", { name: "Close panel" }));
  await waitFor(() => expect(dialog.hasAttribute("open")).toBe(false));
  expect(bagButton.getAttribute("aria-expanded")).toBe("false");
  expect(sessionStorage.getItem("vee-bag")).toContain(productId);
});

it("puts the collection after the hero and presents newsletter signup as a preview", () => {
  window.history.replaceState({}, "", "/");
  render(<App />);
  const sections = Array.from(
    screen.getByRole("main").querySelectorAll("section"),
  );
  expect(sections[0].classList.contains("hero")).toBe(true);
  expect(sections[1].id).toBe("collection");
  expect(sections[2].id).toBe("philosophy");
  expect(screen.getAllByText(/Products shown are illustrative/)).toHaveLength(
    2,
  );
  expect(screen.queryByLabelText("Your email address")).toBeNull();
  expect(screen.getByText(/Sign-up is not open yet/)).toBeTruthy();
});

it("hides the header on downward scroll and reveals it on upward scroll", () => {
  const { container } = render(<App />);
  const header = container.querySelector(".site-header")!;
  vi.stubGlobal("scrollY", 180);
  fireEvent.scroll(window);
  expect(header.classList.contains("header-hidden")).toBe(true);

  vi.stubGlobal("scrollY", 120);
  fireEvent.scroll(window);
  expect(header.classList.contains("header-hidden")).toBe(false);
});
