import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { adminApi } from "../api/admin";
import { storeApi } from "../api/store";
import { SessionProvider } from "../auth/Session";
import AdminApp from "./AdminApp";
import { CouponsSection, ProductsSection, StatisticsSection } from "./sections";

afterEach(() => vi.restoreAllMocks());

it("keeps a customer out of the admin workspace after verified sign-in", async () => {
  const customer = {
    id: "customer-id",
    name: "Customer",
    email: "customer@example.test",
    role: "customer" as const,
    active: true,
    address: null,
    phone: null,
  };
  vi.spyOn(storeApi, "login").mockResolvedValue({
    token: "customer-token",
    token_type: "bearer",
    user: customer,
  });
  vi.spyOn(storeApi, "me").mockResolvedValue(customer);
  const sales = vi.spyOn(adminApi, "sales");
  render(
    <SessionProvider>
      <AdminApp />
    </SessionProvider>,
  );
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), customer.email);
  await user.type(screen.getByLabelText("Password"), "example-password");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
  await waitFor(() =>
    expect(screen.getByText("Administrator access required")).toBeTruthy(),
  );
  expect(sales).not.toHaveBeenCalled();
});

it("shows the selected through date while sending an exclusive end to sales", async () => {
  const sales = vi.spyOn(adminApi, "sales").mockResolvedValue({
    start: null,
    end: "2026-10-02T00:00:00Z",
    totalOrders: 0,
    deliveredSales: "0.00",
    refundedAmount: "0.00",
    netSales: "0.00",
    currency: "EGP",
    averageDeliveredOrderValue: "0.00",
    ordersByStatus: [],
    topProducts: [],
  });
  render(<StatisticsSection token="admin-token" />);
  fireEvent.change(screen.getByLabelText("Through"), {
    target: { value: "2026-10-01" },
  });
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "Apply filters" }));
  await waitFor(() => expect(sales).toHaveBeenCalledTimes(2));
  expect(sales.mock.calls[1][1]).toContain("end=");
  expect(screen.getByText(/Oct 1, 2026 · EGP/)).toBeTruthy();
});

it("creates a shared one-time coupon using max uses as its only limit", async () => {
  vi.spyOn(adminApi, "coupons").mockResolvedValue([]);
  const create = vi.spyOn(adminApi, "createCoupon").mockResolvedValue({
    id: "coupon-id",
    code: "GIFT",
    kind: "free_shipping",
    discountPercent: null,
    startsAt: null,
    expiresAt: null,
    assignedUserId: null,
    maxUses: 1,
    usesCount: 0,
    remainingUses: 1,
    active: true,
    createdAt: "2026-10-01T00:00:00Z",
  });
  render(<CouponsSection token="admin-token" />);
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Create coupon" }));
  await user.selectOptions(screen.getByLabelText("Type"), "free_shipping");
  await user.type(screen.getByLabelText(/Max uses/), "1");
  await user.click(screen.getAllByRole("button", { name: "Create coupon" })[1]);
  await waitFor(() => expect(create).toHaveBeenCalledTimes(1));
  expect(create.mock.calls[0][1]).toMatchObject({
    kind: "free_shipping",
    maxUses: 1,
    startsAt: null,
    expiresAt: null,
    assignedUserId: null,
  });
  expect(screen.getByText("Coupon created.")).toBeTruthy();
});

it("shows a coupon as unavailable when its shared uses are exhausted", async () => {
  vi.spyOn(adminApi, "coupons").mockResolvedValue([
    {
      id: "coupon-id",
      code: "GIFT",
      kind: "free_shipping",
      discountPercent: null,
      startsAt: null,
      expiresAt: null,
      assignedUserId: null,
      maxUses: 1,
      usesCount: 1,
      remainingUses: 0,
      active: true,
      createdAt: "2026-10-01T00:00:00Z",
    },
  ]);
  render(<CouponsSection token="admin-token" />);
  expect(await screen.findByText("Limit reached")).toBeTruthy();
  expect(screen.getByText("1 / 1 used · 0 left")).toBeTruthy();
});

it("reassigns an existing product to the selected category", async () => {
  vi.spyOn(adminApi, "products").mockResolvedValue([
    {
      id: "product-id",
      productSlug: "lip-balm",
      categoryId: "category-x",
      productName: "Lip Balm",
      description: null,
      price: "170.00",
      currency: "EGP",
      stockQuantity: 12,
      imageUrl: null,
    },
  ]);
  vi.spyOn(adminApi, "categories").mockResolvedValue([
    {
      id: "category-x",
      categoryName: "Category X",
      slug: "category-x",
      description: null,
    },
    {
      id: "category-y",
      categoryName: "Category Y",
      slug: "category-y",
      description: null,
    },
  ]);
  const update = vi.spyOn(adminApi, "updateProduct").mockResolvedValue({
    id: "product-id",
    productSlug: "lip-balm",
    categoryId: "category-y",
    productName: "Lip Balm",
    description: null,
    price: "170.00",
    currency: "EGP",
    stockQuantity: 12,
    imageUrl: null,
  });
  render(<ProductsSection token="admin-token" />);
  await screen.findByText("Lip Balm");
  await userEvent.setup().click(screen.getByRole("button", { name: "Edit" }));
  const category = screen.getAllByRole("combobox", { name: "Category" })[0];
  expect((category as HTMLSelectElement).value).toBe("category-x");
  await userEvent.setup().selectOptions(category, "category-y");
  await userEvent
    .setup()
    .click(screen.getByRole("button", { name: "Save changes" }));
  await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
  expect(update.mock.calls[0][2].category_id).toBe("category-y");
});
