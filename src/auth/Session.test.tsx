import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { storeApi } from "../api/store";
import { SessionProvider, useSession } from "./Session";

const user = {
  id: "buyer",
  name: "Buyer",
  email: "buyer@example.com",
  role: "customer" as const,
  active: true,
  address: null,
  phone: null,
};
const token = `header.${btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 900 }))}.signature`;
let session: ReturnType<typeof useSession>;
function Probe() {
  session = useSession();
  return <span>{session.user?.name ?? "Guest"}</span>;
}
afterEach(() => vi.restoreAllMocks());

describe("account session", () => {
  it("restores a signed-in account from its refresh cookie and revokes it on sign out", async () => {
    const refresh = vi.spyOn(storeApi, "refresh").mockResolvedValue({
      token,
      token_type: "bearer",
      user,
    });
    const logout = vi.spyOn(storeApi, "logout").mockResolvedValue();
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );
    await waitFor(() => expect(screen.getByText("Buyer")).toBeTruthy());
    expect(refresh).toHaveBeenCalledOnce();
    expect(session.restoring).toBe(false);
    act(() => session.signOut());
    expect(screen.getByText("Guest")).toBeTruthy();
    await waitFor(() => expect(logout).toHaveBeenCalledOnce());
  });

  it("validates /me before signing in and refreshes after a matching expiry event", async () => {
    const refresh = vi
      .spyOn(storeApi, "refresh")
      .mockRejectedValueOnce(new Error("No session"));
    vi.spyOn(storeApi, "login").mockResolvedValue({
      token,
      token_type: "bearer",
      user,
    });
    const me = vi.spyOn(storeApi, "me").mockResolvedValue(user);
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );
    await act(() => session.signIn(user.email, "example-password"));
    expect(me).toHaveBeenCalledWith(token);
    expect(screen.getByText("Buyer")).toBeTruthy();
    act(() =>
      window.dispatchEvent(
        new CustomEvent("vee-session-expired", { detail: "previous-session" }),
      ),
    );
    expect(session.user).toEqual(user);
    refresh.mockResolvedValue({
      token: `${token}-renewed`,
      token_type: "bearer",
      user,
    });
    act(() =>
      window.dispatchEvent(
        new CustomEvent("vee-session-expired", { detail: token }),
      ),
    );
    await waitFor(() => expect(session.token).toBe(`${token}-renewed`));
    expect(screen.getByText("Buyer")).toBeTruthy();
    expect(session.sessionMessage).toBe("");
  });

  it("does not restore a signed-out account when an earlier login completes late", async () => {
    vi.spyOn(storeApi, "refresh").mockRejectedValue(new Error("No session"));
    let resolve!: (value: Awaited<ReturnType<typeof storeApi.login>>) => void;
    vi.spyOn(storeApi, "login").mockReturnValue(
      new Promise((done) => {
        resolve = done;
      }),
    );
    const me = vi.spyOn(storeApi, "me").mockResolvedValue(user);
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );
    let pending!: Promise<void>;
    act(() => {
      pending = session.signIn(user.email, "example-password");
    });
    act(() => session.signOut());
    await act(async () => {
      resolve({ token, token_type: "bearer", user });
      await pending;
    });
    expect(me).not.toHaveBeenCalled();
    expect(session.user).toBeNull();
  });

  it("does not publish a session when profile verification fails", async () => {
    vi.spyOn(storeApi, "refresh").mockRejectedValue(new Error("No session"));
    vi.spyOn(storeApi, "login").mockResolvedValue({
      token,
      token_type: "bearer",
      user,
    });
    vi.spyOn(storeApi, "me").mockRejectedValue(new Error("Invalid credential"));
    render(
      <SessionProvider>
        <Probe />
      </SessionProvider>,
    );
    await act(async () => {
      await expect(
        session.signIn(user.email, "example-password"),
      ).rejects.toThrow("Invalid credential");
    });
    await waitFor(() => expect(session.user).toBeNull());
    expect(session.token).toBeNull();
  });
});
