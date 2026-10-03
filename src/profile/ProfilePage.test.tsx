import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { SessionProvider } from "../auth/Session";
import { storeApi } from "../api/store";
import ProfilePage from "./ProfilePage";

afterEach(() => vi.restoreAllMocks());

const buyer = {
  id: "buyer",
  name: "Vee Buyer",
  email: "buyer@example.com",
  role: "customer" as const,
  active: true,
  address: "12 Garden Street",
  phone: "01012345678",
};

it("shows a signed-in shopper's orders and saves edited profile details", async () => {
  vi.spyOn(storeApi, "login").mockResolvedValue({
    token: "token",
    token_type: "bearer",
    user: buyer,
  });
  vi.spyOn(storeApi, "me").mockResolvedValue(buyer);
  const orders = vi.spyOn(storeApi, "myOrders").mockResolvedValue([
    {
      id: "order-1",
      orderNumber: 42,
      totalPrice: "390.00",
      currency: "EGP",
      status: "processing",
      createdAt: "2026-10-01T12:00:00Z",
      shippingAddress: "12 Garden Street",
      deliveryArea: "Cairo",
      items: [
        {
          id: "item-1",
          productName: "Lip Balm",
          quantity: 2,
          subtotal: "340.00",
        },
      ],
    },
  ]);
  const update = vi.spyOn(storeApi, "updateProfile").mockResolvedValue({
    ...buyer,
    address: "14 Garden Street",
  });
  const user = userEvent.setup();
  render(
    <SessionProvider>
      <ProfilePage />
    </SessionProvider>,
  );
  expect(orders).not.toHaveBeenCalled();
  await user.type(screen.getByLabelText("Email address"), buyer.email);
  await user.type(
    screen.getByLabelText("Password", { exact: true }),
    "example-password",
  );
  await user.click(screen.getByRole("button", { name: "Sign in" }));

  expect(await screen.findByText("Order #42")).toBeTruthy();
  expect(screen.getByText("Lip Balm")).toBeTruthy();
  expect(orders).toHaveBeenCalledWith("token", 10, 0, expect.any(AbortSignal));
  expect((screen.getByLabelText("Name") as HTMLInputElement).value).toBe(
    buyer.name,
  );
  expect((screen.getByLabelText("Address") as HTMLTextAreaElement).value).toBe(
    buyer.address,
  );

  await user.clear(screen.getByLabelText("Address"));
  await user.type(screen.getByLabelText("Address"), "14 Garden Street");
  await user.click(screen.getByRole("button", { name: "Save your details" }));
  await waitFor(() =>
    expect(update).toHaveBeenCalledWith(
      "token",
      buyer.name,
      "14 Garden Street",
      buyer.phone,
    ),
  );
  expect(
    await screen.findByText("Your details have been updated."),
  ).toBeTruthy();
});

it("shows a recovery action when order history fails", async () => {
  vi.spyOn(storeApi, "login").mockResolvedValue({
    token: "token",
    token_type: "bearer",
    user: buyer,
  });
  vi.spyOn(storeApi, "me").mockResolvedValue(buyer);
  const orders = vi
    .spyOn(storeApi, "myOrders")
    .mockRejectedValue(new Error("The store is unavailable."));
  const user = userEvent.setup();
  render(
    <SessionProvider>
      <ProfilePage />
    </SessionProvider>,
  );
  await user.type(screen.getByLabelText("Email address"), buyer.email);
  await user.type(
    screen.getByLabelText("Password", { exact: true }),
    "example-password",
  );
  await user.click(screen.getByRole("button", { name: "Sign in" }));
  expect(await screen.findByText(/The store is unavailable/)).toBeTruthy();
  await user.click(screen.getByRole("button", { name: "Try again" }));
  await waitFor(() => expect(orders).toHaveBeenCalledTimes(2));
});
