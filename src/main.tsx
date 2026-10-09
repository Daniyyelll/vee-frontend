import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import AdminApp from "./admin/AdminApp";
import { SessionProvider } from "./auth/Session";
import { useSession } from "./auth/Session";
import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-600.css";
import "@fontsource/dm-sans/latin-700.css";
import "@fontsource/pacifico/latin-400.css";
import "./styles.css";

function Root() {
  const { restoring } = useSession();
  const [admin, setAdmin] = useState(() =>
    window.location.pathname.startsWith("/admin"),
  );
  useEffect(() => {
    const update = () =>
      setAdmin(window.location.pathname.startsWith("/admin"));
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, []);
  useEffect(() => {
    const updateTitle = () => {
      document.title = admin
        ? "Vee Admin — Store workspace"
        : window.location.pathname === "/collection"
          ? "The collection — Vee"
          : window.location.pathname === "/checkout"
            ? "Checkout — Vee"
            : window.location.pathname === "/profile"
              ? "Your profile — Vee"
              : window.location.pathname === "/order-confirmation"
                ? "Order placed — Vee"
                : "Vee — A moment, just for you.";
    };
    updateTitle();
    window.addEventListener("popstate", updateTitle);
    return () => window.removeEventListener("popstate", updateTitle);
  }, [admin]);
  if (restoring) {
    return (
      <main className="session-restoring" role="status">
        Returning to Vee…
      </main>
    );
  }
  return admin ? <AdminApp /> : <App />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SessionProvider>
      <Root />
    </SessionProvider>
  </StrictMode>,
);
