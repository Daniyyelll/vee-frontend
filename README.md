# Vee storefront

A Vite + React + TypeScript storefront connected to Vee's FastAPI backend.
The visual direction uses peach-blush, rose gold, ivory, and cocoa.

## Run locally

Requires Node.js 22.12+ (developed with Node.js 24).
Start PostgreSQL and the API from `C:/vee` using `uv run python main.py`
(port 8084), then run this frontend:

```sh
npm ci
npm run dev
```

Open `http://localhost:3000`, which matches the backend's local
`FRONTEND_URL`. If you change Vite's host or port, update `FRONTEND_URL` to
the exact browser origin as well.

Vite proxies `/api` and `/uploads` to `http://127.0.0.1:8084`. Copy `.env.example`
to `.env.local` to change `VEE_API_TARGET`. `VITE_API_BASE_URL` defaults to `/api`.
For a separately hosted API, set its full URL including `/api` at build time.
Configure backend `FRONTEND_URL` to the storefront origin. Vite's proxy is for
development only; production needs that API URL or a reverse proxy for both
paths, and SPA fallback for `/collection`, `/checkout`,
`/order-confirmation`, `/reset-password`, and `/admin`.

Docker Desktop's engine must be running before `docker compose up -d postgres`.
The project database is configured for port 5433 on this development machine;
a separate PostgreSQL service on port 5432 does not satisfy the API's `.env`
settings. If the homepage opens but product loading fails with a Vite proxy 502,
check `docker compose ps` and start the API. FastAPI refuses to start when it
cannot reach its configured database.

If `uv` reports an access error for its cache under your user profile, run its
commands with `--no-cache`, for example `uv --no-cache run python main.py`.
The flag also works with `uv --no-cache sync` and
`uv --no-cache run alembic upgrade head`.

## Connected features

- Public products, uploaded images, server currency/price/stock, category filters,
  search, product details, loading/error/empty states, and retries.
- A dedicated `/collection` directory with live category counts, shareable
  category URLs, and Back/Forward navigation.
- Guest and signed-in cash-on-delivery checkout with server quotes, coupons,
  order placement, and a confirmation page that survives refresh in the same
  tab.
- Customer registration, login, `/users/me`, profile name/address updates,
  optional profile phone, password changes, and email reset-code flows.
- Public paginated reviews; signed-in customers can create reviews, edit their
  own, and confirm removal. FastAPI enforces ownership and delivered purchases.
- Admin workspace at `/admin`: overview and date-filtered sales statistics,
  order fulfillment and cash collection/refunds, product and category creation
  and editing, coupon issuance, and customer report moderation with review
  inspection/removal. The API remains
  responsible for role checks and valid order/payment transitions.

Access tokens remain in memory. The backend stores a revocable 14-day refresh
session in an HttpOnly cookie, so a reload restores the signed-in account.
The client refreshes the access token on expiry and retries a rejected bearer
request once. Logout clears the local credential and revokes the refresh
session. Changing or resetting a password invalidates existing access and
refresh tokens.
Reset uses the 8-character code in the email; the email URL opens the reset form.
Never put secrets into `VITE_` variables, which are public client configuration.

The customer bag is stored in this browser tab. Signed-in checkout syncs its
selection to the server cart before quoting. Guest and signed-in order placement
uses the live checkout API; cash collection remains an administrative delivery
workflow. The checkout API requires one delivery name, address, and phone
number for both guest and signed-in orders, and preserves the name and phone on
each order. The confirmation keeps only an order number and receipt token in
tab storage, then retrieves limited details after refresh. The receipt is valid
for 30 days; closing the tab removes the local reference. The newsletter is a
static coming-soon preview with no email form. Hero/ritual images remain labeled concepts;
catalog imagery and copy come from the backend.
The admin API currently has no coupon edit/deactivate or product image update
endpoint; the workspace shows those limits where relevant.
Report review inspection uses the admin-only `GET /api/reviews/{review_id}`
endpoint in the backend.

## Architecture

`src/api/client.ts` handles envelopes, errors, bearer headers, timeouts, and
cancellation. `src/api/store.ts` defines API contracts. `src/auth/Session.tsx`
owns session restoration; `src/catalog/useCatalog.ts` owns catalog loading. Components
under `src/components/` implement account, product, image, and review flows.
`src/App.tsx` composes the homepage and dialogs. `src/styles.css` holds tokens
and responsive states. Generated concept assets and provenance remain under
`public/images/` and `.impeccable/`.
`src/collection/` is the category directory, and `src/checkout/receipt.ts`
stores the confirmation reference without customer contact data.
`src/admin/` contains the admin workspace; `src/api/admin.ts` holds its API
contracts. Navigation between storefront and admin keeps the in-memory access
token in the current tab; a full reload restores it through the refresh cookie.

## Validation

```sh
npm test
npm run build
npm run format:check
```

Vitest covers API error/session behavior and account/review interactions with
mocked responses. Backend tests cover response contracts and authorization.
Live catalog reads and desktop/mobile layouts were checked in the browser.
Tests do not send reset emails or modify existing customer/product data.

Backend validation for this integration: 123 tests passed; 28 tests requiring a
separate disposable database were skipped. Full-repository Ruff lint and
format checks passed.
Frontend validation: 34 tests passed, production build and Prettier check passed.
