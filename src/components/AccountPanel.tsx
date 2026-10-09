import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ArrowRight, LogOut } from "lucide-react";
import { ApiError, messageOf } from "../api/client";
import { storeApi } from "../api/store";
import { useSession } from "../auth/Session";
import { navigateTo } from "../navigation";

type Mode = "login" | "register" | "forgot" | "reset" | "profile" | "password";
const titles: Record<Mode, string> = {
  login: "A moment to return.",
  register: "Make yourself at home.",
  forgot: "Let’s help you return.",
  reset: "A fresh start.",
  profile: "Your personal details.",
  password: "Change your password.",
};

export default function AccountPanel({
  showProfileLink = true,
  onSignedIn,
}: {
  showProfileLink?: boolean;
  onSignedIn?: () => void;
}) {
  const session = useSession();
  const [linkToken, setLinkToken] = useState(
    () =>
      (window.location.pathname === "/reset-password"
        ? new URLSearchParams(window.location.search).get("token")
        : null) ?? "",
  );
  const [mode, setMode] = useState<Mode>(() =>
    window.location.pathname === "/reset-password"
      ? linkToken
        ? "reset"
        : "forgot"
      : "login",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const alive = useRef(true);
  const initialFieldRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (!linkToken || window.location.pathname !== "/reset-password") return;
    const url = new URL(window.location.href);
    url.searchParams.delete("token");
    window.history.replaceState(
      window.history.state,
      "",
      url.pathname + url.search + url.hash,
    );
  }, [linkToken]);
  const activeMode =
    mode === "reset" || mode === "forgot"
      ? mode
      : session.user
        ? mode === "password"
          ? "password"
          : "profile"
        : mode === "profile" || mode === "password"
          ? "login"
          : mode;
  useEffect(() => {
    const frame = window.requestAnimationFrame(() =>
      initialFieldRef.current?.focus(),
    );
    return () => window.cancelAnimationFrame(frame);
  }, [activeMode]);
  function switchMode(next: Mode) {
    setMode(next);
    if (next !== "reset") {
      setLinkToken("");
      if (window.location.pathname === "/reset-password") {
        window.history.replaceState(window.history.state, "", "/");
        window.dispatchEvent(new PopStateEvent("popstate"));
      }
    }
    setError("");
    setSuccess("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const value = (key: string) => String(data.get(key) ?? "");
    const password = value("password");
    if (
      ["register", "reset", "password"].includes(activeMode) &&
      password !== value("confirmPassword")
    ) {
      setError("The passwords don’t match. Please enter them again.");
      return;
    }
    const name = value("name").trim();
    if (["register", "profile"].includes(activeMode) && !name) {
      setError("Enter your name to continue.");
      return;
    }
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      switch (activeMode) {
        case "login":
          await session.signIn(value("email").trim(), password);
          if (alive.current) {
            onSignedIn?.();
          }
          break;
        case "register":
          await storeApi.register(
            name,
            value("email").trim(),
            password,
            value("phone").trim() || null,
          );
          if (alive.current) {
            await session.signIn(value("email").trim(), password);
            if (alive.current) onSignedIn?.();
          }
          break;
        case "forgot":
          try {
            await storeApi.forgotPassword(value("email").trim());
          } catch (cause) {
            if (!(cause instanceof ApiError && cause.status === 404))
              throw cause;
          }
          if (alive.current) {
            setSuccess(
              "If that email matches an account, a reset link has been sent. Open it to choose a new password.",
            );
          }
          break;
        case "reset":
          await storeApi.resetPassword(linkToken, password);
          session.signOut();
          if (alive.current) {
            switchMode("login");
            setSuccess(
              "Your password has been reset. Sign in with your new password.",
            );
          }
          break;
        case "profile":
          await session.updateProfile(
            name,
            value("address").trim() || null,
            value("phone").trim() || null,
          );
          if (alive.current) setSuccess("Your details have been updated.");
          break;
        case "password":
          if (!session.token) throw new Error("Please sign in again.");
          await storeApi.changePassword(
            session.token,
            value("oldPassword"),
            password,
          );
          session.signOut();
          if (alive.current) {
            setMode("login");
            setSuccess(
              "Your password has been changed. Sign in again to continue.",
            );
          }
          break;
      }
      if (activeMode !== "profile") form.reset();
    } catch (cause) {
      if (alive.current)
        setError(
          activeMode === "reset" &&
            cause instanceof ApiError &&
            cause.status === 403
            ? "This reset link is invalid or has expired. Request another link."
            : messageOf(cause),
        );
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  return (
    <div className="account-panel">
      <h2 id="dialog-title">{titles[activeMode]}</h2>
      {session.user && activeMode !== "reset" && activeMode !== "forgot" ? (
        <>
          <p className="account-email">{session.user.email}</p>
          <div
            className="account-tabs"
            role="group"
            aria-label="Account sections"
          >
            <button
              aria-pressed={activeMode === "profile"}
              onClick={() => switchMode("profile")}
              disabled={busy}
            >
              Your details
            </button>
            <button
              aria-pressed={activeMode === "password"}
              onClick={() => switchMode("password")}
              disabled={busy}
            >
              Password
            </button>
          </div>
        </>
      ) : (
        <p className="form-intro">
          {activeMode === "reset"
            ? "Choose a new password to finish resetting your account."
            : activeMode === "forgot"
              ? "Enter your account email to request a password reset link."
              : "Your collection, your details, your own little corner of Vee."}
        </p>
      )}
      {session.sessionMessage && (
        <p className="form-message" role="status">
          {session.sessionMessage}
        </p>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className="form-message" role="status">
          {success}
        </p>
      )}
      <form
        key={`${activeMode}-${session.user?.id ?? "guest"}-${session.user?.name ?? ""}-${session.user?.address ?? ""}-${session.user?.phone ?? ""}`}
        className="account-form"
        onSubmit={submit}
        aria-busy={busy}
      >
        <fieldset disabled={busy}>
          {["register", "profile"].includes(activeMode) && (
            <label>
              Name
              <input
                ref={initialFieldRef}
                data-dialog-autofocus
                name="name"
                required
                maxLength={200}
                autoComplete="name"
                defaultValue={session.user?.name ?? ""}
              />
            </label>
          )}
          {["login", "register", "forgot"].includes(activeMode) && (
            <label>
              Email address
              <input
                ref={
                  activeMode === "login" || activeMode === "forgot"
                    ? initialFieldRef
                    : undefined
                }
                data-dialog-autofocus={
                  activeMode === "login" || activeMode === "forgot"
                    ? true
                    : undefined
                }
                name="email"
                type="email"
                required
                autoComplete="email"
                defaultValue=""
              />
            </label>
          )}
          {["register", "profile"].includes(activeMode) && (
            <label>
              Phone number (optional)
              <input
                name="phone"
                type="tel"
                minLength={5}
                maxLength={40}
                autoComplete="tel"
                defaultValue={session.user?.phone ?? ""}
              />
            </label>
          )}
          {activeMode === "profile" && (
            <label>
              Address
              <textarea
                name="address"
                rows={3}
                maxLength={1024}
                autoComplete="street-address"
                defaultValue={session.user?.address ?? ""}
              />
            </label>
          )}
          {activeMode === "password" && (
            <label>
              Current password
              <input
                ref={initialFieldRef}
                data-dialog-autofocus
                name="oldPassword"
                type="password"
                required
                autoComplete="current-password"
              />
            </label>
          )}
          {["login", "register", "reset", "password"].includes(activeMode) && (
            <label>
              {activeMode === "password" || activeMode === "reset"
                ? "New password"
                : "Password"}
              <input
                ref={activeMode === "reset" ? initialFieldRef : undefined}
                data-dialog-autofocus={activeMode === "reset" || undefined}
                name="password"
                type="password"
                required
                autoComplete={
                  activeMode === "login" ? "current-password" : "new-password"
                }
              />
            </label>
          )}
          {["register", "reset", "password"].includes(activeMode) && (
            <label>
              Confirm password
              <input
                name="confirmPassword"
                type="password"
                required
                autoComplete="new-password"
              />
            </label>
          )}
          <button className="solid-link" type="submit" disabled={busy}>
            {busy
              ? "Please wait…"
              : {
                  login: "Sign in",
                  register: "Create account",
                  forgot: "Send reset link",
                  reset: "Reset password",
                  profile: "Save your details",
                  password: "Update password",
                }[activeMode]}
            <ArrowRight size={17} />
          </button>
        </fieldset>
      </form>
      {session.user && activeMode !== "reset" && activeMode !== "forgot" ? (
        <div className="account-actions">
          {showProfileLink && (
            <a
              className="text-link"
              href="/profile"
              onClick={(event) => navigateTo(event, "/profile")}
            >
              View your profile <ArrowRight size={15} />
            </a>
          )}
          <button
            className="text-link"
            disabled={busy}
            onClick={async () => {
              setError("");
              setBusy(true);
              try {
                await session.refreshProfile();
                if (alive.current) setSuccess("Your details are up to date.");
              } catch (cause) {
                if (alive.current) setError(messageOf(cause));
              } finally {
                if (alive.current) setBusy(false);
              }
            }}
          >
            Refresh details
          </button>
          <button
            className="text-link"
            disabled={busy}
            onClick={() => {
              session.signOut();
              switchMode("login");
            }}
          >
            Sign out <LogOut size={15} />
          </button>
        </div>
      ) : (
        <div className="account-links">
          {activeMode === "login" ? (
            <>
              <div className="account-create">
                <span>New customer?</span>
                <button
                  className="text-link"
                  disabled={busy}
                  onClick={() => switchMode("register")}
                >
                  Create an account
                </button>
              </div>
              <button
                className="text-link"
                disabled={busy}
                onClick={() => switchMode("forgot")}
              >
                Forgot password?
              </button>
            </>
          ) : (
            <button
              className="text-link"
              disabled={busy}
              onClick={() => switchMode("login")}
            >
              {session.user ? "Return to account" : "Return to sign in"}
            </button>
          )}
          {activeMode === "reset" && (
            <button
              className="text-link"
              disabled={busy}
              onClick={() => switchMode("forgot")}
            >
              Request another reset link
            </button>
          )}
        </div>
      )}
      {activeMode !== "forgot" && activeMode !== "reset" && (
        <p className="form-note session-note">
          Your sign-in can be restored on this device for up to 14 days. Sign
          out to end it.
        </p>
      )}
    </div>
  );
}
