import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { setAuthRefreshHandler } from "../api/client";
import { storeApi } from "../api/store";
import type { User } from "../api/store";

type Session = {
  token: string | null;
  user: User | null;
  sessionMessage: string;
  restoring: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
  updateProfile: (
    name: string,
    address: string | null,
    phone: string | null,
  ) => Promise<void>;
  refreshProfile: () => Promise<void>;
};
const SessionContext = createContext<Session | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [sessionMessage, setSessionMessage] = useState("");
  const [restoring, setRestoring] = useState(true);
  const currentToken = useRef<string | null>(null);
  const generation = useRef(0);
  const refreshPromise = useRef<Promise<string | null> | null>(null);
  const refreshController = useRef<AbortController | null>(null);

  function refreshSession(expectedToken?: string): Promise<string | null> {
    if (expectedToken && currentToken.current !== expectedToken)
      return Promise.resolve(currentToken.current);
    if (refreshPromise.current) return refreshPromise.current;
    const run = generation.current;
    const controller = new AbortController();
    refreshController.current = controller;
    let promise!: Promise<string | null>;
    promise = (async () => {
      try {
        const result = await storeApi.refresh(controller.signal);
        if (run !== generation.current) return null;
        currentToken.current = result.token;
        setToken(result.token);
        setUser(result.user);
        setSessionMessage("");
        return result.token;
      } catch {
        if (run === generation.current) {
          currentToken.current = null;
          setToken(null);
          setUser(null);
        }
        return null;
      } finally {
        if (refreshController.current === controller)
          refreshController.current = null;
        if (refreshPromise.current === promise) refreshPromise.current = null;
        setRestoring(false);
      }
    })();
    refreshPromise.current = promise;
    return promise;
  }

  useEffect(() => {
    setAuthRefreshHandler((expiredToken) => refreshSession(expiredToken));
    void refreshSession();
    return () => setAuthRefreshHandler(null);
    // The handler reads mutable refs, so it only needs registration once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function signOut() {
    const run = ++generation.current;
    refreshController.current?.abort();
    currentToken.current = null;
    setToken(null);
    setUser(null);
    setSessionMessage("");
    setRestoring(false);
    void storeApi.logout().catch(() => {
      if (run === generation.current)
        setSessionMessage(
          "Your saved session could not be ended. Reconnect, reload, then sign out again.",
        );
    });
  }

  async function signIn(email: string, password: string) {
    const run = ++generation.current;
    refreshController.current?.abort();
    const result = await storeApi.login(email, password);
    if (run !== generation.current) return;
    currentToken.current = result.token;
    // Validate the credential through /users/me before publishing the session.
    let profile: User;
    try {
      profile = await storeApi.me(result.token);
    } catch (error) {
      if (run === generation.current) {
        currentToken.current = null;
        await storeApi.logout().catch(() => undefined);
      }
      throw error;
    }
    if (run !== generation.current) return;
    setToken(currentToken.current ?? result.token);
    setUser(profile);
    setSessionMessage("");
    setRestoring(false);
  }

  async function refreshProfile() {
    const credential = currentToken.current;
    if (!credential) return;
    const profile = await storeApi.me(credential);
    if (currentToken.current === credential) setUser(profile);
  }

  async function updateProfile(
    name: string,
    address: string | null,
    phone: string | null,
  ) {
    const credential = currentToken.current;
    if (!credential) throw new Error("Please sign in to update your profile.");
    const profile = await storeApi.updateProfile(
      credential,
      name,
      address,
      phone,
    );
    if (currentToken.current === credential) setUser(profile);
  }

  useEffect(() => {
    if (!token) return;
    const expire = () => {
      if (currentToken.current !== token) return;
      void refreshSession(token).then((replacement) => {
        if (!replacement && currentToken.current === null)
          setSessionMessage("Your session has ended. Please sign in again.");
      });
    };
    const onExpired = (event: Event) => {
      if ((event as CustomEvent).detail === token) expire();
    };
    window.addEventListener("vee-session-expired", onExpired);
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const payload = JSON.parse(
        atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
      ) as { exp?: number };
      if (typeof payload.exp === "number")
        timer = setTimeout(
          expire,
          Math.max(0, Math.min(payload.exp * 1000 - Date.now(), 2147483647)),
        );
    } catch {
      /* The server validates opaque credentials; parsing only drives the UI timer. */
    }
    return () => {
      window.removeEventListener("vee-session-expired", onExpired);
      clearTimeout(timer);
    };
  }, [token]);

  return (
    <SessionContext.Provider
      value={{
        token,
        user,
        sessionMessage,
        restoring,
        signIn,
        signOut,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) throw new Error("SessionProvider is required");
  return session;
}
