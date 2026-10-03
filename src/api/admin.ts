import { request } from "./client";
import type { Category, DeliveryArea, Product, Review, User } from "./store";

export type OrderStatus =
  "pending" | "processing" | "shipped" | "delivered" | "cancelled";
export type PaymentStatus =
  "pending" | "completed" | "failed" | "refunded" | "cancelled";
export type Payment = {
  paymentStatus: PaymentStatus;
  amount: string;
  currency: string;
  collectedAt: string | null;
  refundedAt: string | null;
  refundReason: string | null;
};
export type Order = {
  id: string;
  orderNumber: number;
  user: User | null;
  guestName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  recipientName: string | null;
  recipientPhone: string | null;
  totalPrice: string;
  subtotalPrice: string | null;
  discountAmount: string;
  shippingFee: string;
  couponCode: string | null;
  currency: string;
  status: OrderStatus;
  shippingAddress: string;
  deliveryArea: DeliveryArea | null;
  createdAt: string;
  items: {
    id: string;
    productName: string;
    quantity: number;
    unitPrice: string;
    subtotal: string;
  }[];
  payment: Payment | null;
};
export type SalesReport = {
  start: string | null;
  end: string | null;
  totalOrders: number;
  deliveredSales: string;
  refundedAmount: string;
  netSales: string;
  currency: string;
  averageDeliveredOrderValue: string;
  ordersByStatus: { status: OrderStatus; count: number; orderValue: string }[];
  topProducts: {
    productId: string;
    productName: string;
    quantity: number;
    sales: string;
  }[];
};
export type Coupon = {
  id: string;
  code: string;
  kind: "percent" | "free_shipping";
  discountPercent: string | null;
  startsAt: string | null;
  expiresAt: string | null;
  assignedUserId: string | null;
  maxUses: number | null;
  usesCount: number;
  remainingUses: number | null;
  active: boolean;
  createdAt: string;
};
export type Report = {
  id: string;
  userId: string;
  productId: string | null;
  reviewId: string | null;
  targetType: string;
  reason: string;
  status: "open" | "resolved" | "dismissed";
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
};

const encoded = (value: string | number) => encodeURIComponent(String(value));

export const adminApi = {
  sales: (token: string, query = "", signal?: AbortSignal) =>
    request<SalesReport>(`/reports/sales${query}`, { token, signal }),
  orders: (token: string, offset = 0, status = "", signal?: AbortSignal) =>
    request<Order[]>(
      `/orders?limit=50&offset=${offset}${status ? `&status=${encoded(status)}` : ""}`,
      { token, signal },
    ),
  order: (token: string, number: number) =>
    request<Order>(`/orders/${number}`, { token }),
  orderStatus: (token: string, number: number, status: OrderStatus) =>
    request<Order>(`/orders/${number}/status`, {
      method: "PATCH",
      token,
      body: { status },
    }),
  initializePayment: (token: string, number: number) =>
    request<Payment>(`/payments/${number}`, { method: "POST", token }),
  collectPayment: (token: string, number: number) =>
    request<Payment>(`/payments/${number}/collect`, { method: "POST", token }),
  refundPayment: (token: string, number: number, reason: string) =>
    request<Payment>(`/payments/${number}/refund`, {
      method: "POST",
      token,
      body: { reason },
    }),
  products: (signal?: AbortSignal) =>
    request<Product[]>("/products", { signal }),
  createProduct: (token: string, data: FormData) =>
    request<Product>("/products", { method: "POST", token, body: data }),
  updateProduct: (
    token: string,
    slug: string,
    data: {
      product_name: string;
      description: string | null;
      price: string;
      stock_quantity: number;
      category_id: string;
    },
  ) =>
    request<Product>(`/products/${encoded(slug)}`, {
      method: "PATCH",
      token,
      body: data,
    }),
  deleteProduct: (token: string, slug: string) =>
    request<void>(`/products/${encoded(slug)}`, { method: "DELETE", token }),
  categories: (signal?: AbortSignal) =>
    request<Category[]>("/categories", { signal }),
  createCategory: (token: string, categoryName: string, description: string) =>
    request<Category>("/categories", {
      method: "POST",
      token,
      body: { categoryName, description: description || null },
    }),
  updateCategory: (
    token: string,
    id: string,
    categoryName: string,
    description: string,
  ) =>
    request<Category>(`/categories/${encoded(id)}`, {
      method: "PATCH",
      token,
      body: { categoryName, description: description || null },
    }),
  deleteCategory: (token: string, id: string) =>
    request<void>(`/categories/${encoded(id)}`, { method: "DELETE", token }),
  coupons: (token: string, signal?: AbortSignal) =>
    request<Coupon[]>("/coupons", { token, signal }),
  createCoupon: (token: string, body: Record<string, unknown>) =>
    request<Coupon>("/coupons", { method: "POST", token, body }),
  reports: (token: string, offset = 0, status = "", signal?: AbortSignal) =>
    request<Report[]>(
      `/reports?limit=50&offset=${offset}${status ? `&status=${encoded(status)}` : ""}`,
      { token, signal },
    ),
  moderateReport: (
    token: string,
    id: string,
    status: "resolved" | "dismissed",
    resolution: string,
  ) =>
    request<Report>(`/reports/${encoded(id)}`, {
      method: "PATCH",
      token,
      body: { status, resolution },
    }),
  review: (token: string, id: string, signal?: AbortSignal) =>
    request<Review>(`/reviews/${encoded(id)}`, { token, signal }),
  deleteReview: (token: string, id: string) =>
    request<void>(`/reviews/${encoded(id)}`, { method: "DELETE", token }),
};
