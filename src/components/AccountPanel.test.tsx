import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { SessionProvider, useSession } from "../auth/Session";
import { ApiError } from "../api/client";
import { storeApi } from "../api/store";
import AccountPanel from "./AccountPanel";

afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState({}, "", "/");
});
const buyer = {
  id: "buyer",
  name: "Buyer",
  email: "buyer@example.com",
  role: "customer" as const,
  active: true,
  address: null,
  phone: null,
};
function SessionState() {
  const session = useSession();
  return <span data-testid="session-user">{session.user?.email ?? ""}</span>;
}

const renderAccount = (onSignedIn?: () => void) =>
  render(
    <SessionProvider>
      <SessionState />
      <AccountPanel onSignedIn={onSignedIn} />
    </SessionProvider>,
  );

it("keeps password mismatch local and signs in after registering", async () => {
  const api = vi.spyOn(storeApi, "register").mockResolvedValue(buyer);
  const signIn = vi.spyOn(storeApi, "login").mockResolvedValue({
    token: "header.payload.signature",
    token_type: "bearer",
    user: buyer,
  });
  vi.spyOn(storeApi, "me").mockResolvedValue(buyer);
  const onSignedIn = vi.fn();
  const interaction = userEvent.setup();
  renderAccount(onSignedIn);
  await interaction.click(
    screen.getByRole("button", { name: "Create an account" }),
  );
  await interaction.type(screen.getByLabelText("Name"), "Buyer");
  await interaction.type(screen.getByLabelText("Email address"), buyer.email);
  await interaction.type(
    screen.getByLabelText("Password", { exact: true }),
    "example-password",
  );
  await interaction.type(
    screen.getByLabelText("Confirm password"),
    "different-password",
  );
  await interaction.click(
    screen.getByRole("button", { name: "Create account" }),
  );
  expect(screen.getByRole("alert").textContent).toContain("don’t match");
  expect(api).not.toHaveBeenCalled();
  await interaction.clear(screen.getByLabelText("Confirm password"));
  await interaction.type(
    screen.getByLabelText("Confirm password"),
    "example-password",
  );
  await interaction.click(
    screen.getByRole("button", { name: "Create account" }),
  );
  await waitFor(() =>
    expect(api).toHaveBeenCalledWith(
      "Buyer",
      buyer.email,
      "example-password",
      null,
    ),
  );
  expect(signIn).toHaveBeenCalledWith(buyer.email, "example-password");
  expect(onSignedIn).toHaveBeenCalledOnce();
});

it("gives the same reset-link instructions for an unknown account", async () => {
  const api = vi
    .spyOn(storeApi, "forgotPassword")
    .mockRejectedValue(new ApiError("User not found", 404));
  const interaction = userEvent.setup();
  renderAccount();
  await interaction.click(
    screen.getByRole("button", { name: "Forgot password?" }),
  );
  await interaction.type(screen.getByLabelText("Email address"), buyer.email);
  await interaction.click(
    screen.getByRole("button", { name: "Send reset link" }),
  );
  expect(await screen.findByRole("status")).toHaveProperty(
    "textContent",
    "If that email matches an account, a reset link has been sent. Open it to choose a new password.",
  );
  expect(
    screen.queryByRole("button", { name: "I already have a reset token" }),
  ).toBeNull();
  expect(api).toHaveBeenCalledOnce();
});

it("labels the account-creation action for new customers", () => {
  renderAccount();

  expect(screen.getByText("New customer?")).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Create an account" }),
  ).toBeTruthy();
});

it("uses the exact token from an email link and clears it from the address bar", async () => {
  const token = "AbCd_0123456789-abcdefghijKLMNOPqrstuv";
  window.history.replaceState({}, "", "/reset-password?token=" + token);
  vi.spyOn(storeApi, "refresh").mockResolvedValue({
    token: "header.payload.signature",
    token_type: "bearer",
    user: buyer,
  });
  vi.spyOn(storeApi, "logout").mockResolvedValue(undefined);
  const reset = vi
    .spyOn(storeApi, "resetPassword")
    .mockResolvedValue(undefined);
  const interaction = userEvent.setup();

  renderAccount();

  await waitFor(() => expect(window.location.search).toBe(""));
  await waitFor(() =>
    expect(screen.getByTestId("session-user").textContent).toBe(buyer.email),
  );
  expect(
    screen.getByText("Choose a new password to finish resetting your account."),
  ).toBeTruthy();
  expect(screen.queryByLabelText("Reset token")).toBeNull();
  await interaction.type(
    screen.getByLabelText("New password"),
    "fresh-password-123",
  );
  await interaction.type(
    screen.getByLabelText("Confirm password"),
    "fresh-password-123",
  );
  await interaction.click(
    screen.getByRole("button", { name: "Reset password" }),
  );

  await waitFor(() =>
    expect(reset).toHaveBeenCalledWith(token, "fresh-password-123"),
  );
  expect(
    screen.getByText(
      "Your password has been reset. Sign in with your new password.",
    ),
  ).toBeTruthy();
  expect(window.location.pathname).toBe("/");
});

it("requests a link when the reset URL has no token, even with a session", async () => {
  window.history.replaceState({}, "", "/reset-password");
  vi.spyOn(storeApi, "refresh").mockResolvedValue({
    token: "header.payload.signature",
    token_type: "bearer",
    user: buyer,
  });
  const forgot = vi
    .spyOn(storeApi, "forgotPassword")
    .mockResolvedValue(undefined);
  const interaction = userEvent.setup();
  renderAccount();

  await waitFor(() =>
    expect(screen.getByTestId("session-user").textContent).toBe(buyer.email),
  );
  expect(screen.getByLabelText("Email address")).toBeTruthy();
  expect(screen.queryByLabelText("New password")).toBeNull();
  expect(
    screen.getByRole("button", { name: "Return to account" }),
  ).toBeTruthy();

  await interaction.type(screen.getByLabelText("Email address"), buyer.email);
  await interaction.click(
    screen.getByRole("button", { name: "Send reset link" }),
  );
  await waitFor(() => expect(forgot).toHaveBeenCalledWith(buyer.email));
});

it("offers a new link after an expired reset link", async () => {
  const token = "AbCd_0123456789-abcdefghijKLMNOPqrstuv";
  window.history.replaceState({}, "", "/reset-password?token=" + token);
  vi.spyOn(storeApi, "refresh").mockRejectedValue(new Error("No session"));
  vi.spyOn(storeApi, "resetPassword").mockRejectedValue(
    new ApiError("Reset code is invalid or expired.", 403),
  );
  const interaction = userEvent.setup();
  renderAccount();

  await interaction.type(
    screen.getByLabelText("New password"),
    "fresh-password-123",
  );
  await interaction.type(
    screen.getByLabelText("Confirm password"),
    "fresh-password-123",
  );
  await interaction.click(
    screen.getByRole("button", { name: "Reset password" }),
  );
  expect(await screen.findByRole("alert")).toHaveProperty(
    "textContent",
    "This reset link is invalid or has expired. Request another link.",
  );

  await interaction.click(
    screen.getByRole("button", { name: "Request another reset link" }),
  );
  expect(screen.getByLabelText("Email address")).toBeTruthy();
  expect(screen.queryByLabelText("New password")).toBeNull();
  expect(window.location.pathname).toBe("/");
});
