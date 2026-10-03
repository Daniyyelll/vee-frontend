import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";
import { ApiError } from "../api/client";
import { storeApi } from "../api/store";
import { SessionProvider, useSession } from "../auth/Session";
import ReviewsPanel from "./ReviewsPanel";

const buyer = {
  id: "buyer",
  name: "Buyer",
  email: "buyer@example.com",
  role: "customer" as const,
  active: true,
  address: null,
  phone: null,
};
const review = {
  id: "review",
  userId: "buyer",
  productId: "product",
  username: "Buyer",
  rating: 5,
  comment: "Comforting",
  createdAt: "2026-09-29T10:00:00Z",
};
let session: ReturnType<typeof useSession>;
function Probe() {
  session = useSession();
  return <ReviewsPanel productId="product" onSignIn={vi.fn()} />;
}
afterEach(() => vi.restoreAllMocks());
async function signIn() {
  vi.spyOn(storeApi, "login").mockResolvedValue({
    token: "credential",
    token_type: "bearer",
    user: buyer,
  });
  vi.spyOn(storeApi, "me").mockResolvedValue(buyer);
  await act(() => session.signIn(buyer.email, "example-password"));
}

it("shows ownership actions only for the signed-in reviewer and confirms removal", async () => {
  vi.spyOn(storeApi, "reviews").mockResolvedValue([review]);
  const remove = vi
    .spyOn(storeApi, "deleteReview")
    .mockResolvedValue(undefined);
  const interaction = userEvent.setup();
  render(
    <SessionProvider>
      <Probe />
    </SessionProvider>,
  );
  await screen.findByText("Comforting");
  expect(screen.queryByRole("button", { name: "Edit your review" })).toBeNull();
  await signIn();
  expect(screen.getByRole("button", { name: "Edit your review" })).toBeTruthy();
  await interaction.click(
    screen.getByRole("button", { name: "Remove review" }),
  );
  expect(remove).not.toHaveBeenCalled();
  await interaction.click(screen.getByRole("button", { name: "Yes, remove" }));
  await waitFor(() =>
    expect(remove).toHaveBeenCalledWith("credential", "review"),
  );
  expect(await screen.findByText("Your review has been removed.")).toBeTruthy();
});

it("keeps the review draft and exposes the backend purchase restriction", async () => {
  vi.spyOn(storeApi, "reviews").mockResolvedValue([]);
  const create = vi
    .spyOn(storeApi, "createReview")
    .mockRejectedValue(new ApiError("A delivered purchase is required", 403));
  const interaction = userEvent.setup();
  render(
    <SessionProvider>
      <Probe />
    </SessionProvider>,
  );
  await screen.findByText("No reviews on this page yet.");
  await signIn();
  await interaction.type(screen.getByLabelText("Your review"), "Comforting");
  await interaction.click(screen.getByRole("button", { name: "Post review" }));
  expect((await screen.findByRole("alert")).textContent).toContain(
    "delivered purchase",
  );
  expect(
    (screen.getByLabelText("Your review") as HTMLTextAreaElement).value,
  ).toBe("Comforting");
  expect(create).toHaveBeenCalledWith("credential", "product", 5, "Comforting");
});
