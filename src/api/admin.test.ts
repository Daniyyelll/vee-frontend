import { afterEach, expect, it, vi } from "vitest";
import { adminApi } from "./admin";

afterEach(() => vi.unstubAllGlobals());

it("sends product uploads as multipart and product edits with the backend's field names", async () => {
  const fetcher = vi
    .fn()
    .mockImplementation(async () => new Response(JSON.stringify({ data: {} })));
  vi.stubGlobal("fetch", fetcher);
  const data = new FormData();
  data.set("productName", "Lip Balm");
  data.set("categorySlug", "lip-care");
  data.set("imageFile", new File(["image"], "balm.png", { type: "image/png" }));
  await adminApi.createProduct("admin-token", data);
  await adminApi.updateProduct("admin-token", "lip-balm", {
    product_name: "Lip Balm",
    description: null,
    price: "170.00",
    stock_quantity: 12,
    category_id: "new-category-id",
  });
  expect(fetcher.mock.calls[0][1].body).toBe(data);
  expect(fetcher.mock.calls[0][1].headers).toEqual({
    Accept: "application/json",
    Authorization: "Bearer admin-token",
  });
  expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({
    product_name: "Lip Balm",
    description: null,
    price: "170.00",
    stock_quantity: 12,
    category_id: "new-category-id",
  });
});

it("uses protected order, sales, and moderation endpoints", async () => {
  const fetcher = vi
    .fn()
    .mockImplementation(async () => new Response(JSON.stringify({ data: {} })));
  vi.stubGlobal("fetch", fetcher);
  await adminApi.orderStatus("admin-token", 42, "shipped");
  await adminApi.refundPayment("admin-token", 42, "Returned item");
  await adminApi.sales("admin-token", "?currency=EGP");
  await adminApi.moderateReport(
    "admin-token",
    "report-id",
    "resolved",
    "Reviewed",
  );
  await adminApi.review("admin-token", "review-id");
  await adminApi.deleteReview("admin-token", "review-id");
  expect(fetcher.mock.calls.map(([url]) => url)).toEqual([
    "/api/orders/42/status",
    "/api/payments/42/refund",
    "/api/reports/sales?currency=EGP",
    "/api/reports/report-id",
    "/api/reviews/review-id",
    "/api/reviews/review-id",
  ]);
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
    status: "shipped",
  });
  expect(JSON.parse(fetcher.mock.calls[1][1].body)).toEqual({
    reason: "Returned item",
  });
  expect(JSON.parse(fetcher.mock.calls[3][1].body)).toEqual({
    status: "resolved",
    resolution: "Reviewed",
  });
  expect(fetcher.mock.calls[5][1].method).toBe("DELETE");
});
