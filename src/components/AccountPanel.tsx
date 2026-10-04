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
  const [mode, setMode] = useState<Mode>(
    window.location.pathname === "/reset-password" ? "reset" : "login",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const activeMode = session.user
    ? mode === "password"
      ? "password"
      : "profile"
    : mode === "profile" || mode === "password"
      ? "login"
      : mode;
  function switchMode(next: Mode) {
    setMode(next);
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
            setMode("reset");
            setSuccess(
              "If that email matches an account, a reset code has been sent. Enter the code below.",
            );
          }
          break;
        case "reset":
          await storeApi.resetPassword(
            value("code").trim().toUpperCase(),
            password,
          );
          session.signOut();
          if (alive.current) {
            setMode("login");
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
      if (alive.current) setError(messageOf(cause));
    } finally {
      if (alive.current) setBusy(false);
    }
  }

  return (
    <div className="account-panel">
      <h2 id="dialog-title">{titles[activeMode]}</h2>
      {session.user ? (
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
            ? "Enter the 8-character code from your email and choose a new password."
            : activeMode === "forgot"
              ? "Enter your account email to request a password reset code."
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
          {activeMode === "reset" && (
            <label>
              Reset code
              <input
                name="code"
                required
                minLength={8}
                maxLength={8}
                pattern="[a-zA-Z0-9]{8}"
                autoComplete="one-time-code"
                autoCapitalize="characters"
                spellCheck={false}
              />
            </label>
          )}
          {activeMode === "password" && (
            <label>
              Current password
              <input
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
                  forgot: "Send reset code",
                  reset: "Reset password",
                  profile: "Save your details",
                  password: "Update password",
                }[activeMode]}
            <ArrowRight size={17} />
          </button>
        </fieldset>
      </form>
      {session.user ? (
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
              <button
                className="text-link"
                disabled={busy}
                onClick={() => switchMode("register")}
              >
                Create an account
              </button>
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
              Return to sign in
            </button>
          )}
          {activeMode === "forgot" && (
            <button
              className="text-link"
              disabled={busy}
              onClick={() => switchMode("reset")}
            >
              I already have a reset code
            </button>
          )}
        </div>
      )}
      <p className="form-note session-note">
        Your sign-in can be restored on this device for up to 14 days. Sign out
        to end it.
      </p>
    </div>
  );
}
