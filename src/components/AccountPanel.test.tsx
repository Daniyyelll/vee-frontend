import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { SessionProvider } from "../auth/Session";
import { ApiError } from "../api/client";
import { storeApi } from "../api/store";
import AccountPanel from "./AccountPanel";

afterEach(() => vi.restoreAllMocks());
const buyer = {
  id: "buyer",
  name: "Buyer",
  email: "buyer@example.com",
  role: "customer" as const,
  active: true,
  address: null,
  phone: null,
};
const renderAccount = (onSignedIn?: () => void) =>
  render(
    <SessionProvider>
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

it("shows the same reset instructions for an unknown account without sending another email", async () => {
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
    screen.getByRole("button", { name: "Send reset code" }),
  );
  expect(await screen.findByLabelText("Reset code")).toBeTruthy();
  expect(screen.getByRole("status").textContent).toContain(
    "If that email matches an account",
  );
  expect(api).toHaveBeenCalledOnce();
});

it("labels the account-creation action for new customers", () => {
  renderAccount();

  expect(screen.getByText("New customer?")).toBeTruthy();
  expect(
    screen.getByRole("button", { name: "Create an account" }),
  ).toBeTruthy();
});
