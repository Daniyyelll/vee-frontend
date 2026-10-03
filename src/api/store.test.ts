import { afterEach, expect, it, vi } from "vitest";
import { storeApi } from "./store";

afterEach(() => vi.unstubAllGlobals());

it("sends the backend's camel-case password, profile, and review contracts", async () => {
  const fetcher = vi
    .fn()
    .mockImplementation(
      async () => new Response(JSON.stringify({ data: null })),
    );
  vi.stubGlobal("fetch", fetcher);
  await storeApi.register(
    "Buyer",
    "buyer@example.com",
    "example-password",
    "01012345678",
  );
  await storeApi.updateProfile("credential", "Buyer", "Cairo", "01012345678");
  await storeApi.changePassword("credential", "old-example", "new-example");
  await storeApi.resetPassword("ABCD1234", "new-example");
  await storeApi.createReview("credential", "product", 4, "Comforting");
  await storeApi.updateReview("credential", "review", 5, "Updated");
  const bodies = fetcher.mock.calls.map(([, options]) =>
    JSON.parse(options.body),
  );
  expect(bodies).toEqual([
    {
      name: "Buyer",
      email: "buyer@example.com",
      password: "example-password",
      phone: "01012345678",
    },
    { name: "Buyer", address: "Cairo", phone: "01012345678" },
    { oldPassword: "old-example", newPassword: "new-example" },
    { code: "ABCD1234", newPassword: "new-example" },
    { productId: "product", rating: 4, comment: "Comforting" },
    { rating: 5, comment: "Updated" },
  ]);
  expect(fetcher.mock.calls[3][1].headers.Authorization).toBeUndefined();
});

it("sends the quoted total and idempotency key for guest checkout", async () => {
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ data: { orderNumber: 42 } })),
    );
  vi.stubGlobal("fetch", fetcher);
  const body = {
    name: "Buyer",
    email: "buyer@example.com",
    phone: "01012345678",
    shippingAddress: "Cairo",
    deliveryArea: "Cairo" as const,
    couponCode: null,
    expectedTotal: "220.00",
    items: [{ productId: "2d117087-908b-4c2b-a05f-72a4e921cadd", quantity: 1 }],
  };
  await storeApi.guestCheckout(body, "guest-order-key");
  expect(fetcher.mock.calls[0][0]).toContain("/orders/guest-checkout");
  expect(fetcher.mock.calls[0][1].headers["Idempotency-Key"]).toBe(
    "guest-order-key",
  );
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual(body);
});
