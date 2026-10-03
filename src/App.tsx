import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Menu,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";
import { useCatalog } from "./catalog/useCatalog";
import { useSession } from "./auth/Session";
import { formatPrice } from "./api/store";
import type { CheckoutOrder, Product } from "./api/store";
import { CheckoutPage, OrderConfirmation } from "./checkout/CheckoutPage";
import { saveReceipt } from "./checkout/receipt";
import CollectionPage from "./collection/CollectionPage";
import AccountPanel from "./components/AccountPanel";
import ProductCard from "./components/ProductCard";
import ProductPanel from "./components/ProductPanel";
import ProductImage from "./components/ProductImage";
import QuantityInput from "./components/QuantityInput";
import { navigateTo } from "./navigation";
import ProfilePage from "./profile/ProfilePage";

import "@fontsource/bodoni-moda/latin-400.css";
import "@fontsource/bodoni-moda/latin-400-italic.css";
import "@fontsource/manrope/latin-400.css";
import "@fontsource/manrope/latin-500.css";
import "@fontsource/manrope/latin-600.css";

function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [placedOrder, setPlacedOrder] = useState<CheckoutOrder | null>(null);
  const { products, categories, loading, error, retry } = useCatalog();
  const session = useSession();
  const [category, setCategory] = useState<string>("All");
  const [menuOpen, setMenuOpen] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [panel, setPanel] = useState<"search" | "bag" | "account" | null>(
    window.location.pathname === "/reset-password" ? "account" : null,
  );
  const [query, setQuery] = useState("");
  const [bag, setBag] = useState<Record<string, number>>(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem("vee-bag") || "{}");
      if (!saved || typeof saved !== "object" || Array.isArray(saved))
        return {};
      const valid: Record<string, number> = {};
      for (const [id, quantity] of Object.entries(saved)) {
        if (
          /^[0-9a-f-]{36}$/i.test(id) &&
          typeof quantity === "number" &&
          Number.isInteger(quantity) &&
          quantity > 0 &&
          quantity <= 100
        )
          valid[id] = quantity;
      }
      return valid;
    } catch {
      return {};
    }
  });
  const [notice, setNotice] = useState("");
  const [detail, setDetail] = useState<Product | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const bagCount = Object.values(bag).reduce((sum, qty) => sum + qty, 0);
  const bagProducts = products.filter((product) => bag[product.id] > 0);
  const subtotalCurrency = bagProducts[0]?.currency;
  const bagSubtotal =
    subtotalCurrency &&
    bagProducts.length === Object.keys(bag).length &&
    bagProducts.every(
      (product) =>
        product.currency === subtotalCurrency &&
        Number.isFinite(Number(product.price)) &&
        Number(product.price) >= 0,
    )
      ? formatPrice({
          price: (
            bagProducts.reduce(
              (sum, product) =>
                sum + Math.round(Number(product.price) * 100) * bag[product.id],
              0,
            ) / 100
          ).toFixed(2),
          currency: subtotalCurrency,
        })
      : null;
  const filtered = products.filter(
    (product) => category === "All" || product.categoryId === category,
  );
  const results = products.filter((product) =>
    `${product.productName} ${categories.find((item) => item.id === product.categoryId)?.categoryName ?? ""}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  );

  useEffect(() => {
    const updatePath = () => setPath(window.location.pathname);
    window.addEventListener("popstate", updatePath);
    return () => window.removeEventListener("popstate", updatePath);
  }, []);

  useEffect(() => {
    let previousY = window.scrollY;
    let direction = 0;
    let distance = 0;
    const onScroll = () => {
      const nextY = window.scrollY;
      const delta = nextY - previousY;
      previousY = nextY;
      if (nextY < 100 || menuOpen) {
        setHeaderVisible(true);
        distance = 0;
        return;
      }
      const nextDirection = Math.sign(delta);
      if (!nextDirection) return;
      if (nextDirection !== direction) distance = 0;
      direction = nextDirection;
      distance += Math.abs(delta);
      if (distance > 12) setHeaderVisible(direction < 0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [menuOpen]);

  useEffect(() => {
    if (path !== "/" || !window.location.hash) return;
    const id = window.location.hash.slice(1);
    const frame = window.requestAnimationFrame(() =>
      document.getElementById(id)?.scrollIntoView(),
    );
    return () => window.cancelAnimationFrame(frame);
  }, [path]);

  useEffect(() => {
    sessionStorage.setItem("vee-bag", JSON.stringify(bag));
  }, [bag]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(""), 3500);
    return () => window.clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (panel || detail) {
      if (!dialog?.open)
        triggerRef.current = document.activeElement as HTMLElement;
      dialog?.showModal();
      document.body.style.overflow = "hidden";
    } else {
      dialog?.close();
      document.body.style.overflow = "";
      triggerRef.current?.focus();
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [panel, detail]);

  function closeDialog() {
    setPanel(null);
    setDetail(null);
  }
  function addToBag(product: Product) {
    if (product.stockQuantity === 0) return;
    setBag((current) => ({
      ...current,
      [product.id]: Math.min(
        product.stockQuantity,
        (current[product.id] ?? 0) + 1,
      ),
    }));
    setNotice(`${product.productName} added to your bag`);
  }
  function changeQuantity(id: string, delta: number) {
    setBag((current) => {
      const next = {
        ...current,
        [id]: Math.max(
          0,
          Math.min(
            products.find((item) => item.id === id)?.stockQuantity ?? 0,
            (current[id] ?? 0) + delta,
          ),
        ),
      };
      if (!next[id]) delete next[id];
      return next;
    });
  }
  function setQuantity(id: string, quantity: number) {
    setBag((current) => ({ ...current, [id]: quantity }));
  }
  function goToCollection() {
    window.history.pushState({}, "", "/collection");
    window.dispatchEvent(new PopStateEvent("popstate"));
    window.scrollTo(0, 0);
  }

  if (path === "/checkout") {
    return (
      <CheckoutPage
        bag={bag}
        setBag={setBag}
        products={products}
        onPlaced={(order) => {
          saveReceipt(order);
          setPlacedOrder(order);
          setBag({});
          window.history.pushState({}, "", "/order-confirmation");
          window.dispatchEvent(new PopStateEvent("popstate"));
          window.scrollTo(0, 0);
        }}
      />
    );
  }
  if (path === "/profile") {
    return <ProfilePage />;
  }
  if (path === "/order-confirmation") {
    return <OrderConfirmation order={placedOrder} />;
  }

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="preview-ribbon">
        The Vee collection <span>—</span> cash on delivery.
      </div>
      <header
        className={`site-header ${headerVisible ? "" : "header-hidden"}`}
        onFocusCapture={() => setHeaderVisible(true)}
      >
        <nav aria-label="Main navigation" className="desktop-nav">
          <a
            href="/collection"
            aria-current={path === "/collection" ? "page" : undefined}
            onClick={(event) => navigateTo(event, "/collection")}
          >
            The collection
          </a>
          <a
            href={path === "/collection" ? "/#philosophy" : "#philosophy"}
            onClick={(event) => {
              if (path === "/collection") navigateTo(event, "/#philosophy");
            }}
          >
            Our world
          </a>
          {session.user && (
            <a
              href="/profile"
              onClick={(event) => navigateTo(event, "/profile")}
            >
              Your profile
            </a>
          )}
          {session.user?.role === "admin" && (
            <a href="/admin" onClick={(event) => navigateTo(event, "/admin")}>
              Admin
            </a>
          )}
        </nav>
        <button
          className="icon-button mobile-menu"
          aria-label={menuOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
        <a
          href="/"
          className="wordmark"
          aria-label="Vee home"
          onClick={(event) => navigateTo(event, "/")}
        >
          Vee
        </a>
        <div className="header-tools">
          {session.user ? (
            <a
              className="icon-button"
              href="/profile"
              aria-label="Your profile"
              onClick={(event) => navigateTo(event, "/profile")}
            >
              <UserRound size={19} />
            </a>
          ) : (
            <button
              className="icon-button"
              aria-label="Sign in or create an account"
              onClick={() => {
                setDetail(null);
                setPanel("account");
              }}
            >
              <UserRound size={19} />
            </button>
          )}
          <button
            className="icon-button"
            aria-label="Search the collection"
            onClick={() => setPanel("search")}
          >
            <Search size={19} />
          </button>
          <button
            className="bag-button"
            aria-label={`${panel === "bag" ? "Close" : "Open"} bag, ${bagCount} items`}
            aria-expanded={panel === "bag"}
            aria-controls="store-dialog"
            onClick={() => setPanel(panel === "bag" ? null : "bag")}
          >
            <ShoppingBag size={19} />
            <span className="bag-label">Bag</span>
            <span className="bag-count">{bagCount}</span>
          </button>
        </div>
        {menuOpen && (
          <nav
            id="mobile-nav"
            className="mobile-nav"
            aria-label="Mobile navigation"
          >
            <a
              href="/collection"
              onClick={(event) => {
                setMenuOpen(false);
                navigateTo(event, "/collection");
              }}
            >
              The collection <ArrowRight />
            </a>
            <a
              href={path === "/collection" ? "/#philosophy" : "#philosophy"}
              onClick={(event) => {
                setMenuOpen(false);
                if (path === "/collection") navigateTo(event, "/#philosophy");
              }}
            >
              Our world <ArrowRight />
            </a>
            {session.user && (
              <a
                href="/profile"
                onClick={(event) => navigateTo(event, "/profile")}
              >
                Your profile <ArrowRight />
              </a>
            )}
            {session.user?.role === "admin" && (
              <a href="/admin" onClick={(event) => navigateTo(event, "/admin")}>
                Admin workspace <ArrowRight />
              </a>
            )}
          </nav>
        )}
      </header>

      {path === "/collection" ? (
        <CollectionPage
          categories={categories}
          products={products}
          loading={loading}
          error={error}
          retry={retry}
          bag={bag}
          onOpen={setDetail}
          onAdd={addToBag}
        />
      ) : (
        <main id="main">
          <section className="hero" aria-labelledby="hero-title">
            <div className="hero-copy">
              <div className="hero-copy-inner">
                <h1 id="hero-title">
                  A moment,
                  <br />
                  just <em>for you.</em>
                </h1>
                <p>
                  Explore Vee cosmetics, see the product details, and choose
                  what belongs in your bag.
                </p>
                <a
                  className="solid-link"
                  href="/collection"
                  onClick={(event) => navigateTo(event, "/collection")}
                >
                  Explore the collection <ArrowRight size={18} />
                </a>
              </div>
            </div>
            <figure className="hero-image">
              <img
                src="/images/vee-atelier.webp"
                srcSet="/images/vee-atelier-640.webp 640w, /images/vee-atelier.webp 1024w"
                sizes="(max-width: 700px) 100vw, 53vw"
                alt="Vee concept cosmetics in soft peach-blush and rose gold, arranged on sunlit natural stone"
                fetchPriority="high"
                width="1024"
                height="1280"
              />
              <figcaption>
                Visual concept. Products shown are illustrative.
              </figcaption>
            </figure>
          </section>

          <section
            className="collection section-wrap"
            id="collection"
            aria-labelledby="collection-title"
          >
            <div className="section-heading">
              <div>
                <h2 id="collection-title">
                  Your everyday, <em>elevated.</em>
                </h2>
                <p>Discover the Vee collection.</p>
              </div>
              <div
                className="category-filters"
                role="group"
                aria-label="Filter collection"
              >
                {[{ id: "All", categoryName: "All" }, ...categories].map(
                  (item) => (
                    <button
                      key={item.id}
                      aria-pressed={category === item.id}
                      className={category === item.id ? "active" : ""}
                      onClick={() => setCategory(item.id)}
                    >
                      {item.categoryName}
                    </button>
                  ),
                )}
              </div>
            </div>
            {loading ? (
              <div className="catalog-loading" role="status">
                Loading the collection…
              </div>
            ) : error ? (
              <div className="request-error" role="alert">
                <h3>A momentary pause.</h3>
                <p>{error}</p>
                <button className="text-link" onClick={retry}>
                  Try again <ArrowRight size={16} />
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="catalog-empty">
                <h3>
                  {products.length
                    ? "Nothing in this category yet."
                    : "The collection is taking shape."}
                </h3>
                <p>
                  {products.length
                    ? "Explore another category to find your moment."
                    : "Please return soon to discover new arrivals."}
                </p>
                <button
                  className="text-link"
                  onClick={() => {
                    setCategory("All");
                    retry();
                  }}
                >
                  Refresh the collection <ArrowRight size={16} />
                </button>
              </div>
            ) : null}
            <div
              className="product-grid"
              aria-live="polite"
              aria-busy={loading}
            >
              {!loading &&
                !error &&
                filtered.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    bagQuantity={bag[product.id] ?? 0}
                    onOpen={setDetail}
                    onAdd={addToBag}
                  />
                ))}
            </div>
            <p className="collection-note">
              Products, prices, and availability come from the store. Final
              totals are confirmed at checkout.
            </p>
          </section>

          <section
            className="intro"
            id="philosophy"
            aria-labelledby="intro-title"
          >
            <span className="tiny-wordmark" aria-hidden="true">
              V
            </span>
            <h2 id="intro-title">Take a closer look.</h2>
            <p>
              Open a product to see its details, price, and availability. Add
              your favorites to the bag, then review the final total at
              checkout.
            </p>
          </section>

          <section
            className="ritual"
            id="ritual"
            aria-labelledby="ritual-title"
          >
            <figure className="ritual-image">
              <img
                src="/images/stone-ritual.webp"
                srcSet="/images/stone-ritual-640.webp 640w, /images/stone-ritual.webp 1024w"
                sizes="(max-width: 700px) 100vw, 48vw"
                alt="Ivory and amber concept cosmetics on natural limestone, surrounded by dried botanicals"
                loading="lazy"
                width="1024"
                height="1280"
              />
              <figcaption>
                Visual concept. Products shown are illustrative.
              </figcaption>
            </figure>
            <div className="ritual-copy">
              <h2 id="ritual-title">
                The luxury
                <br />
                of <em>slowing down.</em>
              </h2>
              <p>
                A soft light. A familiar gesture.
                <br />A few minutes that are yours alone.
              </p>
              <p>
                Inspired by nature’s quieter side, Vee is a place
                <br className="desktop-break" /> to rediscover the pleasure in
                the everyday.
              </p>
              <a className="text-link" href="#collection">
                Find your ritual <ArrowRight size={16} />
              </a>
            </div>
          </section>

          <section
            className="newsletter section-wrap"
            aria-labelledby="newsletter-title"
          >
            <div>
              <h2 id="newsletter-title">
                A little Vee,
                <br />
                <em>in your inbox.</em>
              </h2>
              <p>Newsletter sign-up is coming soon.</p>
            </div>
            <div className="newsletter-preview">
              <strong>Coming soon</strong>
              <p>Sign-up is not open yet. No email is collected here.</p>
            </div>
          </section>
        </main>
      )}

      <footer className="site-footer">
        <div className="footer-top">
          <a
            href="/"
            className="wordmark"
            aria-label="Vee home"
            onClick={(event) => navigateTo(event, "/")}
          >
            Vee
          </a>
          <p>A moment, just for you.</p>
          <nav aria-label="Footer navigation">
            <a
              href="/collection"
              onClick={(event) => navigateTo(event, "/collection")}
            >
              The collection
            </a>
            <a
              href={path === "/collection" ? "/#philosophy" : "#philosophy"}
              onClick={(event) => {
                if (path === "/collection") navigateTo(event, "/#philosophy");
              }}
            >
              Our world
            </a>
            <a
              href={
                path === "/collection"
                  ? "/#newsletter-title"
                  : "#newsletter-title"
              }
              onClick={(event) => {
                if (path === "/collection")
                  navigateTo(event, "/#newsletter-title");
              }}
            >
              Stay in touch
            </a>
          </nav>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} Vee</span>
          <span>A luxury cosmetics storefront concept.</span>
          <a href="#main">
            Back to top <ArrowRight size={13} className="up-arrow" />
          </a>
        </div>
      </footer>

      <div
        className={`toast ${notice ? "visible" : ""}`}
        role="status"
        aria-live="polite"
      >
        {notice && (
          <>
            <Check size={17} />
            <span>{notice}</span>
          </>
        )}
      </div>
      <dialog
        id="store-dialog"
        ref={dialogRef}
        className={`store-dialog ${detail ? "detail-dialog" : ""} ${panel === "bag" ? "bag-dialog" : ""}`}
        onCancel={closeDialog}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeDialog();
        }}
        aria-labelledby="dialog-title"
      >
        <div className="dialog-shell">
          <button
            className="icon-button dialog-close"
            onClick={closeDialog}
            aria-label="Close panel"
          >
            <X size={22} />
          </button>
          {panel === "search" && (
            <>
              <h2 id="dialog-title">Find your moment.</h2>
              <label htmlFor="collection-search">Search the collection</label>
              <div className="search-field">
                <Search size={18} />
                <input
                  id="collection-search"
                  placeholder="Search products or categories"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  autoFocus
                />
              </div>
              <div className="search-results" aria-live="polite">
                {results.length ? (
                  results.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => {
                        setPanel(null);
                        setDetail(product);
                      }}
                    >
                      <span>
                        {product.productName}
                        <small>
                          {categories.find(
                            (item) => item.id === product.categoryId,
                          )?.categoryName ?? "Collection"}{" "}
                          · {formatPrice(product)}
                        </small>
                      </span>
                      <ChevronRight size={17} />
                    </button>
                  ))
                ) : (
                  <div className="empty-state">
                    <p>
                      {loading
                        ? "Loading the collection…"
                        : error || `No products found for “${query}”.`}
                    </p>
                    <button className="text-link" onClick={() => setQuery("")}>
                      Clear your search <ArrowRight size={16} />
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
          {panel === "bag" && (
            <div className="bag-drawer-content">
              <div className="bag-drawer-header">
                <h2 id="dialog-title">Your quiet collection.</h2>
                <p className="dialog-description">
                  Your bag · {bagCount} {bagCount === 1 ? "item" : "items"}
                </p>
              </div>
              {bagCount ? (
                <>
                  <div className="bag-items">
                    {bagProducts.map((product) => (
                      <div className="bag-item" key={product.id}>
                        <ProductImage
                          src={product.imageUrl}
                          alt={product.productName}
                        />
                        <div>
                          <h3>{product.productName}</h3>
                          <p>{formatPrice(product)}</p>
                          <div className="quantity">
                            <button
                              className="icon-button"
                              aria-label={`Decrease ${product.productName} quantity`}
                              onClick={() => changeQuantity(product.id, -1)}
                            >
                              <Minus size={15} />
                            </button>
                            <QuantityInput
                              productName={product.productName}
                              quantity={bag[product.id]}
                              max={Math.min(100, product.stockQuantity)}
                              onCommit={(quantity) =>
                                setQuantity(product.id, quantity)
                              }
                            />
                            <button
                              className="icon-button"
                              aria-label={`Increase ${product.productName} quantity`}
                              onClick={() => changeQuantity(product.id, 1)}
                            >
                              <Plus size={15} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="bag-drawer-footer">
                    <div className="bag-subtotal" aria-live="polite">
                      <span>Estimated items subtotal</span>
                      <strong>{bagSubtotal ?? "Unavailable"}</strong>
                    </div>
                    <p className="bag-disclaimer">
                      Your selection is saved in this tab. Delivery and
                      discounts are calculated at checkout.
                    </p>
                    <a
                      className="solid-link"
                      href="/checkout"
                      onClick={(event) => {
                        closeDialog();
                        navigateTo(event, "/checkout");
                      }}
                    >
                      Checkout <ArrowRight size={16} />
                    </a>
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <ShoppingBag size={35} strokeWidth={1} />
                  <h3>A little room for something lovely.</h3>
                  <p>Explore the collection and add a moment to your bag.</p>
                  <button
                    className="solid-link"
                    onClick={() => {
                      closeDialog();
                      goToCollection();
                    }}
                  >
                    Explore the collection <ArrowRight size={16} />
                  </button>
                </div>
              )}
            </div>
          )}
          {panel === "account" && <AccountPanel />}
          {detail && (
            <ProductPanel
              key={detail.id}
              product={detail}
              onAdd={addToBag}
              onSignIn={() => {
                setDetail(null);
                setPanel("account");
              }}
            />
          )}
        </div>
      </dialog>
    </>
  );
}

export default App;
