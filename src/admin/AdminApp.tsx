import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import {
  BarChart3,
  ChevronDown,
  ClipboardList,
  FolderTree,
  Gift,
  LayoutDashboard,
  LogOut,
  Package,
  ShieldCheck,
} from "lucide-react";
import { messageOf } from "../api/client";
import { useSession } from "../auth/Session";
import { navigateTo } from "../navigation";
import {
  CategoriesSection,
  CouponsSection,
  DashboardSection,
  OrdersSection,
  ProductsSection,
  ReportsSection,
  StatisticsSection,
} from "./sections";
import "./admin.css";

export type View =
  | "overview"
  | "orders"
  | "statistics"
  | "products"
  | "categories"
  | "coupons"
  | "reports";
const navigation: { id: View; label: string; icon: typeof LayoutDashboard }[] =
  [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "orders", label: "Orders", icon: ClipboardList },
    { id: "statistics", label: "Statistics", icon: BarChart3 },
    { id: "products", label: "Products", icon: Package },
    { id: "categories", label: "Categories", icon: FolderTree },
    { id: "coupons", label: "Coupons", icon: Gift },
    { id: "reports", label: "Reports", icon: ShieldCheck },
  ];
function viewFromUrl(): View {
  const view = new URLSearchParams(window.location.search).get("view");
  return navigation.find((item) => item.id === view)?.id ?? "overview";
}

export default function AdminApp() {
  const session = useSession();
  const [view, setView] = useState<View>(viewFromUrl);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuToggle = useRef<HTMLButtonElement>(null);
  const menuClose = useRef<HTMLButtonElement>(null);
  const menuWasOpen = useRef(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const onPop = () => setView(viewFromUrl());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => {
    if (menuOpen) {
      menuWasOpen.current = true;
      menuClose.current?.focus();
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape") setMenuOpen(false);
      };
      document.addEventListener("keydown", onKeyDown);
      return () => document.removeEventListener("keydown", onKeyDown);
    }
    if (menuWasOpen.current) {
      menuWasOpen.current = false;
      menuToggle.current?.focus();
    }
  }, [menuOpen]);

  function navigate(next: View) {
    setView(next);
    setMenuOpen(false);
    window.history.pushState(
      {},
      "",
      next === "overview" ? "/admin" : `/admin?view=${next}`,
    );
    window.scrollTo(0, 0);
  }
  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await session.signIn(email.trim(), password);
      setPassword("");
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setBusy(false);
    }
  }

  if (!session.token || !session.user) {
    return (
      <main className="admin-gate">
        <div className="admin-gate-brand">
          Vee <span>atelier</span>
        </div>
        <div className="admin-gate-card">
          <ShieldCheck size={28} strokeWidth={1.5} />
          <h1>Admin workspace</h1>
          <p>Sign in with an administrator account to manage the store.</p>
          {session.sessionMessage && (
            <p className="admin-alert" role="status">
              {session.sessionMessage}
            </p>
          )}
          {error && (
            <p className="admin-alert" role="alert">
              {error}
            </p>
          )}
          <form onSubmit={signIn}>
            <label>
              Email{" "}
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
                required
              />
            </label>
            <label>
              Password{" "}
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            <button className="admin-primary" disabled={busy}>
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <a href="/" onClick={(event) => navigateTo(event, "/")}>
            Return to storefront
          </a>
        </div>
      </main>
    );
  }
  if (session.user.role !== "admin") {
    return (
      <main className="admin-gate">
        <div className="admin-gate-brand">
          Vee <span>atelier</span>
        </div>
        <div className="admin-gate-card">
          <ShieldCheck size={28} strokeWidth={1.5} />
          <h1>Administrator access required</h1>
          <p>
            This account does not have permission to open the admin workspace.
          </p>
          <button className="admin-primary" onClick={session.signOut}>
            Sign in with another account
          </button>
          <a href="/" onClick={(event) => navigateTo(event, "/")}>
            Return to storefront
          </a>
        </div>
      </main>
    );
  }

  const active = navigation.find((item) => item.id === view)!;
  return (
    <div className="admin-app">
      <a href="#admin-main" className="skip-link">
        Skip to content
      </a>
      <aside
        className={`admin-sidebar ${menuOpen ? "is-open" : ""}`}
        aria-label="Admin navigation"
      >
        <button
          ref={menuClose}
          className="admin-sidebar-close"
          aria-label="Close admin navigation"
          onClick={() => setMenuOpen(false)}
        >
          <ChevronDown size={18} />
        </button>
        <a
          className="admin-brand"
          href="/admin"
          onClick={(event) => {
            event.preventDefault();
            navigate("overview");
          }}
        >
          <span>Vee</span>
          <small>ADMIN STUDIO</small>
        </a>
        <div className="admin-sidebar-label">Workspace</div>
        <nav>
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={view === item.id ? "is-current" : ""}
                aria-current={view === item.id ? "page" : undefined}
                onClick={() => navigate(item.id)}
              >
                <Icon size={18} strokeWidth={1.7} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="admin-sidebar-bottom">
          <div className="admin-account">
            <span className="admin-avatar">
              {session.user.name.charAt(0).toUpperCase()}
            </span>
            <span>
              <strong>{session.user.name}</strong>
              <small>Administrator</small>
            </span>
          </div>
          <a href="/" onClick={(event) => navigateTo(event, "/")}>
            View storefront
          </a>
          <button onClick={session.signOut}>
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>
      <div className="admin-content">
        <header className="admin-topbar">
          <button
            ref={menuToggle}
            className="admin-mobile-nav"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-label="Toggle admin navigation"
          >
            <ChevronDown size={19} /> Menu
          </button>
          <span>Vee / {active.label}</span>
          <span className="admin-topbar-user">{session.user.name}</span>
        </header>
        <main id="admin-main" className="admin-main">
          {view === "overview" && (
            <DashboardSection token={session.token} onNavigate={navigate} />
          )}
          {view === "orders" && <OrdersSection token={session.token} />}
          {view === "statistics" && <StatisticsSection token={session.token} />}
          {view === "products" && <ProductsSection token={session.token} />}
          {view === "categories" && <CategoriesSection token={session.token} />}
          {view === "coupons" && <CouponsSection token={session.token} />}
          {view === "reports" && <ReportsSection token={session.token} />}
        </main>
      </div>
    </div>
  );
}
