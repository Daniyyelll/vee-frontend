import { request } from "./client";

export type User = {
  id: string;
  name: string;
  email: string;
  role: "customer" | "admin" | "delivery";
  active: boolean;
  address: string | null;
  phone: string | null;
};
export type TokenData = { token: string; token_type: string; user: User };
export type Category = {
  id: string;
  categoryName: string;
  description: string | null;
  slug?: string | null;
};
export type Product = {
  id: string;
  productSlug: string;
  categoryId: string;
  productName: string;
  description: string | null;
  price: string;
  currency: string;
  stockQuantity: number;
  imageUrl: string | null;
};
export type Review = {
  id: string;
  rating: number;
  comment: string | null;
  username: string;
  createdAt: string;
  productId: string;
  userId: string;
};
export type Cart = {
  items: { productId: string; quantity: number }[];
};
export type OrderQuote = {
  items: {
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: string;
    subtotal: string;
  }[];
  subtotalPrice: string;
  shippingFee: string;
  discountAmount: string;
  totalPrice: string;
  couponCode: string | null;
  currency: string;
};
export type OrderReceipt = {
  orderNumber: number;
  totalPrice: string;
  currency: string;
  recipientName: string;
  recipientPhone: string;
  shippingAddress: string;
  deliveryArea: DeliveryArea | null;
};
export type CheckoutOrder = OrderReceipt & {
  receiptToken: string;
  guestEmail: string | null;
  user: User | null;
};
export type AccountOrder = {
  id: string;
  orderNumber: number;
  totalPrice: string;
  currency: string;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  createdAt: string;
  shippingAddress: string;
  deliveryArea: DeliveryArea | null;
  items: {
    id: string;
    productName: string;
    quantity: number;
    subtotal: string;
  }[];
};
export type BagItem = { productId: string; quantity: number };
export type DeliveryArea = "Cairo" | "New Cairo" | "Giza";

export const storeApi = {
  refresh: (signal?: AbortSignal) =>
    request<TokenData>("/auth/refresh", {
      method: "POST",
      credentials: "include",
      signal,
    }),
  logout: () =>
    request<void>("/auth/logout", {
      method: "POST",
      credentials: "include",
    }),
  myOrders: (token: string, limit = 10, offset = 0, signal?: AbortSignal) =>
    request<AccountOrder[]>(`/orders/mine?limit=${limit}&offset=${offset}`, {
      token,
      signal,
    }),
  orderReceipt: (orderNumber: number, receiptToken: string) =>
    request<OrderReceipt>(`/orders/receipt/${orderNumber}`, {
      headers: { "Receipt-Token": receiptToken },
    }),
  guestQuote: (items: BagItem[], couponCode: string | null) =>
    request<OrderQuote>("/orders/quote", {
      method: "POST",
      body: { items, couponCode },
    }),
  cartQuote: (token: string, couponCode: string | null) =>
    request<OrderQuote>("/orders/cart-quote", {
      method: "POST",
      token,
      body: { couponCode },
    }),
  cart: (token: string) => request<Cart>("/cart", { token }),
  addCartItem: (token: string, productId: string, quantity: number) =>
    request<Cart>("/cart/items", {
      method: "POST",
      token,
      body: { product_id: productId, quantity },
    }),
  updateCartItem: (token: string, productId: string, quantity: number) =>
    request<Cart>(`/cart/items/${encodeURIComponent(productId)}`, {
      method: "PATCH",
      token,
      body: { quantity },
    }),
  removeCartItem: (token: string, productId: string) =>
    request<Cart>(`/cart/items/${encodeURIComponent(productId)}`, {
      method: "DELETE",
      token,
    }),
  guestCheckout: (
    body: {
      name: string;
      email: string;
      phone: string;
      shippingAddress: string;
      deliveryArea: DeliveryArea;
      couponCode: string | null;
      expectedTotal: string;
      items: BagItem[];
    },
    idempotencyKey: string,
  ) =>
    request<CheckoutOrder>("/orders/guest-checkout", {
      method: "POST",
      body,
      headers: { "Idempotency-Key": idempotencyKey },
    }),
  checkout: (
    token: string,
    body: {
      name: string;
      phone: string;
      shippingAddress: string;
      deliveryArea: DeliveryArea;
      couponCode: string | null;
      expectedTotal: string;
    },
  ) =>
    request<CheckoutOrder>("/orders/checkout", { method: "POST", token, body }),
  products: (signal?: AbortSignal) =>
    request<Product[]>("/products", { signal }),
  product: (slug: string, signal?: AbortSignal) =>
    request<Product>(`/products/${encodeURIComponent(slug)}`, { signal }),
  categories: (signal?: AbortSignal) =>
    request<Category[]>("/categories", { signal }),
  login: (email: string, password: string) =>
    request<TokenData>("/auth/login", {
      method: "POST",
      body: { email, password },
      credentials: "include",
    }),
  register: (
    name: string,
    email: string,
    password: string,
    phone: string | null,
  ) =>
    request<User>("/auth/register", {
      method: "POST",
      body: { name, email, password, phone },
    }),
  me: (token: string, signal?: AbortSignal) =>
    request<User>("/users/me", { token, signal }),
  updateProfile: (
    token: string,
    name: string,
    address: string | null,
    phone: string | null,
  ) =>
    request<User>("/users/update-profile", {
      method: "PATCH",
      token,
      body: { name, address, phone },
    }),
  changePassword: (token: string, oldPassword: string, newPassword: string) =>
    request<void>("/users/change-password", {
      method: "PATCH",
      token,
      body: { oldPassword, newPassword },
    }),
  forgotPassword: (email: string) =>
    request<void>("/auth/forgot-password", { method: "POST", body: { email } }),
  resetPassword: (code: string, newPassword: string) =>
    request<void>("/auth/reset-password", {
      method: "POST",
      body: { code, newPassword },
    }),
  reviews: (productId: string, offset = 0, signal?: AbortSignal) =>
    request<Review[]>(
      `/reviews?productId=${encodeURIComponent(productId)}&limit=20&offset=${offset}`,
      { signal },
    ),
  createReview: (
    token: string,
    productId: string,
    rating: number,
    comment: string,
  ) =>
    request<Review>("/reviews", {
      method: "POST",
      token,
      body: { productId, rating, comment },
    }),
  updateReview: (token: string, id: string, rating: number, comment: string) =>
    request<Review>(`/reviews/${encodeURIComponent(id)}`, {
      method: "PATCH",
      token,
      body: { rating, comment },
    }),
  deleteReview: (token: string, id: string) =>
    request<void>(`/reviews/${encodeURIComponent(id)}`, {
      method: "DELETE",
      token,
    }),
};

export function formatPrice(
  product: Pick<Product, "price" | "currency">,
): string {
  const price = Number(product.price);
  if (!Number.isFinite(price)) return "Price unavailable";
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: product.currency,
      currencyDisplay: "code",
    }).format(price);
  } catch {
    return `${product.price} ${product.currency}`;
  }
}
