import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Package } from "lucide-react";
import { messageOf } from "../api/client";
import { formatPrice, storeApi } from "../api/store";
import type { AccountOrder } from "../api/store";
import { useSession } from "../auth/Session";
import AccountPanel from "../components/AccountPanel";
import { navigateTo } from "../navigation";
import "./profile.css";

const PAGE_SIZE = 10;

function orderDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : new Intl.DateTimeFormat("en-EG", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(date);
}

export default function ProfilePage() {
  const session = useSession();
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [offset, setOffset] = useState(0);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    setOrders([]);
    setOffset(0);
    setHasMore(false);
  }, [session.token]);

  useEffect(() => {
    if (!session.token) {
      setOrders([]);
      setHasMore(false);
      setError("");
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError("");
    storeApi
      .myOrders(session.token, PAGE_SIZE, offset, controller.signal)
      .then((result) => {
        if (!active) return;
        setOrders((current) =>
          offset === 0
            ? result
            : [
                ...current,
                ...result.filter(
                  (order) => !current.some((saved) => saved.id === order.id),
                ),
              ],
        );
        setHasMore(result.length === PAGE_SIZE);
      })
      .catch((cause) => {
        if (active) setError(messageOf(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [session.token, offset, revision]);

  return (
    <div className="profile-page">
      <a className="skip-link" href="#profile-main">
        Skip to profile
      </a>
      <header className="profile-header">
        <a
          href="/collection"
          className="profile-back"
          onClick={(event) => navigateTo(event, "/collection")}
        >
          <ArrowLeft size={17} /> Back to the collection
        </a>
        <a
          href="/"
          className="wordmark"
          aria-label="Vee home"
          onClick={(event) => navigateTo(event, "/")}
        >
          Vee
        </a>
        <span className="profile-header-note">Your account</span>
      </header>
      <main id="profile-main" className="profile-main">
        <div className="profile-intro">
          <h1>
            {session.user ? (
              <>
                A space for <em>you.</em>
              </>
            ) : (
              <>
                Welcome <em>back.</em>
              </>
            )}
          </h1>
          <p>
            {session.user
              ? `Hello, ${session.user.name}. Your orders and details live here.`
              : "Sign in to see your orders and manage your details."}
          </p>
        </div>
        <div
          className={`profile-grid ${session.user ? "" : "profile-grid-guest"}`}
        >
          <section className="profile-details" aria-label="Account details">
            <AccountPanel showProfileLink={false} />
          </section>
          {session.user && (
            <section
              className="profile-orders"
              aria-labelledby="profile-orders-title"
            >
              <div className="profile-orders-heading">
                <div>
                  <h2 id="profile-orders-title">Your orders</h2>
                  <p>Orders placed with your account.</p>
                </div>
                <button
                  type="button"
                  className="profile-refresh"
                  disabled={loading}
                  onClick={() => {
                    setOffset(0);
                    setRevision((current) => current + 1);
                  }}
                >
                  Refresh orders
                </button>
              </div>
              {error && (
                <div className="form-error" role="alert">
                  <p>We couldn’t load your orders. {error}</p>
                  <button
                    type="button"
                    onClick={() => setRevision((current) => current + 1)}
                  >
                    Try again
                  </button>
                </div>
              )}
              {orders.length === 0 && loading && (
                <p className="profile-order-state" role="status">
                  Loading your orders…
                </p>
              )}
              {orders.length === 0 && !loading && !error && (
                <div className="profile-empty">
                  <Package size={29} strokeWidth={1.3} />
                  <h3>No orders yet.</h3>
                  <p>Orders placed with your account will appear here.</p>
                  <a
                    href="/collection"
                    onClick={(event) => navigateTo(event, "/collection")}
                  >
                    Explore the collection <ArrowRight size={16} />
                  </a>
                </div>
              )}
              {orders.length > 0 && (
                <div className="profile-order-list">
                  {orders.map((order) => (
                    <article className="profile-order" key={order.id}>
                      <div className="profile-order-heading">
                        <div>
                          <h3>Order #{order.orderNumber}</h3>
                          <time dateTime={order.createdAt}>
                            {orderDate(order.createdAt)}
                          </time>
                        </div>
                        <span
                          className={`profile-order-status status-${order.status}`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <ul>
                        {order.items.map((item) => (
                          <li key={item.id}>
                            <span>
                              {item.productName}{" "}
                              <small>× {item.quantity}</small>
                            </span>
                            <span>
                              {formatPrice({
                                price: item.subtotal,
                                currency: order.currency,
                              })}
                            </span>
                          </li>
                        ))}
                      </ul>
                      <div className="profile-order-footer">
                        <span>
                          Delivery to {order.deliveryArea ?? "your address"}
                        </span>
                        <strong>
                          {formatPrice({
                            price: order.totalPrice,
                            currency: order.currency,
                          })}
                        </strong>
                      </div>
                    </article>
                  ))}
                </div>
              )}
              {orders.length > 0 && loading && (
                <p className="profile-order-state" role="status">
                  Loading more orders…
                </p>
              )}
              {hasMore && !loading && !error && (
                <button
                  type="button"
                  className="profile-more"
                  onClick={() => setOffset((current) => current + PAGE_SIZE)}
                >
                  Show more orders <ArrowRight size={16} />
                </button>
              )}
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
