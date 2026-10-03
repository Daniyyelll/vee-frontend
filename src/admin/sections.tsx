import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { adminApi } from "../api/admin";
import type { Coupon, Order, OrderStatus, Report } from "../api/admin";
import { ApiError, imageUrl, messageOf } from "../api/client";
import type { Category, Product, Review } from "../api/store";
import type { View } from "./AdminApp";

function useResource<T>(
  key: string,
  load: (signal: AbortSignal) => Promise<T>,
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    load(controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setData(value);
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted) setError(messageOf(cause));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [key, revision]);
  return {
    data,
    loading,
    error,
    reload: () => setRevision((value) => value + 1),
  };
}
function money(value: string | number, currency = "EGP") {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "—";
  try {
    return new Intl.NumberFormat("en-EG", {
      style: "currency",
      currency,
      currencyDisplay: "code",
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}
function date(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("en-EG", { dateStyle: "medium" }).format(
        new Date(value),
      )
    : "—";
}
function couponState(coupon: Coupon) {
  if (!coupon.active) return { label: "Inactive", style: "status-cancelled" };
  const now = Date.now();
  if (coupon.startsAt && now < Date.parse(coupon.startsAt))
    return { label: "Scheduled", style: "status-processing" };
  if (coupon.expiresAt && now >= Date.parse(coupon.expiresAt))
    return { label: "Expired", style: "status-cancelled" };
  if (coupon.remainingUses !== null && coupon.remainingUses <= 0)
    return { label: "Limit reached", style: "status-cancelled" };
  return { label: "Active", style: "status-delivered" };
}
function couponDateTime(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("en-EG", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(value))
    : "—";
}
function statusLabel(value: string) {
  return value.replaceAll("_", " ");
}
function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="admin-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  );
}
function ResourceState({
  loading,
  error,
  retry,
  children,
}: {
  loading: boolean;
  error: string;
  retry: () => void;
  children: ReactNode;
}) {
  if (loading)
    return (
      <div className="admin-skeleton" aria-label="Loading">
        <span />
        <span />
        <span />
      </div>
    );
  if (error)
    return (
      <div className="admin-state" role="alert">
        <CircleAlert size={24} />
        <h2>Couldn’t load this section</h2>
        <p>{error}</p>
        <button className="admin-secondary" onClick={retry}>
          <RefreshCw size={15} /> Try again
        </button>
      </div>
    );
  return <>{children}</>;
}
function Notice({ error, success }: { error: string; success: string }) {
  return (
    <>
      {error && (
        <p className="admin-alert" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="admin-success" role="status">
          {success}
        </p>
      )}
    </>
  );
}
function useDrawer(open: boolean, onClose: () => void) {
  const drawer = useRef<HTMLElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    drawer.current?.querySelector<HTMLElement>("button")?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close.current();
      if (event.key !== "Tab" || !drawer.current) return;
      const focusable = Array.from(
        drawer.current.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled])",
        ),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.removeEventListener("keydown", keydown);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [open]);
  return drawer;
}
const transitions: Record<OrderStatus, OrderStatus[]> = {
  pending: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export function DashboardSection({
  token,
  onNavigate,
}: {
  token: string;
  onNavigate: (view: View) => void;
}) {
  const [currency, setCurrency] = useState("");
  const sales = useResource(`sales:${token}:${currency}`, (signal) =>
    adminApi.sales(token, currency ? `?currency=${currency}` : "", signal),
  );
  const orders = useResource(`recent:${token}`, (signal) =>
    adminApi.orders(token, 0, "", signal),
  );
  const catalog = useResource(`catalog:${token}`, (signal) =>
    adminApi.products(signal),
  );
  const report = sales.data;
  const recent = orders.data?.slice(0, 5) ?? [];
  const lowStock =
    catalog.data?.filter((product) => product.stockQuantity <= 5) ?? [];
  return (
    <>
      <SectionHeading
        title="Good to see you."
        description="Your store at a glance, with live figures from Vee."
        action={
          <div className="admin-heading-actions">
            <label className="admin-select-label">
              Currency
              <select
                value={currency}
                onChange={(event) => setCurrency(event.target.value)}
              >
                <option value="">Store currency</option>
                <option value="EGP">EGP</option>
                <option value="SAR">SAR</option>
                <option value="AED">AED</option>
              </select>
            </label>
            <button
              className="admin-secondary"
              onClick={() => {
                sales.reload();
                orders.reload();
                catalog.reload();
              }}
            >
              <RefreshCw size={15} /> Refresh
            </button>
          </div>
        }
      />
      <ResourceState
        loading={sales.loading}
        error={sales.error}
        retry={sales.reload}
      >
        {report && (
          <>
            <div className="admin-metrics">
              <div>
                <span>Net sales</span>
                <strong>{money(report.netSales, report.currency)}</strong>
                <small>Delivered sales less refunds</small>
              </div>
              <div>
                <span>Orders</span>
                <strong>{report.totalOrders}</strong>
                <small>Across all statuses</small>
              </div>
              <div>
                <span>Average order</span>
                <strong>
                  {money(report.averageDeliveredOrderValue, report.currency)}
                </strong>
                <small>Delivered orders</small>
              </div>
              <div>
                <span>Refunded</span>
                <strong>{money(report.refundedAmount, report.currency)}</strong>
                <small>Recorded cash refunds</small>
              </div>
            </div>
            <div className="admin-dashboard-grid">
              <section className="admin-panel">
                <div className="admin-panel-head">
                  <h2>Order flow</h2>
                  <button onClick={() => onNavigate("orders")}>
                    View orders <ArrowRight size={15} />
                  </button>
                </div>
                <div className="admin-status-list">
                  {report.ordersByStatus.map((item) => (
                    <div key={item.status}>
                      <span className={`admin-dot status-${item.status}`} />
                      <span>{statusLabel(item.status)}</span>
                      <strong>{item.count}</strong>
                      <small>{money(item.orderValue, report.currency)}</small>
                    </div>
                  ))}
                </div>
              </section>
              <section className="admin-panel">
                <div className="admin-panel-head">
                  <h2>Top products</h2>
                  <button onClick={() => onNavigate("products")}>
                    View catalog <ArrowRight size={15} />
                  </button>
                </div>
                {report.topProducts.length ? (
                  <div className="admin-ranked">
                    {report.topProducts.slice(0, 5).map((item, index) => (
                      <div key={item.productId}>
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <strong>{item.productName}</strong>
                        <small>{item.quantity} sold</small>
                        <b>{money(item.sales, report.currency)}</b>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="admin-muted">
                    Top products appear after delivered sales.
                  </p>
                )}
              </section>
            </div>
          </>
        )}
      </ResourceState>
      <div className="admin-dashboard-grid admin-dashboard-lower">
        <section className="admin-panel">
          <div className="admin-panel-head">
            <h2>Recent orders</h2>
            <button onClick={() => onNavigate("orders")}>
              All orders <ArrowRight size={15} />
            </button>
          </div>
          <ResourceState
            loading={orders.loading}
            error={orders.error}
            retry={orders.reload}
          >
            {recent.length ? (
              <div className="admin-simple-list">
                {recent.map((order) => (
                  <div key={order.id}>
                    <strong>#{order.orderNumber}</strong>
                    <span>
                      {order.recipientName ??
                        order.user?.name ??
                        order.guestName ??
                        "Guest"}
                    </span>
                    <span className={`admin-badge status-${order.status}`}>
                      {order.status}
                    </span>
                    <b>{money(order.totalPrice, order.currency)}</b>
                  </div>
                ))}
              </div>
            ) : (
              <p className="admin-muted">
                Orders will appear here as customers check out.
              </p>
            )}
          </ResourceState>
        </section>
        <section className="admin-panel">
          <div className="admin-panel-head">
            <h2>Stock attention</h2>
            <button onClick={() => onNavigate("products")}>
              Manage stock <ArrowRight size={15} />
            </button>
          </div>
          <ResourceState
            loading={catalog.loading}
            error={catalog.error}
            retry={catalog.reload}
          >
            {lowStock.length ? (
              <div className="admin-simple-list">
                {lowStock.slice(0, 5).map((product) => (
                  <div key={product.id}>
                    <strong>{product.productName}</strong>
                    <span>
                      {product.stockQuantity === 0
                        ? "Out of stock"
                        : `${product.stockQuantity} remaining`}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="admin-muted">
                No products have five or fewer units in stock.
              </p>
            )}
          </ResourceState>
        </section>
      </div>
    </>
  );
}

export function StatisticsSection({ token }: { token: string }) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [currency, setCurrency] = useState("");
  const [filters, setFilters] = useState("");
  const [filterError, setFilterError] = useState("");
  const [displayPeriod, setDisplayPeriod] = useState("All time");
  const sales = useResource(`statistics:${token}:${filters}`, (signal) =>
    adminApi.sales(token, filters, signal),
  );
  const report = sales.data;
  const maxCount = Math.max(
    1,
    ...(report?.ordersByStatus.map((item) => item.count) ?? []),
  );
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (start && end && start > end) {
      setFilterError("The end date must be on or after the start date.");
      return;
    }
    setFilterError("");
    const params = new URLSearchParams();
    if (start) params.set("start", new Date(`${start}T00:00:00`).toISOString());
    if (end) {
      const next = new Date(`${end}T00:00:00`);
      next.setDate(next.getDate() + 1);
      params.set("end", next.toISOString());
    }
    if (currency) params.set("currency", currency);
    setDisplayPeriod(
      start || end
        ? `${start ? date(`${start}T00:00:00`) : "Beginning"} – ${end ? date(`${end}T00:00:00`) : "Present"}`
        : "All time",
    );
    setFilters(params.size ? `?${params}` : "");
    if (params.size === 0 && !filters) sales.reload();
  }
  return (
    <>
      <SectionHeading
        title="Statistics"
        description="Explore live sales and order performance over a date range."
        action={
          <button className="admin-secondary" onClick={sales.reload}>
            <RefreshCw size={15} /> Refresh
          </button>
        }
      />
      <form className="admin-filter-form" onSubmit={apply}>
        <label>
          From
          <input
            type="date"
            value={start}
            onChange={(event) => setStart(event.target.value)}
          />
        </label>
        <label>
          Through
          <input
            type="date"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
          />
        </label>
        <label>
          Currency
          <select
            value={currency}
            onChange={(event) => setCurrency(event.target.value)}
          >
            <option value="">All currencies</option>
            <option value="EGP">EGP</option>
            <option value="SAR">SAR</option>
            <option value="AED">AED</option>
          </select>
        </label>
        <button className="admin-primary">Apply filters</button>
      </form>
      {filterError && (
        <p className="admin-alert" role="alert">
          {filterError}
        </p>
      )}
      <ResourceState
        loading={sales.loading}
        error={sales.error}
        retry={sales.reload}
      >
        {report && (
          <>
            <p className="admin-period">
              {displayPeriod} · {report.currency}
            </p>
            <div className="admin-metrics">
              <div>
                <span>Net sales</span>
                <strong>{money(report.netSales, report.currency)}</strong>
                <small>Delivered sales less refunds</small>
              </div>
              <div>
                <span>Delivered sales</span>
                <strong>{money(report.deliveredSales, report.currency)}</strong>
                <small>Before recorded refunds</small>
              </div>
              <div>
                <span>Refunds</span>
                <strong>{money(report.refundedAmount, report.currency)}</strong>
                <small>Cash refunds</small>
              </div>
              <div>
                <span>Average order</span>
                <strong>
                  {money(report.averageDeliveredOrderValue, report.currency)}
                </strong>
                <small>Delivered orders</small>
              </div>
            </div>
            <div className="admin-dashboard-grid">
              <section className="admin-panel">
                <h2>Orders by status</h2>
                <p className="admin-muted">
                  {report.totalOrders} total orders in this period
                </p>
                <div className="admin-bars">
                  {report.ordersByStatus.map((item) => (
                    <div key={item.status}>
                      <div>
                        <span>{statusLabel(item.status)}</span>
                        <strong>{item.count}</strong>
                      </div>
                      <div className="admin-bar-track">
                        <span
                          style={{ width: `${(item.count / maxCount) * 100}%` }}
                        />
                      </div>
                      <small>{money(item.orderValue, report.currency)}</small>
                    </div>
                  ))}
                </div>
              </section>
              <section className="admin-panel">
                <h2>Best sellers</h2>
                <p className="admin-muted">Ranked by delivered sales</p>
                {report.topProducts.length ? (
                  <div className="admin-ranked">
                    {report.topProducts.map((item, index) => (
                      <div key={item.productId}>
                        <span>{String(index + 1).padStart(2, "0")}</span>
                        <strong>{item.productName}</strong>
                        <small>{item.quantity} sold</small>
                        <b>{money(item.sales, report.currency)}</b>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="admin-empty">
                    No delivered product sales in this period.
                  </p>
                )}
              </section>
            </div>
          </>
        )}
      </ResourceState>
    </>
  );
}

export function OrdersSection({ token }: { token: string }) {
  const [status, setStatus] = useState("");
  const [offset, setOffset] = useState(0);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);
  const drawer = useDrawer(Boolean(selected), () => setSelected(null));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const orders = useResource(`orders:${token}:${status}:${offset}`, (signal) =>
    adminApi.orders(token, offset, status, signal),
  );
  const items =
    orders.data?.filter((order) =>
      `${order.orderNumber} ${order.recipientName ?? order.user?.name ?? order.guestName ?? ""} ${order.user?.email ?? order.guestEmail ?? ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    ) ?? [];
  async function mutate(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await action();
      if (selected)
        setSelected(await adminApi.order(token, selected.orderNumber));
      orders.reload();
      setSuccess(message);
      setRefundReason("");
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <SectionHeading
        title="Orders"
        description="Track fulfillment, collect cash, and resolve refunds."
        action={
          <button className="admin-secondary" onClick={orders.reload}>
            <RefreshCw size={15} /> Refresh
          </button>
        }
      />
      <div className="admin-toolbar">
        <label className="admin-search">
          <Search size={17} />
          <input
            placeholder="Search this page by order or customer"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className="admin-select-label">
          Status
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setOffset(0);
            }}
          >
            <option value="">All statuses</option>
            {Object.keys(transitions).map((value) => (
              <option key={value} value={value}>
                {statusLabel(value)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ResourceState
        loading={orders.loading}
        error={orders.error}
        retry={orders.reload}
      >
        <div className="admin-mobile-list">
          {items.map((order) => (
            <button
              key={order.id}
              onClick={() => {
                setSelected(order);
                setError("");
                setSuccess("");
              }}
            >
              <span>
                <strong>Order #{order.orderNumber}</strong>
                <span className={`admin-badge status-${order.status}`}>
                  {order.status}
                </span>
              </span>
              <span>
                {order.recipientName ??
                  order.user?.name ??
                  order.guestName ??
                  "Guest"}
                <b>{money(order.totalPrice, order.currency)}</b>
              </span>
              <small>
                {date(order.createdAt)} ·{" "}
                {order.payment
                  ? statusLabel(order.payment.paymentStatus)
                  : "No payment"}
              </small>
            </button>
          ))}
          {!items.length && (
            <p className="admin-empty">No orders match this view.</p>
          )}
        </div>
        <div className="admin-table-wrap admin-desktop-table">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Status</th>
                <th>Payment</th>
                <th className="numeric">Total</th>
                <th>
                  <span className="sr-only">Details</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((order) => (
                <tr key={order.id}>
                  <td className="admin-strong">#{order.orderNumber}</td>
                  <td>
                    {order.recipientName ??
                      order.user?.name ??
                      order.guestName ??
                      "Guest"}
                    <small>{order.user?.email ?? order.guestEmail}</small>
                  </td>
                  <td>{date(order.createdAt)}</td>
                  <td>
                    <span className={`admin-badge status-${order.status}`}>
                      {order.status}
                    </span>
                  </td>
                  <td>
                    {order.payment
                      ? statusLabel(order.payment.paymentStatus)
                      : "—"}
                  </td>
                  <td className="numeric admin-strong">
                    {money(order.totalPrice, order.currency)}
                  </td>
                  <td>
                    <button
                      className="admin-row-action"
                      onClick={() => {
                        setSelected(order);
                        setError("");
                        setSuccess("");
                      }}
                    >
                      View <ChevronRight size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!items.length && (
            <p className="admin-empty">No orders match this view.</p>
          )}
        </div>
        <div className="admin-pagination">
          <span>
            Showing {items.length ? offset + 1 : 0}–
            {offset + (orders.data?.length ?? 0)} on this page
          </span>
          <div>
            <button
              className="admin-secondary"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - 50))}
            >
              <ChevronLeft size={15} /> Previous
            </button>
            <button
              className="admin-secondary"
              disabled={(orders.data?.length ?? 0) < 50}
              onClick={() => setOffset(offset + 50)}
            >
              Next <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </ResourceState>
      {selected && (
        <div
          className="admin-drawer-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelected(null);
          }}
        >
          <aside
            ref={drawer}
            className="admin-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={`Order ${selected.orderNumber} details`}
          >
            <div className="admin-drawer-header">
              <div>
                <small>ORDER DETAILS</small>
                <h2>Order #{selected.orderNumber}</h2>
              </div>
              <button
                aria-label="Close details"
                onClick={() => setSelected(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="admin-drawer-body">
              <Notice error={error} success={success} />
              <div className="admin-order-summary">
                <span className={`admin-badge status-${selected.status}`}>
                  {selected.status}
                </span>
                <strong>{money(selected.totalPrice, selected.currency)}</strong>
                <small>Placed {date(selected.createdAt)}</small>
              </div>
              <h3>Customer</h3>
              <p>
                {selected.recipientName ??
                  selected.user?.name ??
                  selected.guestName ??
                  "Guest"}
                <br />
                {selected.user?.email ?? selected.guestEmail}
                <br />
                {selected.recipientPhone ??
                  selected.guestPhone ??
                  "No phone recorded"}
              </p>
              <h3>Shipping address</h3>
              <p>
                {selected.shippingAddress}
                {selected.deliveryArea && (
                  <>
                    <br />
                    {selected.deliveryArea}
                  </>
                )}
              </p>
              <h3>Items</h3>
              <div className="admin-line-items">
                {selected.items.map((item) => (
                  <div key={item.id}>
                    <span>
                      {item.productName} <small>× {item.quantity}</small>
                    </span>
                    <strong>{money(item.subtotal, selected.currency)}</strong>
                  </div>
                ))}
              </div>
              <div className="admin-totals">
                <div>
                  <span>Subtotal</span>
                  <b>
                    {money(
                      selected.subtotalPrice ?? selected.totalPrice,
                      selected.currency,
                    )}
                  </b>
                </div>
                <div>
                  <span>
                    Discount {selected.couponCode && `(${selected.couponCode})`}
                  </span>
                  <b>−{money(selected.discountAmount, selected.currency)}</b>
                </div>
                <div>
                  <span>Shipping</span>
                  <b>{money(selected.shippingFee, selected.currency)}</b>
                </div>
                <div>
                  <strong>Total</strong>
                  <strong>
                    {money(selected.totalPrice, selected.currency)}
                  </strong>
                </div>
              </div>
              <h3>Fulfillment</h3>
              {transitions[selected.status].length ? (
                <div className="admin-actions">
                  {transitions[selected.status].map((next) => (
                    <button
                      className={
                        next === "cancelled" ? "admin-danger" : "admin-primary"
                      }
                      key={next}
                      disabled={
                        busy ||
                        (next === "delivered" &&
                          selected.payment?.paymentStatus !== "completed")
                      }
                      onClick={() => {
                        if (
                          next === "cancelled" &&
                          !window.confirm(
                            `Cancel order #${selected.orderNumber}? Stock will be returned.`,
                          )
                        )
                          return;
                        void mutate(
                          () =>
                            adminApi.orderStatus(
                              token,
                              selected.orderNumber,
                              next,
                            ),
                          `Order marked ${next}.`,
                        );
                      }}
                    >
                      {next === "cancelled" ? "Cancel order" : `Mark ${next}`}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="admin-muted">
                  No further status changes are available.
                </p>
              )}
              <h3>Cash payment</h3>
              <p className="admin-muted">
                {selected.payment
                  ? `Status: ${statusLabel(selected.payment.paymentStatus)} · ${money(selected.payment.amount, selected.payment.currency)}`
                  : "No payment record on this order."}
              </p>
              {!selected.payment && selected.status !== "cancelled" && (
                <button
                  className="admin-secondary"
                  disabled={busy}
                  onClick={() =>
                    void mutate(
                      () =>
                        adminApi.initializePayment(token, selected.orderNumber),
                      "Cash payment initialized.",
                    )
                  }
                >
                  Initialize cash payment
                </button>
              )}
              {selected.payment?.paymentStatus === "pending" &&
                selected.status === "shipped" && (
                  <button
                    className="admin-secondary"
                    disabled={busy}
                    onClick={() =>
                      void mutate(
                        () =>
                          adminApi.collectPayment(token, selected.orderNumber),
                        "Cash collection recorded.",
                      )
                    }
                  >
                    Record cash collection
                  </button>
                )}
              {selected.payment?.paymentStatus === "completed" &&
                selected.status === "delivered" && (
                  <form
                    className="admin-refund-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (
                        !window.confirm(
                          `Record a cash refund for order #${selected.orderNumber} and return its items to stock?`,
                        )
                      )
                        return;
                      void mutate(
                        () =>
                          adminApi.refundPayment(
                            token,
                            selected.orderNumber,
                            refundReason.trim(),
                          ),
                        "Cash refund recorded and items returned to stock.",
                      );
                    }}
                  >
                    <label>
                      Refund reason
                      <textarea
                        value={refundReason}
                        onChange={(event) =>
                          setRefundReason(event.target.value)
                        }
                        required
                        maxLength={2000}
                      />
                    </label>
                    <button
                      className="admin-danger"
                      disabled={busy || !refundReason.trim()}
                    >
                      Record refund
                    </button>
                  </form>
                )}
              {selected.payment?.refundReason && (
                <p className="admin-muted">
                  Refund reason: {selected.payment.refundReason}
                </p>
              )}
              {selected.status === "shipped" &&
                selected.payment?.paymentStatus !== "completed" && (
                  <p className="admin-muted">
                    Record cash collection before marking this order delivered.
                  </p>
                )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

export function ProductsSection({ token }: { token: string }) {
  const products = useResource(`products:${token}`, (signal) =>
    adminApi.products(signal),
  );
  const categories = useResource(`product-categories:${token}`, (signal) =>
    adminApi.categories(signal),
  );
  const [editing, setEditing] = useState<Product | "new" | null>(null);
  const [editCategoryId, setEditCategoryId] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const items =
    products.data?.filter(
      (product) =>
        (!category || product.categoryId === category) &&
        product.productName.toLowerCase().includes(query.toLowerCase()),
    ) ?? [];
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      if (editing === "new") {
        const file = data.get("imageFile");
        if (!(file instanceof File) || !file.size)
          throw new Error("Choose a product image.");
        await adminApi.createProduct(token, data);
        setSuccess("Product created.");
      } else if (editing) {
        await adminApi.updateProduct(token, editing.productSlug, {
          product_name: String(data.get("productName") ?? "").trim(),
          description: String(data.get("description") ?? "").trim() || null,
          price: String(data.get("price") ?? ""),
          stock_quantity: Number(data.get("stockQuantity")),
          category_id: editCategoryId,
        });
        setSuccess("Product updated.");
      }
      products.reload();
      setEditing(null);
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }
  async function remove(product: Product) {
    if (
      !window.confirm(
        `Delete ${product.productName}? This action cannot be undone.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await adminApi.deleteProduct(token, product.productSlug);
      products.reload();
      setEditing(null);
      setSuccess("Product deleted.");
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <SectionHeading
        title="Products"
        description="Keep the collection, pricing, and inventory current."
        action={
          <button
            className="admin-primary"
            onClick={() => {
              setEditing("new");
              setEditCategoryId("");
              setError("");
            }}
          >
            <Plus size={16} /> Add product
          </button>
        }
      />
      <Notice error={error} success={success} />
      {editing && (
        <section className="admin-editor">
          <div className="admin-panel-head">
            <h2>
              {editing === "new"
                ? "New product"
                : `Edit ${editing.productName}`}
            </h2>
            <button onClick={() => setEditing(null)}>
              <X size={17} /> Close
            </button>
          </div>
          <form onSubmit={save} className="admin-form-grid">
            <label>
              Product name
              <input
                name="productName"
                required
                maxLength={200}
                defaultValue={editing === "new" ? "" : editing.productName}
              />
            </label>
            <label>
              Price
              <input
                name="price"
                type="number"
                min="0.01"
                max="9999.99"
                step="0.01"
                required
                defaultValue={editing === "new" ? "" : editing.price}
              />
            </label>
            <label>
              Stock quantity
              <input
                name="stockQuantity"
                type="number"
                min="0"
                step="1"
                required
                defaultValue={editing === "new" ? "0" : editing.stockQuantity}
              />
            </label>
            <label>
              Category
              <select
                name={editing === "new" ? "categorySlug" : "categoryId"}
                required
                value={editCategoryId}
                onChange={(event) => setEditCategoryId(event.target.value)}
              >
                <option value="" disabled>
                  {categories.loading
                    ? "Loading categories…"
                    : "Select category"}
                </option>
                {categories.data
                  ?.filter((item) => editing !== "new" || item.slug)
                  .map((item) => (
                    <option
                      value={editing === "new" ? item.slug! : item.id}
                      key={item.id}
                    >
                      {item.categoryName}
                    </option>
                  ))}
              </select>
            </label>
            {editing === "new" && (
              <>
                <label>
                  Image
                  <input
                    name="imageFile"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    required
                  />
                </label>
              </>
            )}
            <label className="admin-field-wide">
              Description
              <textarea
                name="description"
                rows={4}
                defaultValue={
                  editing === "new" ? "" : (editing.description ?? "")
                }
              />
            </label>
            <div className="admin-field-wide admin-form-actions">
              <button
                className="admin-primary"
                disabled={busy || categories.loading || !!categories.error}
              >
                {busy
                  ? "Saving…"
                  : editing === "new"
                    ? "Create product"
                    : "Save changes"}
              </button>
              <button
                type="button"
                className="admin-secondary"
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
            </div>
          </form>
          {categories.error && (
            <p className="admin-alert" role="alert">
              Categories could not load: {categories.error}{" "}
              <button onClick={categories.reload}>Retry</button>
            </p>
          )}
          {editing !== "new" && (
            <p className="admin-muted">
              Product images cannot be changed in this editor.
            </p>
          )}
        </section>
      )}
      <div className="admin-toolbar">
        <label className="admin-search">
          <Search size={17} />
          <input
            placeholder="Search products"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <label className="admin-select-label">
          Category
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="">All categories</option>
            {categories.data?.map((item) => (
              <option key={item.id} value={item.id}>
                {item.categoryName}
              </option>
            ))}
          </select>
        </label>
      </div>
      <ResourceState
        loading={products.loading}
        error={products.error}
        retry={products.reload}
      >
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Stock</th>
                <th className="numeric">Price</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((product) => (
                <tr key={product.id}>
                  <td>
                    <div className="admin-product-cell">
                      <div className="admin-product-image">
                        {imageUrl(product.imageUrl) && (
                          <img src={imageUrl(product.imageUrl)!} alt="" />
                        )}
                      </div>
                      <span className="admin-strong">
                        {product.productName}
                        <small>/{product.productSlug}</small>
                      </span>
                    </div>
                  </td>
                  <td>
                    {categories.data?.find(
                      (item) => item.id === product.categoryId,
                    )?.categoryName ?? "—"}
                  </td>
                  <td>
                    <span
                      className={
                        product.stockQuantity <= 5 ? "admin-stock-low" : ""
                      }
                    >
                      {product.stockQuantity === 0
                        ? "Out of stock"
                        : `${product.stockQuantity} in stock`}
                    </span>
                  </td>
                  <td className="numeric admin-strong">
                    {money(product.price, product.currency)}
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <button
                        onClick={() => {
                          setEditing(product);
                          setEditCategoryId(product.categoryId);
                          setError("");
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        Edit
                      </button>
                      <button
                        aria-label={`Delete ${product.productName}`}
                        disabled={busy}
                        onClick={() => void remove(product)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!items.length && (
            <p className="admin-empty">No products match this view.</p>
          )}
        </div>
      </ResourceState>
    </>
  );
}

export function CategoriesSection({ token }: { token: string }) {
  const categories = useResource(`categories:${token}`, (signal) =>
    adminApi.categories(signal),
  );
  const products = useResource(`category-products:${token}`, (signal) =>
    adminApi.products(signal),
  );
  const [editing, setEditing] = useState<Category | "new" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("categoryName") ?? "").trim();
    const description = String(data.get("description") ?? "").trim();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      if (editing === "new") {
        await adminApi.createCategory(token, name, description);
        setSuccess("Category created.");
      } else if (editing) {
        await adminApi.updateCategory(token, editing.id, name, description);
        setSuccess("Category updated.");
      }
      categories.reload();
      setEditing(null);
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }
  async function remove(item: Category) {
    const count =
      products.data?.filter((product) => product.categoryId === item.id)
        .length ?? 0;
    if (
      !window.confirm(
        `Delete ${item.categoryName}?${count ? ` It contains ${count} product${count === 1 ? "" : "s"}.` : ""} This action cannot be undone.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await adminApi.deleteCategory(token, item.id);
      categories.reload();
      setEditing(null);
      setSuccess("Category deleted.");
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <SectionHeading
        title="Categories"
        description="Organize the collection customers browse."
        action={
          <button
            className="admin-primary"
            onClick={() => {
              setEditing("new");
              setError("");
            }}
          >
            <Plus size={16} /> Add category
          </button>
        }
      />
      <Notice error={error} success={success} />
      {editing && (
        <section className="admin-editor">
          <div className="admin-panel-head">
            <h2>
              {editing === "new"
                ? "New category"
                : `Edit ${editing.categoryName}`}
            </h2>
            <button onClick={() => setEditing(null)}>
              <X size={17} /> Close
            </button>
          </div>
          <form className="admin-form-grid" onSubmit={save}>
            <label>
              Category name
              <input
                name="categoryName"
                required
                maxLength={200}
                defaultValue={editing === "new" ? "" : editing.categoryName}
              />
            </label>
            <label className="admin-field-wide">
              Description
              <textarea
                name="description"
                rows={3}
                defaultValue={
                  editing === "new" ? "" : (editing.description ?? "")
                }
              />
            </label>
            <div className="admin-field-wide admin-form-actions">
              <button className="admin-primary" disabled={busy}>
                {busy
                  ? "Saving…"
                  : editing === "new"
                    ? "Create category"
                    : "Save changes"}
              </button>
              <button
                type="button"
                className="admin-secondary"
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}
      <ResourceState
        loading={categories.loading}
        error={categories.error}
        retry={categories.reload}
      >
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Description</th>
                <th>Products</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {categories.data?.map((item) => (
                <tr key={item.id}>
                  <td className="admin-strong">
                    {item.categoryName}
                    <small>/{item.slug}</small>
                  </td>
                  <td>{item.description || "—"}</td>
                  <td>
                    {products.data?.filter(
                      (product) => product.categoryId === item.id,
                    ).length ?? "—"}
                  </td>
                  <td>
                    <div className="admin-row-actions">
                      <button onClick={() => setEditing(item)}>Edit</button>
                      <button
                        aria-label={`Delete ${item.categoryName}`}
                        disabled={busy}
                        onClick={() => void remove(item)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!categories.data?.length && (
            <p className="admin-empty">
              Create the first category to organize your products.
            </p>
          )}
        </div>
      </ResourceState>
    </>
  );
}

export function CouponsSection({ token }: { token: string }) {
  const coupons = useResource(`coupons:${token}`, (signal) =>
    adminApi.coupons(token, signal),
  );
  const [creating, setCreating] = useState(false);
  const [kind, setKind] = useState<"percent" | "free_shipping">("percent");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const raw = (key: string) => String(data.get(key) ?? "").trim();
    const startsAt = raw("startsAt")
      ? new Date(raw("startsAt")).toISOString()
      : null;
    const expiresAt = raw("expiresAt")
      ? new Date(raw("expiresAt")).toISOString()
      : null;
    const assignedUserId = raw("assignedUserId") || null;
    const maxUsesRaw = raw("maxUses");
    const maxUses = maxUsesRaw ? Number(maxUsesRaw) : null;
    if (
      maxUses !== null &&
      (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 2147483647)
    ) {
      setError("Max uses must be a whole number between 1 and 2,147,483,647.");
      return;
    }
    if (!startsAt && !expiresAt && !assignedUserId && maxUses === null) {
      setError("Add a usage limit, validity date, or customer ID.");
      return;
    }
    if (startsAt && expiresAt && startsAt >= expiresAt) {
      setError("The end date must be after the start date.");
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await adminApi.createCoupon(token, {
        code: raw("code") || null,
        kind,
        discountPercent: kind === "percent" ? raw("discountPercent") : null,
        startsAt,
        expiresAt,
        assignedUserId,
        maxUses,
      });
      coupons.reload();
      setCreating(false);
      setSuccess("Coupon created.");
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <SectionHeading
        title="Coupons"
        description="Create limited offers and review issued codes."
        action={
          <button
            className="admin-primary"
            onClick={() => {
              setCreating(true);
              setError("");
            }}
          >
            <Plus size={16} /> Create coupon
          </button>
        }
      />
      <Notice error={error} success={success} />
      {creating && (
        <section className="admin-editor">
          <div className="admin-panel-head">
            <h2>New coupon</h2>
            <button onClick={() => setCreating(false)}>
              <X size={17} /> Close
            </button>
          </div>
          <form className="admin-form-grid" onSubmit={save}>
            <label>
              Code{" "}
              <span className="admin-optional">
                optional · generated if blank
              </span>
              <input
                name="code"
                minLength={4}
                maxLength={64}
                placeholder="e.g. VEE10"
              />
            </label>
            <label>
              Type
              <select
                value={kind}
                onChange={(event) => setKind(event.target.value as typeof kind)}
              >
                <option value="percent">Percentage off</option>
                <option value="free_shipping">Free shipping</option>
              </select>
            </label>
            {kind === "percent" && (
              <label>
                Discount percent
                <input
                  name="discountPercent"
                  type="number"
                  min="0.01"
                  max="99.99"
                  step="0.01"
                  required
                />
              </label>
            )}
            <label>
              Starts at
              <input name="startsAt" type="datetime-local" />
            </label>
            <label>
              Expires at
              <input name="expiresAt" type="datetime-local" />
            </label>
            <label>
              Max uses <span className="admin-optional">optional</span>
              <input
                name="maxUses"
                type="number"
                min="1"
                max="2147483647"
                step="1"
                placeholder="Shared redemptions"
              />
            </label>
            <label>
              Assign to customer ID{" "}
              <span className="admin-optional">optional</span>
              <input
                name="assignedUserId"
                type="text"
                placeholder="Customer UUID"
              />
            </label>
            <p className="admin-field-wide admin-muted">
              Set at least one limit: max uses, a date, or a customer. Max uses
              is shared by everyone with the code; use 1 for a one-time gift.
              Assign a customer to restrict who can redeem it. Combining dates
              and uses ends the offer when either limit is reached.
            </p>
            <div className="admin-field-wide admin-form-actions">
              <button className="admin-primary" disabled={busy}>
                {busy ? "Creating…" : "Create coupon"}
              </button>
              <button
                type="button"
                className="admin-secondary"
                onClick={() => setCreating(false)}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}
      <ResourceState
        loading={coupons.loading}
        error={coupons.error}
        retry={coupons.reload}
      >
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Offer</th>
                <th>Validity</th>
                <th>Usage</th>
                <th>Assigned customer</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {coupons.data?.map((coupon: Coupon) => (
                <tr key={coupon.id}>
                  <td className="admin-strong">{coupon.code}</td>
                  <td>
                    {coupon.kind === "percent"
                      ? `${coupon.discountPercent}% off`
                      : "Free shipping"}
                  </td>
                  <td>
                    {coupon.startsAt || coupon.expiresAt
                      ? `${couponDateTime(coupon.startsAt)} – ${couponDateTime(coupon.expiresAt)}`
                      : "No date limit"}
                  </td>
                  <td>
                    {coupon.maxUses === null
                      ? `${coupon.usesCount} used · No use limit`
                      : `${coupon.usesCount} / ${coupon.maxUses} used · ${Math.max(0, coupon.remainingUses ?? coupon.maxUses - coupon.usesCount)} left`}
                  </td>
                  <td>{coupon.assignedUserId ?? "Any eligible customer"}</td>
                  <td>
                    <span
                      className={`admin-badge ${couponState(coupon).style}`}
                    >
                      {couponState(coupon).label}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!coupons.data?.length && (
            <p className="admin-empty">
              No coupons yet. Create an offer to get started.
            </p>
          )}
        </div>
        <p className="admin-table-note">
          The API currently supports creating and listing coupons; editing or
          deactivating an existing code is unavailable.
        </p>
      </ResourceState>
    </>
  );
}

function ReportTarget({ token, report }: { token: string; report: Report }) {
  const target = useResource<
    | { kind: "product"; product: Product | null }
    | { kind: "review"; review: Review }
    | { kind: "missing" }
  >(`report-target:${token}:${report.id}`, async (signal) => {
    if (report.productId) {
      const products = await adminApi.products(signal);
      return {
        kind: "product",
        product: products.find((item) => item.id === report.productId) ?? null,
      };
    }
    try {
      return {
        kind: "review",
        review: await adminApi.review(token, report.reviewId!, signal),
      };
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 404)
        return { kind: "missing" };
      throw cause;
    }
  });
  const [removed, setRemoved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function removeReview() {
    if (
      !report.reviewId ||
      !window.confirm("Remove this review? This action cannot be undone.")
    )
      return;
    setBusy(true);
    setError("");
    try {
      await adminApi.deleteReview(token, report.reviewId);
      setRemoved(true);
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="admin-report-target">
      <h3>Reported content</h3>
      <ResourceState
        loading={target.loading}
        error={target.error}
        retry={target.reload}
      >
        {target.data?.kind === "product" &&
          (target.data.product ? (
            <div className="admin-target-product">
              {imageUrl(target.data.product.imageUrl) && (
                <img src={imageUrl(target.data.product.imageUrl)!} alt="" />
              )}
              <div>
                <strong>{target.data.product.productName}</strong>
                <p>
                  {target.data.product.description || "No product description."}
                </p>
                <small>
                  {money(
                    target.data.product.price,
                    target.data.product.currency,
                  )}{" "}
                  · {target.data.product.stockQuantity} in stock
                </small>
              </div>
            </div>
          ) : (
            <p className="admin-muted">
              This product is no longer in the catalog.
            </p>
          ))}
        {target.data?.kind === "review" &&
          (removed ? (
            <p className="admin-success" role="status">
              Review removed. Record a resolution below to close the report.
            </p>
          ) : (
            <>
              <div className="admin-target-review">
                <strong>
                  {target.data.review.username} · {target.data.review.rating}/5
                  stars
                </strong>
                <p>{target.data.review.comment || "No written comment."}</p>
                <small>{date(target.data.review.createdAt)}</small>
              </div>
              {report.status === "open" && (
                <button
                  className="admin-danger"
                  disabled={busy}
                  onClick={() => void removeReview()}
                >
                  <Trash2 size={15} /> Remove review
                </button>
              )}
            </>
          ))}
        {target.data?.kind === "missing" && (
          <p className="admin-muted">This review has already been removed.</p>
        )}
      </ResourceState>
      <Notice error={error} success="" />
    </section>
  );
}

export function ReportsSection({ token }: { token: string }) {
  const [status, setStatus] = useState("");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<Report | null>(null);
  const drawer = useDrawer(Boolean(selected), () => setSelected(null));
  const [resolution, setResolution] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const reports = useResource(
    `reports:${token}:${status}:${offset}`,
    (signal) => adminApi.reports(token, offset, status, signal),
  );
  async function moderate(next: "resolved" | "dismissed") {
    if (!selected || !resolution.trim()) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      await adminApi.moderateReport(
        token,
        selected.id,
        next,
        resolution.trim(),
      );
      reports.reload();
      setSelected(null);
      setResolution("");
      setSuccess(`Report ${next}.`);
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <SectionHeading
        title="Reports"
        description="Review customer concerns and record each decision."
        action={
          <button className="admin-secondary" onClick={reports.reload}>
            <RefreshCw size={15} /> Refresh
          </button>
        }
      />
      <Notice error={error} success={success} />
      <div className="admin-toolbar">
        <label className="admin-select-label">
          Status
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setOffset(0);
            }}
          >
            <option value="">All reports</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>
        </label>
      </div>
      <ResourceState
        loading={reports.loading}
        error={reports.error}
        retry={reports.reload}
      >
        <div className="admin-mobile-list">
          {reports.data?.map((report) => (
            <button
              key={report.id}
              onClick={() => {
                setSelected(report);
                setResolution(report.resolution ?? "");
                setError("");
              }}
            >
              <span>
                <strong>{statusLabel(report.targetType)} report</strong>
                <span className={`admin-badge status-${report.status}`}>
                  {report.status}
                </span>
              </span>
              <span>{report.reason}</span>
              <small>{date(report.createdAt)}</small>
            </button>
          ))}
          {!reports.data?.length && (
            <p className="admin-empty">No reports match this view.</p>
          )}
        </div>
        <div className="admin-table-wrap admin-desktop-table">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Reported item</th>
                <th>Reason</th>
                <th>Submitted</th>
                <th>Status</th>
                <th>
                  <span className="sr-only">Details</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {reports.data?.map((report) => (
                <tr key={report.id}>
                  <td className="admin-strong">
                    {statusLabel(report.targetType)}
                    <small>{report.productId ?? report.reviewId}</small>
                  </td>
                  <td className="admin-reason-cell">{report.reason}</td>
                  <td>{date(report.createdAt)}</td>
                  <td>
                    <span className={`admin-badge status-${report.status}`}>
                      {report.status}
                    </span>
                  </td>
                  <td>
                    <button
                      className="admin-row-action"
                      onClick={() => {
                        setSelected(report);
                        setResolution(report.resolution ?? "");
                        setError("");
                      }}
                    >
                      Review <ChevronRight size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!reports.data?.length && (
            <p className="admin-empty">No reports match this view.</p>
          )}
        </div>
        <div className="admin-pagination">
          <span>Showing {reports.data?.length ?? 0} reports on this page</span>
          <div>
            <button
              className="admin-secondary"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - 50))}
            >
              <ChevronLeft size={15} /> Previous
            </button>
            <button
              className="admin-secondary"
              disabled={(reports.data?.length ?? 0) < 50}
              onClick={() => setOffset(offset + 50)}
            >
              Next <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </ResourceState>
      {selected && (
        <div
          className="admin-drawer-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelected(null);
          }}
        >
          <aside
            ref={drawer}
            className="admin-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Report details"
          >
            <div className="admin-drawer-header">
              <div>
                <small>REPORT DETAILS</small>
                <h2>{statusLabel(selected.targetType)} report</h2>
              </div>
              <button
                aria-label="Close details"
                onClick={() => setSelected(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="admin-drawer-body">
              <Notice error={error} success="" />
              <p>
                <span className={`admin-badge status-${selected.status}`}>
                  {selected.status}
                </span>
              </p>
              <h3>Reason</h3>
              <p>{selected.reason}</p>
              <ReportTarget key={selected.id} token={token} report={selected} />
              <h3>Submitted</h3>
              <p>{date(selected.createdAt)}</p>
              <h3>Resolution</h3>
              {selected.status === "open" ? (
                <>
                  <label className="admin-drawer-field">
                    Decision notes
                    <textarea
                      rows={5}
                      value={resolution}
                      onChange={(event) => setResolution(event.target.value)}
                      required
                      maxLength={2000}
                      placeholder="Explain the decision for the audit record"
                    />
                  </label>
                  <div className="admin-actions">
                    <button
                      className="admin-primary"
                      disabled={busy || !resolution.trim()}
                      onClick={() => void moderate("resolved")}
                    >
                      Resolve report
                    </button>
                    <button
                      className="admin-secondary"
                      disabled={busy || !resolution.trim()}
                      onClick={() => void moderate("dismissed")}
                    >
                      Dismiss report
                    </button>
                  </div>
                </>
              ) : (
                <p>{selected.resolution || "No resolution recorded."}</p>
              )}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
