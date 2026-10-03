import { afterEach, describe, expect, it, vi } from "vitest";
import { imageUrl, request, setAuthRefreshHandler } from "./client";

afterEach(() => {
  vi.unstubAllGlobals();
  setAuthRefreshHandler(null);
});

describe("API boundary", () => {
  it("unwraps the API envelope and sends explicit bearer credentials without cookies", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ data: { id: "buyer" } })),
      );
    vi.stubGlobal("fetch", fetcher);
    expect(await request("/users/me", { token: "credential" })).toEqual({
      id: "buyer",
    });
    expect(fetcher).toHaveBeenCalledWith(
      "/api/users/me",
      expect.objectContaining({
        credentials: "omit",
        headers: {
          Accept: "application/json",
          Authorization: "Bearer credential",
        },
      }),
    );
  });

  it("handles empty successful deletions", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 204 })),
    );
    expect(
      await request("/reviews/id", { method: "DELETE", token: "credential" }),
    ).toBeUndefined();
  });

  it("retries a rejected bearer request once with a refreshed access token", async () => {
    const refresh = vi.fn().mockResolvedValue("new-access");
    setAuthRefreshHandler(refresh);
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "JWT token has expired" }), {
          status: 401,
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { id: "buyer" } })),
      );
    vi.stubGlobal("fetch", fetcher);
    expect(await request("/users/me", { token: "old-access" })).toEqual({
      id: "buyer",
    });
    expect(refresh).toHaveBeenCalledOnce();
    expect(refresh).toHaveBeenCalledWith("old-access");
    expect(fetcher.mock.calls[1][1].headers.Authorization).toBe(
      "Bearer new-access",
    );
  });

  it("expires a rejected credential but preserves the session for a wrong current password", async () => {
    const listener = vi.fn();
    window.addEventListener("vee-session-expired", listener);
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ message: "Could not validate credentials" }),
          { status: 401 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ message: "Invalid current password." }), {
          status: 401,
        }),
      );
    vi.stubGlobal("fetch", fetcher);
    try {
      await expect(
        request("/users/me", { token: "credential" }),
      ).rejects.toThrow("Could not validate credentials");
      expect(listener).toHaveBeenCalledOnce();
      expect(listener.mock.calls[0][0].detail).toBe("credential");
      await expect(
        request("/users/change-password", { token: "credential" }),
      ).rejects.toThrow("Invalid current password.");
      expect(listener).toHaveBeenCalledOnce();
    } finally {
      window.removeEventListener("vee-session-expired", listener);
    }
  });

  it("rejects malformed success responses and exposes server validation errors", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response("{}"))
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              detail: [{ loc: ["body", "email"], msg: "Invalid email" }],
            }),
            { status: 422 },
          ),
        ),
    );
    await expect(request("/products")).rejects.toThrow("unexpected response");
    await expect(request("/auth/login")).rejects.toThrow(
      "email: Invalid email",
    );
  });

  it("resolves uploaded image paths and rejects executable image URLs", () => {
    expect(imageUrl("/uploads/products/lip.png")).toBe(
      `${window.location.origin}/uploads/products/lip.png`,
    );
    expect(imageUrl("javascript:alert(1)")).toBeNull();
    expect(imageUrl(null)).toBeNull();
  });
});
