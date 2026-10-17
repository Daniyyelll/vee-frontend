import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";
import "./mobile-navigation.css";

export default function MobileNavigation({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const drawer = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = drawer.current;
    if (!dialog) return;
    if (!open) {
      if (dialog.open) dialog.close();
      return;
    }
    if (!dialog.open) dialog.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnDesktop = () => {
      if (window.innerWidth > 700) onClose();
    };
    window.addEventListener("resize", closeOnDesktop);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("resize", closeOnDesktop);
    };
  }, [open, onClose]);

  return (
    <dialog
      ref={drawer}
      id="mobile-nav"
      className="mobile-nav-drawer"
      aria-label="Navigation menu"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="mobile-nav-panel">
        <div className="mobile-nav-heading">
          <span className="mobile-nav-brand" aria-hidden="true">
            Vee
          </span>
          <button
            className="icon-button"
            aria-label="Close navigation"
            onClick={onClose}
          >
            <X size={22} aria-hidden="true" />
          </button>
        </div>
        <nav
          className="mobile-nav"
          aria-label="Mobile navigation"
          onClick={(event) => {
            if ((event.target as HTMLElement).closest("a")) onClose();
          }}
        >
          {children}
        </nav>
      </div>
    </dialog>
  );
}
