import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Minus,
  Plus,
  ShoppingBag,
} from "lucide-react";
import { ApiError, messageOf } from "../api/client";
import { formatPrice, storeApi } from "../api/store";
import type {
  BagItem,
  CheckoutOrder,
  DeliveryArea,
  OrderQuote,
  OrderReceipt,
  Product,
} from "../api/store";
import { useSession } from "../auth/Session";
import ProductImage from "../components/ProductImage";
import QuantityInput from "../components/QuantityInput";
import { navigateTo } from "../navigation";
import { estimatedDeliveryDate } from "./deliveryDate";
import { clearReceipt, readReceipt } from "./receipt";
import "./checkout.css";

type Props = {
  bag: Record<string, number>;
  setBag: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  products: Product[];
  onPlaced: (order: CheckoutOrder) => void;
};

function money(value: string, currency: string) {
  return formatPrice({ price: value, currency });
}

export function CheckoutPage({ bag, setBag, products, onPlaced }: Props) {
  const session = useSession();
  const [mode, setMode] = useState<"guest" | "account">(
    session.token ? "account" : "guest",
  );
  const [quote, setQuote] = useState<OrderQuote | null>(null);
  const [quoteError, setQuoteError] = useState("");
  const [quoting, setQuoting] = useState(true);
  const [revision, setRevision] = useState(0);
  const [couponInput, setCouponInput] = useState("");
  const [coupon, setCoupon] = useState<string | null>(null);
  const [couponError, setCouponError] = useState("");
  const [name, setName] = useState(session.user?.name ?? "");
  const [email, setEmail] = useState(session.user?.email ?? "");
  const [phone, setPhone] = useState(session.user?.phone ?? "");
  const [address, setAddress] = useState(session.user?.address ?? "");
  const [area, setArea] = useState<DeliveryArea | "">("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [signingIn, setSigningIn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [itemBusy, setItemBusy] = useState(false);
  const syncRef = useRef<{ key: string; promise: Promise<void> } | null>(null);
  const attemptRef = useRef<{ fingerprint: string; key: string } | null>(null);
  const bagItems: BagItem[] = Object.entries(bag)
    .filter(([, quantity]) => quantity > 0)
    .map(([productId, quantity]) => ({ productId, quantity }));
  const bagKey = JSON.stringify(bagItems);
  const account = mode === "account" && Boolean(session.token);
  const deliveryDate = estimatedDeliveryDate(new Date()).toLocaleDateString(
    "en-EG",
    { weekday: "long", day: "numeric", month: "long" },
  );

  useEffect(() => {
    if (!session.user) return;
    setName(session.user.name);
    setEmail(session.user.email);
    setPhone(session.user.phone || "");
    setAddress(session.user.address || "");
  }, [session.user]);

  useEffect(() => {
    let active = true;
    setQuoteError("");
    if (mode === "account" && !session.token) {
      setQuoting(false);
      return;
    }
    if (!account && bagItems.length === 0) {
      setQuoting(false);
      return;
    }
    setQuoting(true);
    async function load() {
      try {
        let result: OrderQuote;
        if (account) {
          const token = session.token!;
          const syncKey = `${token}:${bagKey}`;
          if (syncRef.current?.key !== syncKey) {
            const promise = (async () => {
              let cart = await storeApi.cart(token);
              for (const item of bagItems) {
                const saved = cart.items.find(
                  (entry) => entry.productId === item.productId,
                );
                if (!saved) {
                  cart = await storeApi.addCartItem(
                    token,
                    item.productId,
                    item.quantity,
                  );
                } else if (saved.quantity < item.quantity) {
                  cart = await storeApi.updateCartItem(
                    token,
                    item.productId,
                    item.quantity,
                  );
                }
              }
            })();
            syncRef.current = { key: syncKey, promise };
          }
          try {
            await syncRef.current.promise;
          } catch (error) {
            syncRef.current = null;
            throw error;
          }
          result = await storeApi.cartQuote(token, coupon);
        } else {
          result = await storeApi.guestQuote(bagItems, coupon);
        }
        if (active) setQuote(result);
      } catch (error) {
        if (!active) return;
        if (
          coupon &&
          error instanceof ApiError &&
          [400, 403, 404, 409].includes(error.status) &&
          /^coupon\b/i.test(error.message)
        ) {
          setCouponError(messageOf(error));
          setQuote(null);
          setCoupon(null);
        } else {
          setQuote(null);
          setQuoteError(messageOf(error));
        }
      } finally {
        if (active) setQuoting(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
    // bagKey captures the selected products and quantities without a render loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, mode, session.token, bagKey, coupon, revision]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSigningIn(true);
    setLoginError("");
    try {
      await session.signIn(loginEmail.trim(), loginPassword);
      setMode("account");
      setLoginPassword("");
    } catch (error) {
      setLoginError(messageOf(error));
    } finally {
      setSigningIn(false);
    }
  }

  function changeGuestQuantity(productId: string, delta: number) {
    setQuote(null);
    const stock = products.find((item) => item.id === productId)?.stockQuantity;
    setBag((current) => {
      const next = { ...current };
      const quantity = Math.max(
        0,
        Math.min(stock ?? 100, (current[productId] ?? 0) + delta),
      );
      if (quantity) next[productId] = quantity;
      else delete next[productId];
      return next;
    });
  }

  function setGuestQuantity(productId: string, quantity: number) {
    setQuote(null);
    setBag((current) => ({ ...current, [productId]: quantity }));
  }

  async function changeAccountQuantity(productId: string, quantity: number) {
    if (!session.token) return;
    setItemBusy(true);
    setQuote(null);
    setQuoteError("");
    try {
      if (quantity > 0)
        await storeApi.updateCartItem(session.token, productId, quantity);
      else await storeApi.removeCartItem(session.token, productId);
      setBag((current) => {
        const next = { ...current };
        if (quantity > 0) next[productId] = quantity;
        else delete next[productId];
        return next;
      });
      setRevision((current) => current + 1);
    } catch (error) {
      setQuoteError(messageOf(error));
    } finally {
      setItemBusy(false);
    }
  }

  async function placeOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!quote || quoting || itemBusy || busy) return;
    const errors: Record<string, string> = {};
    if (!name.trim()) errors.name = "Enter your full name.";
    if (!account && !email.trim()) errors.email = "Enter your email address.";
    else if (!account && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      errors.email = "Enter a valid email address.";
    if (!phone.trim())
      errors.phone = "Enter a phone number so we can contact you for delivery.";
    else if (phone.trim().length < 5)
      errors.phone =
        "Enter a phone number with at least 5 characters for delivery.";
    if (!area) errors.area = "Choose a delivery area.";
    if (!address.trim()) errors.address = "Enter your delivery address.";
    setFieldErrors(errors);
    if (!area || Object.keys(errors).length) {
      setSubmitError("Please complete the required delivery details.");
      document.getElementById(`checkout-${Object.keys(errors)[0]}`)?.focus();
      return;
    }
    setBusy(true);
    setSubmitError("");
    try {
      let order: CheckoutOrder;
      const common = {
        name: name.trim(),
        phone: phone.trim(),
        shippingAddress: address.trim(),
        deliveryArea: area,
        couponCode: coupon,
        expectedTotal: quote.totalPrice,
      };
      if (account) {
        order = await storeApi.checkout(session.token!, common);
      } else {
        const body = { ...common, email: email.trim(), items: bagItems };
        const fingerprint = JSON.stringify(body);
        if (attemptRef.current?.fingerprint !== fingerprint) {
          attemptRef.current = { fingerprint, key: crypto.randomUUID() };
        }
        order = await storeApi.guestCheckout(body, attemptRef.current.key);
      }
      onPlaced(order);
    } catch (error) {
      setSubmitError(messageOf(error));
      // A timed-out guest request may already have placed the order. Keep its
      // payload and idempotency key available for an exact retry.
      if (!(error instanceof ApiError) || error.status !== 0)
        setRevision((current) => current + 1);
    } finally {
      setBusy(false);
    }
  }

  const rows =
    quote?.items ??
    bagItems.map((item) => ({
      ...item,
      productName:
        products.find((product) => product.id === item.productId)
          ?.productName ?? "Product",
      unitPrice:
        products.find((product) => product.id === item.productId)?.price ?? "0",
      subtotal: "0",
    }));
  const empty =
    !quoting &&
    !quote &&
    rows.length === 0 &&
    (!quoteError || /cart is empty/i.test(quoteError));

  return (
    <div className="checkout-page">
      <a className="skip-link" href="#checkout-main">
        Skip to checkout
      </a>
      <header className="checkout-header">
        <a
          href="/collection"
          onClick={(event) => navigateTo(event, "/collection")}
          className="checkout-back"
        >
          <ArrowLeft size={17} /> Back to the collection
        </a>
        <a
          href="/"
          onClick={(event) => navigateTo(event, "/")}
          className="wordmark"
          aria-label="Vee home"
        >
          Vee
        </a>
        <span className="checkout-header-note">Secure checkout</span>
      </header>
      <main id="checkout-main" className="checkout-layout">
        <div className="checkout-form-column">
          <div className="checkout-intro">
            <span className="checkout-eyebrow">THE VEE CHECKOUT</span>
            <h1>
              Make it <em>yours.</em>
            </h1>
            <p>A few details, and your little ritual is on its way.</p>
          </div>
          <section
            className="checkout-section"
            aria-labelledby="checkout-way-title"
          >
            <div className="checkout-section-title">
              <span>01</span>
              <h2 id="checkout-way-title">How would you like to checkout?</h2>
            </div>
            <div className="checkout-choices">
              <button
                className={`checkout-choice ${mode === "guest" ? "selected" : ""}`}
                type="button"
                onClick={() => setMode("guest")}
                aria-pressed={mode === "guest"}
              >
                <span className="checkout-choice-top">
                  <strong>Checkout as guest</strong>
                  <span className="choice-indicator" aria-hidden="true">
                    {!account && <Check size={14} />}
                  </span>
                </span>
                <small>
                  No account needed. We’ll send your order details by email.
                </small>
              </button>
              <button
                className={`checkout-choice ${mode === "account" ? "selected" : ""}`}
                type="button"
                onClick={() => setMode("account")}
                aria-pressed={mode === "account"}
              >
                <span className="checkout-choice-top">
                  <strong>
                    {session.token ? "Use my account" : "Sign in to checkout"}
                  </strong>
                  <span className="choice-indicator" aria-hidden="true">
                    {account && <Check size={14} />}
                  </span>
                </span>
                <small>Use your saved cart and account details.</small>
              </button>
            </div>
            {mode === "account" && !session.token && (
              <form
                className="checkout-signin"
                aria-label="Sign in to your account"
                onSubmit={signIn}
              >
                <label>
                  Email{" "}
                  <input
                    type="email"
                    autoComplete="email"
                    value={loginEmail}
                    onChange={(event) => setLoginEmail(event.target.value)}
                    required
                  />
                </label>
                <label>
                  Password{" "}
                  <input
                    type="password"
                    autoComplete="current-password"
                    value={loginPassword}
                    onChange={(event) => setLoginPassword(event.target.value)}
                    required
                  />
                </label>
                {loginError && (
                  <p className="checkout-error" role="alert">
                    {loginError}
                  </p>
                )}
                <button
                  type="submit"
                  className="checkout-outline-button"
                  disabled={signingIn}
                >
                  {signingIn ? "Signing in…" : "Sign in"}{" "}
                  <ArrowRight size={15} />
                </button>
              </form>
            )}
          </section>
          <form id="checkout-order-form" onSubmit={placeOrder} noValidate>
            <section
              className="checkout-section"
              aria-labelledby="delivery-title"
            >
              <div className="checkout-section-title">
                <span>02</span>
                <h2 id="delivery-title">Delivery details</h2>
              </div>
              <p className="checkout-section-note">
                Required fields are marked *. We’ll use these details to deliver
                your order.
              </p>
              <div className="checkout-fields">
                <label>
                  <span>
                    Name <span aria-hidden="true">*</span>
                  </span>
                  <input
                    id="checkout-name"
                    aria-label="Name"
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      setFieldErrors((current) => ({ ...current, name: "" }));
                    }}
                    autoComplete="name"
                    placeholder="Your full name"
                    minLength={1}
                    maxLength={200}
                    required
                    aria-invalid={Boolean(fieldErrors.name)}
                    aria-describedby={
                      fieldErrors.name ? "checkout-name-error" : undefined
                    }
                  />
                  {fieldErrors.name && (
                    <small
                      id="checkout-name-error"
                      className="checkout-field-error"
                      role="alert"
                    >
                      {fieldErrors.name}
                    </small>
                  )}
                </label>
                <label>
                  <span>
                    Email <span aria-hidden="true">*</span>
                  </span>
                  <input
                    id="checkout-email"
                    aria-label="Email"
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setFieldErrors((current) => ({ ...current, email: "" }));
                    }}
                    autoComplete="email"
                    placeholder="you@example.com"
                    readOnly={account}
                    required
                    aria-invalid={Boolean(fieldErrors.email)}
                    aria-describedby={
                      fieldErrors.email ? "checkout-email-error" : undefined
                    }
                  />
                  {fieldErrors.email && (
                    <small
                      id="checkout-email-error"
                      className="checkout-field-error"
                      role="alert"
                    >
                      {fieldErrors.email}
                    </small>
                  )}
                </label>
                <label>
                  <span>
                    Phone number <span aria-hidden="true">*</span>
                  </span>
                  <input
                    id="checkout-phone"
                    aria-label="Phone number"
                    type="tel"
                    value={phone}
                    onChange={(event) => {
                      setPhone(event.target.value);
                      setFieldErrors((current) => ({ ...current, phone: "" }));
                    }}
                    autoComplete="tel"
                    placeholder="Your delivery contact number"
                    minLength={5}
                    maxLength={40}
                    required
                    aria-invalid={Boolean(fieldErrors.phone)}
                    aria-describedby={
                      fieldErrors.phone
                        ? "checkout-phone-error checkout-phone-hint"
                        : "checkout-phone-hint"
                    }
                  />
                  <small
                    id="checkout-phone-hint"
                    className="checkout-field-hint"
                  >
                    Required so the delivery team can contact you about your
                    order.
                  </small>
                  {fieldErrors.phone && (
                    <small
                      id="checkout-phone-error"
                      className="checkout-field-error"
                      role="alert"
                    >
                      {fieldErrors.phone}
                    </small>
                  )}
                </label>
                <label>
                  <span>
                    Delivery area <span aria-hidden="true">*</span>
                  </span>
                  <select
                    id="checkout-area"
                    aria-label="Delivery area"
                    value={area}
                    onChange={(event) => {
                      setArea(event.target.value as DeliveryArea | "");
                      setFieldErrors((current) => ({ ...current, area: "" }));
                    }}
                    required
                    aria-invalid={Boolean(fieldErrors.area)}
                    aria-describedby={
                      fieldErrors.area ? "checkout-area-error" : undefined
                    }
                  >
                    <option value="">Select your area</option>
                    <option value="Cairo">Cairo</option>
                    <option value="New Cairo">New Cairo</option>
                    <option value="Giza">Giza</option>
                  </select>
                  {fieldErrors.area && (
                    <small
                      id="checkout-area-error"
                      className="checkout-field-error"
                      role="alert"
                    >
                      {fieldErrors.area}
                    </small>
                  )}
                </label>
                <label>
                  <span>
                    Delivery address <span aria-hidden="true">*</span>
                  </span>
                  <textarea
                    id="checkout-address"
                    aria-label="Delivery address"
                    value={address}
                    onChange={(event) => {
                      setAddress(event.target.value);
                      setFieldErrors((current) => ({
                        ...current,
                        address: "",
                      }));
                    }}
                    autoComplete="street-address"
                    placeholder="Street, building, apartment, landmark"
                    maxLength={1000}
                    required
                    rows={3}
                    aria-invalid={Boolean(fieldErrors.address)}
                    aria-describedby={
                      fieldErrors.address ? "checkout-address-error" : undefined
                    }
                  />
                  {fieldErrors.address && (
                    <small
                      id="checkout-address-error"
                      className="checkout-field-error"
                      role="alert"
                    >
                      {fieldErrors.address}
                    </small>
                  )}
                </label>
              </div>
              {account && (
                <p className="checkout-confirmation-note">
                  Order confirmation will be sent to {session.user?.email}.
                </p>
              )}
            </section>
            <section
              className="checkout-section payment-section"
              aria-labelledby="payment-title"
            >
              <div className="checkout-section-title">
                <span>03</span>
                <h2 id="payment-title">Payment</h2>
              </div>
              <div className="payment-card">
                <span className="payment-mark">
                  <Check size={17} />
                </span>
                <span>
                  <strong>Cash on delivery</strong>
                  <small>Pay when your order arrives.</small>
                </span>
              </div>
            </section>
          </form>
        </div>
        <aside className="checkout-review" aria-labelledby="review-title">
          <div className="checkout-review-inner">
            <div className="checkout-review-heading">
              <span className="checkout-eyebrow">THE FINISHING TOUCH</span>
              <h2 id="review-title">Your order</h2>
              <p>Review your pieces before placing your order.</p>
            </div>
            {empty ? (
              <div className="checkout-empty">
                <ShoppingBag size={33} strokeWidth={1.2} />
                <h3>Your bag is waiting.</h3>
                <p>Explore the collection and add something lovely.</p>
                <a
                  href="/collection"
                  onClick={(event) => navigateTo(event, "/collection")}
                >
                  Shop the collection <ArrowRight size={15} />
                </a>
              </div>
            ) : (
              <>
                <div className="checkout-items" aria-live="polite">
                  {rows.map((item) => {
                    const product = products.find(
                      (entry) => entry.id === item.productId,
                    );
                    return (
                      <div className="checkout-item" key={item.productId}>
                        <div className="checkout-item-image">
                          <ProductImage
                            src={product?.imageUrl ?? null}
                            alt={item.productName}
                          />
                        </div>
                        <div className="checkout-item-copy">
                          <strong>{item.productName}</strong>
                          <span>
                            {quote
                              ? money(item.unitPrice, quote.currency)
                              : product
                                ? formatPrice(product)
                                : ""}
                          </span>
                          <div className="checkout-quantity">
                            <button
                              type="button"
                              aria-label={`Decrease ${item.productName} quantity`}
                              disabled={itemBusy || quoting}
                              onClick={() =>
                                account
                                  ? void changeAccountQuantity(
                                      item.productId,
                                      item.quantity - 1,
                                    )
                                  : changeGuestQuantity(item.productId, -1)
                              }
                            >
                              <Minus size={13} />
                            </button>
                            <QuantityInput
                              productName={item.productName}
                              quantity={item.quantity}
                              max={Math.min(100, product?.stockQuantity ?? 100)}
                              disabled={itemBusy || quoting}
                              onCommit={(quantity) => {
                                if (account)
                                  void changeAccountQuantity(
                                    item.productId,
                                    quantity,
                                  );
                                else setGuestQuantity(item.productId, quantity);
                              }}
                            />
                            <button
                              type="button"
                              aria-label={`Increase ${item.productName} quantity`}
                              disabled={
                                itemBusy ||
                                quoting ||
                                (product
                                  ? item.quantity >= product.stockQuantity
                                  : false)
                              }
                              onClick={() =>
                                account
                                  ? void changeAccountQuantity(
                                      item.productId,
                                      item.quantity + 1,
                                    )
                                  : changeGuestQuantity(item.productId, 1)
                              }
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                        </div>
                        {quote && (
                          <span className="checkout-item-subtotal">
                            {money(item.subtotal, quote.currency)}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="checkout-coupon">
                  <label htmlFor="checkout-coupon">Have a coupon?</label>
                  <div>
                    <input
                      id="checkout-coupon"
                      value={couponInput}
                      onChange={(event) => {
                        setCouponInput(event.target.value);
                        setCouponError("");
                      }}
                      placeholder="Enter code"
                      maxLength={64}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCouponError("");
                        setCoupon(couponInput.trim() || null);
                      }}
                      disabled={quoting}
                    >
                      {coupon ? "Update" : "Apply"}
                    </button>
                  </div>
                  {couponError && (
                    <p className="checkout-error" role="alert">
                      {couponError}
                    </p>
                  )}
                  {coupon && (
                    <button
                      type="button"
                      className="checkout-remove-coupon"
                      onClick={() => {
                        setCoupon(null);
                        setCouponInput("");
                      }}
                    >
                      Remove {coupon}
                    </button>
                  )}
                </div>
                {quoting && (
                  <p className="checkout-quote-status" role="status">
                    Updating your total…
                  </p>
                )}
                {quoteError && (
                  <div className="checkout-error" role="alert">
                    <p>{quoteError}</p>
                    <button
                      type="button"
                      onClick={() => setRevision((current) => current + 1)}
                    >
                      Try again
                    </button>
                  </div>
                )}
                {quote && !quoting && (
                  <div className="checkout-totals">
                    <div>
                      <span>Subtotal</span>
                      <span>{money(quote.subtotalPrice, quote.currency)}</span>
                    </div>
                    <div>
                      <span>Delivery</span>
                      <span>{money(quote.shippingFee, quote.currency)}</span>
                    </div>
                    {Number(quote.discountAmount) > 0 && (
                      <div className="checkout-discount">
                        <span>
                          Discount {quote.couponCode && `· ${quote.couponCode}`}
                        </span>
                        <span>
                          −{money(quote.discountAmount, quote.currency)}
                        </span>
                      </div>
                    )}
                    <div className="checkout-grand-total">
                      <strong>Total</strong>
                      <strong>{money(quote.totalPrice, quote.currency)}</strong>
                    </div>
                  </div>
                )}
                <div className="checkout-submit">
                  <p>
                    Cash on delivery · You’ll receive an order confirmation by
                    email.
                  </p>
                  <p className="checkout-delivery-estimate">
                    Estimated delivery: {deliveryDate} (two business days after
                    ordering; Sunday–Thursday).
                  </p>
                  {submitError && (
                    <p className="checkout-error" role="alert">
                      {submitError}
                    </p>
                  )}
                  <button
                    className="solid-link"
                    type="submit"
                    form="checkout-order-form"
                    disabled={
                      !quote ||
                      quoting ||
                      busy ||
                      itemBusy ||
                      !rows.length ||
                      (mode === "account" && !session.token)
                    }
                  >
                    {busy ? "Placing your order…" : "Place order"}
                    <ArrowRight size={17} />
                  </button>
                  <small>
                    By placing your order, you confirm your delivery details
                    above.
                  </small>
                </div>
              </>
            )}
          </div>
        </aside>
      </main>
      <footer className="checkout-footer">
        <span>© {new Date().getFullYear()} Vee</span>
        <span>Beauty, at a gentler pace.</span>
      </footer>
    </div>
  );
}

export function OrderConfirmation({ order }: { order: CheckoutOrder | null }) {
  const [receipt, setReceipt] = useState<OrderReceipt | null>(order);
  const [status, setStatus] = useState<"loading" | "ready" | "empty" | "error">(
    order ? "ready" : readReceipt() ? "loading" : "empty",
  );

  useEffect(() => {
    if (order) {
      setReceipt(order);
      setStatus("ready");
      return;
    }
    const reference = readReceipt();
    if (!reference) return;
    let active = true;
    storeApi
      .orderReceipt(reference.orderNumber, reference.receiptToken)
      .then((result) => {
        if (!active) return;
        setReceipt(result);
        setStatus("ready");
      })
      .catch((error: unknown) => {
        if (!active) return;
        if (error instanceof ApiError && error.status === 404) {
          clearReceipt();
          setStatus("empty");
        } else {
          setStatus("error");
        }
      });
    return () => {
      active = false;
    };
  }, [order]);

  return (
    <div className="checkout-page confirmation-page">
      <header className="checkout-header">
        <a
          href="/collection"
          onClick={(event) => navigateTo(event, "/collection")}
          className="checkout-back"
        >
          <ArrowLeft size={17} /> Back to the collection
        </a>
        <a
          href="/"
          onClick={(event) => navigateTo(event, "/")}
          className="wordmark"
        >
          Vee
        </a>
        <span />
      </header>
      <main className="confirmation-content">
        <span className="confirmation-symbol">
          <Check size={30} />
        </span>
        <span className="checkout-eyebrow">
          {receipt ? "A LITTLE MOMENT IS ON ITS WAY" : "THE VEE CHECKOUT"}
        </span>
        <h1>
          {receipt ? (
            <>
              Thank you for your <em>order.</em>
            </>
          ) : (
            <>
              Your <em>order.</em>
            </>
          )}
        </h1>
        {receipt ? (
          <>
            <p>
              Order <strong>#{receipt.orderNumber}</strong> is placed. We’ll
              send the details by email and collect{" "}
              <strong>{money(receipt.totalPrice, receipt.currency)}</strong>{" "}
              when it arrives.
            </p>
            <div className="confirmation-details">
              <span>Delivering to</span>
              <strong>{receipt.recipientName}</strong>
              <span>{receipt.shippingAddress}</span>
              {receipt.deliveryArea && <span>{receipt.deliveryArea}</span>}
              <span>{receipt.recipientPhone}</span>
            </div>
          </>
        ) : status === "loading" ? (
          <p role="status">Loading your order details…</p>
        ) : status === "error" ? (
          <p role="alert">
            We couldn’t load your order details. Refresh this page to try again,
            or check your confirmation email.
          </p>
        ) : (
          <p>
            There’s no order to show here. If you placed one, check your email
            for its confirmation and order number.
          </p>
        )}
        <a
          href="/collection"
          className="solid-link"
          onClick={(event) => navigateTo(event, "/collection")}
        >
          Continue exploring <ArrowRight size={17} />
        </a>
      </main>
    </div>
  );
}
