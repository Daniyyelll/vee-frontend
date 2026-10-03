import { render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { SessionProvider } from "../auth/Session";
import { ApiError } from "../api/client";
import { storeApi } from "../api/store";
import type { CheckoutOrder, OrderQuote, Product } from "../api/store";
import { CheckoutPage, OrderConfirmation } from "./CheckoutPage";
import { saveReceipt } from "./receipt";
import { estimatedDeliveryDate } from "./deliveryDate";

afterEach(() => vi.restoreAllMocks());

const product: Product = {
  id: "2d117087-908b-4c2b-a05f-72a4e921cadd",
  productSlug: "lip-balm",
  categoryId: "cat",
  productName: "Lip Balm",
  description: null,
  price: "170.00",
  currency: "EGP",
  stockQuantity: 5,
  imageUrl: null,
};
const quote: OrderQuote = {
  items: [
    {
      productId: product.id,
      productName: product.productName,
      quantity: 2,
      unitPrice: "170.00",
      subtotal: "340.00",
    },
  ],
  subtotalPrice: "340.00",
  shippingFee: "50.00",
  discountAmount: "34.00",
  totalPrice: "356.00",
  couponCode: "TENOFF",
  currency: "EGP",
};
const order: CheckoutOrder = {
  orderNumber: 42,
  totalPrice: quote.totalPrice,
  currency: "EGP",
  recipientName: "Vee Buyer",
  recipientPhone: "01012345678",
  shippingAddress: "12 Garden Street, Cairo",
  deliveryArea: "New Cairo",
  guestEmail: "buyer@example.com",
  user: null,
  receiptToken: "a".repeat(64),
};

it("restores the confirmation after a reload using the tab's receipt reference", async () => {
  sessionStorage.clear();
  saveReceipt(order);
  const fetchReceipt = vi
    .spyOn(storeApi, "orderReceipt")
    .mockResolvedValue(order);

  render(<OrderConfirmation order={null} />);

  expect(await screen.findByText("#42")).toBeTruthy();
  expect(fetchReceipt).toHaveBeenCalledWith(42, order.receiptToken);
  expect(sessionStorage.getItem("vee-order-receipt")).not.toContain(
    order.shippingAddress,
  );
  sessionStorage.clear();
});

it("quotes the guest bag and submits the displayed total with delivery details", async () => {
  const guestQuote = vi.spyOn(storeApi, "guestQuote").mockResolvedValue(quote);
  const guestCheckout = vi
    .spyOn(storeApi, "guestCheckout")
    .mockResolvedValue(order);
  const onPlaced = vi.fn();
  const user = userEvent.setup();
  render(
    <SessionProvider>
      <CheckoutPage
        bag={{ [product.id]: 2 }}
        setBag={vi.fn()}
        products={[product]}
        onPlaced={onPlaced}
      />
    </SessionProvider>,
  );

  expect(
    screen
      .getByRole("button", { name: /Checkout as guest/ })
      .getAttribute("aria-pressed"),
  ).toBe("true");
  await waitFor(() =>
    expect(guestQuote).toHaveBeenCalledWith(
      [{ productId: product.id, quantity: 2 }],
      null,
    ),
  );
  expect(screen.getByText(/356.00/)).toBeTruthy();
  await user.type(screen.getByLabelText("Name"), "Vee Buyer");
  await user.type(screen.getByLabelText("Email"), "buyer@example.com");
  await user.type(screen.getByLabelText("Phone number"), "01012345678");
  await user.selectOptions(screen.getByLabelText("Delivery area"), "New Cairo");
  await user.type(
    screen.getByLabelText("Delivery address"),
    "12 Garden Street, Cairo",
  );
  await user.click(screen.getByRole("button", { name: /Place order/ }));
  await waitFor(() => expect(guestCheckout).toHaveBeenCalledOnce());
  expect(guestCheckout.mock.calls[0][0]).toMatchObject({
    name: "Vee Buyer",
    email: "buyer@example.com",
    phone: "01012345678",
    shippingAddress: "12 Garden Street, Cairo",
    deliveryArea: "New Cairo",
    expectedTotal: "356.00",
    items: [{ productId: product.id, quantity: 2 }],
  });
  expect(guestCheckout.mock.calls[0][1]).toHaveLength(36);
  expect(onPlaced).toHaveBeenCalledWith(order);
});

it("merges a signed-in shopper's local selection into the saved cart before quoting", async () => {
  const buyer = {
    id: "buyer",
    name: "Buyer",
    email: "buyer@example.com",
    role: "customer" as const,
    active: true,
    address: "Cairo",
    phone: "01012345678",
  };
  vi.spyOn(storeApi, "login").mockResolvedValue({
    token: "token",
    token_type: "bearer",
    user: buyer,
  });
  vi.spyOn(storeApi, "me").mockResolvedValue(buyer);
  vi.spyOn(storeApi, "cart").mockResolvedValue({
    items: [{ productId: product.id, quantity: 1 }],
  });
  const update = vi
    .spyOn(storeApi, "updateCartItem")
    .mockResolvedValue({ items: [{ productId: product.id, quantity: 2 }] });
  const cartQuote = vi.spyOn(storeApi, "cartQuote").mockResolvedValue(quote);
  const user = userEvent.setup();
  render(
    <SessionProvider>
      <CheckoutPage
        bag={{ [product.id]: 2 }}
        setBag={vi.fn()}
        products={[product]}
        onPlaced={vi.fn()}
      />
    </SessionProvider>,
  );
  await user.click(screen.getByRole("button", { name: /Sign in to checkout/ }));
  const signin = within(
    screen.getByRole("form", { name: "Sign in to your account" }),
  );
  await user.type(signin.getByLabelText("Email"), buyer.email);
  await user.type(signin.getByLabelText("Password"), "example-password");
  await user.click(signin.getByRole("button", { name: "Sign in" }));
  await waitFor(() => expect(cartQuote).toHaveBeenCalledWith("token", null));
  expect(update).toHaveBeenCalledWith("token", product.id, 2);
  expect(
    screen.getByText(/Order confirmation will be sent to buyer@example.com/),
  ).toBeTruthy();
  expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe(
    "Buyer",
  );
  expect((screen.getByLabelText("Email") as HTMLInputElement).value).toBe(
    buyer.email,
  );
  expect(
    (screen.getByLabelText("Phone number") as HTMLInputElement).value,
  ).toBe(buyer.phone);
  expect(
    (screen.getByLabelText("Delivery address") as HTMLTextAreaElement).value,
  ).toBe(buyer.address);
});

it("does not restore a saved-cart item after the shopper removes it", async () => {
  const buyer = {
    id: "buyer",
    name: "Buyer",
    email: "buyer@example.com",
    role: "customer" as const,
    active: true,
    address: "Cairo",
    phone: "01012345678",
  };
  vi.spyOn(storeApi, "login").mockResolvedValue({
    token: "token",
    token_type: "bearer",
    user: buyer,
  });
  vi.spyOn(storeApi, "me").mockResolvedValue(buyer);
  let savedQuantity = 2;
  vi.spyOn(storeApi, "cart").mockImplementation(async () => ({
    items: savedQuantity
      ? [{ productId: product.id, quantity: savedQuantity }]
      : [],
  }));
  const add = vi.spyOn(storeApi, "addCartItem");
  vi.spyOn(storeApi, "updateCartItem").mockImplementation(
    async (_token, _id, quantity) => {
      savedQuantity = quantity;
      return { items: [{ productId: product.id, quantity }] };
    },
  );
  vi.spyOn(storeApi, "removeCartItem").mockImplementation(async () => {
    savedQuantity = 0;
    return { items: [] };
  });
  vi.spyOn(storeApi, "cartQuote").mockImplementation(async () => {
    if (!savedQuantity) throw new ApiError("Your cart is empty.", 400);
    return {
      ...quote,
      items: [{ ...quote.items[0], quantity: savedQuantity }],
    };
  });
  function Harness() {
    const [bag, setBag] = useState({ [product.id]: 2 });
    return (
      <CheckoutPage
        bag={bag}
        setBag={setBag}
        products={[product]}
        onPlaced={vi.fn()}
      />
    );
  }
  const user = userEvent.setup();
  render(
    <SessionProvider>
      <Harness />
    </SessionProvider>,
  );
  await user.click(screen.getByRole("button", { name: /Sign in to checkout/ }));
  const signin = within(
    screen.getByRole("form", { name: "Sign in to your account" }),
  );
  await user.type(signin.getByLabelText("Email"), buyer.email);
  await user.type(signin.getByLabelText("Password"), "example-password");
  await user.click(signin.getByRole("button", { name: "Sign in" }));
  const decrease = () =>
    screen.getByRole("button", { name: "Decrease Lip Balm quantity" });
  await waitFor(() => expect(decrease().hasAttribute("disabled")).toBe(false));
  await user.click(decrease());
  await waitFor(() => expect(savedQuantity).toBe(1));
  await waitFor(() => expect(decrease().hasAttribute("disabled")).toBe(false));
  await user.click(decrease());
  await waitFor(() => expect(savedQuantity).toBe(0));
  expect(await screen.findByText("Your bag is waiting.")).toBeTruthy();
  expect(add).not.toHaveBeenCalled();
});

it("keeps a usable total and explains a coupon that does not exist", async () => {
  const guestQuote = vi
    .spyOn(storeApi, "guestQuote")
    .mockImplementation(async (_items, code) => {
      if (code) throw new ApiError("Coupon does not exist.", 404);
      return {
        ...quote,
        couponCode: null,
        discountAmount: "0.00",
        totalPrice: "390.00",
      };
    });
  const user = userEvent.setup();
  render(
    <SessionProvider>
      <CheckoutPage
        bag={{ [product.id]: 2 }}
        setBag={vi.fn()}
        products={[product]}
        onPlaced={vi.fn()}
      />
    </SessionProvider>,
  );
  await screen.findByText(/390.00/);
  await user.type(screen.getByLabelText("Have a coupon?"), "MISSING");
  await user.click(screen.getByRole("button", { name: "Apply" }));
  expect(await screen.findByText("Coupon does not exist.")).toBeTruthy();
  await waitFor(() =>
    expect(guestQuote).toHaveBeenCalledWith(
      [{ productId: product.id, quantity: 2 }],
      null,
    ),
  );
  expect(screen.getByText(/390.00/)).toBeTruthy();
  expect(
    screen
      .getByRole("button", { name: /Place order/ })
      .hasAttribute("disabled"),
  ).toBe(false);
});

it("shows field-specific errors when required delivery details are empty", async () => {
  vi.spyOn(storeApi, "guestQuote").mockResolvedValue(quote);
  const user = userEvent.setup();
  render(
    <SessionProvider>
      <CheckoutPage
        bag={{ [product.id]: 2 }}
        setBag={vi.fn()}
        products={[product]}
        onPlaced={vi.fn()}
      />
    </SessionProvider>,
  );
  await screen.findByText(/356.00/);
  await user.click(screen.getByRole("button", { name: /Place order/ }));
  expect(screen.getByText("Enter your full name.")).toBeTruthy();
  expect(screen.getByText("Enter your email address.")).toBeTruthy();
  expect(
    screen.getByText(
      "Enter a phone number so we can contact you for delivery.",
    ),
  ).toBeTruthy();
  expect(screen.getByText("Choose a delivery area.")).toBeTruthy();
  expect(screen.getByText("Enter your delivery address.")).toBeTruthy();
});

it("accepts a typed cart quantity and requotes the order", async () => {
  const guestQuote = vi
    .spyOn(storeApi, "guestQuote")
    .mockImplementation(async (items) => ({
      ...quote,
      items: [{ ...quote.items[0], quantity: items[0].quantity }],
    }));
  function Harness() {
    const [bag, setBag] = useState({ [product.id]: 2 });
    return (
      <CheckoutPage
        bag={bag}
        setBag={setBag}
        products={[product]}
        onPlaced={vi.fn()}
      />
    );
  }
  const user = userEvent.setup();
  render(
    <SessionProvider>
      <Harness />
    </SessionProvider>,
  );
  await screen.findByText(/356.00/);
  const quantity = screen.getByRole("textbox", { name: "Lip Balm quantity" });
  await user.clear(quantity);
  await user.type(quantity, "3{Enter}");
  await waitFor(() =>
    expect(guestQuote).toHaveBeenCalledWith(
      [{ productId: product.id, quantity: 3 }],
      null,
    ),
  );
  expect((quantity as HTMLInputElement).value).toBe("3");
});

it("counts only Sunday through Thursday for the delivery estimate", () => {
  expect(estimatedDeliveryDate(new Date(2026, 9, 1)).toDateString()).toBe(
    new Date(2026, 9, 5).toDateString(),
  );
  expect(estimatedDeliveryDate(new Date(2026, 9, 4)).toDateString()).toBe(
    new Date(2026, 9, 6).toDateString(),
  );
});
