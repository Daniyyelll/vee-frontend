# Vee

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Vite + React, selected by the user. Deployment target is undecided.

## Users

The ecommerce frontend serves customers shopping for Vee cosmetics. Specific audience segments, markets, languages, and customer needs are undecided.

## Product Purpose

Provide the ecommerce frontend for Vee, a luxury cosmetics brand.

## Positioning

Vee is positioned as a luxury cosmetics brand. Specific differentiators and supporting product claims have not been established.

## Capabilities and Constraints

- Scope: the brand's ecommerce frontend.
- Required stack: Vite + React.
- FastAPI supplies products, categories, uploaded images, prices, stock, and the configured store currency. Customer authentication, profiles, password flows, and reviews are connected.
- The storefront uses Vite + React + TypeScript. The bag stays in browser-tab state. Guest and signed-in cash-on-delivery checkout use live server quotes, coupon validation, stock checks, and order placement; signed-in checkout syncs the selection to the server cart. Cash collection remains a staff workflow. Deployment target is undecided.
- The `/collection` page leads with live categories and product counts, then shows products in the selected category. The category URL is shareable and supports browser Back/Forward navigation.
- Checkout returns a short-lived receipt capability. The confirmation page stores only the order number and receipt token in tab storage and can recover limited order details after refresh for 30 days. Closing the tab removes that local reference.
- Sessions use in-memory bearer access tokens and a revocable HttpOnly refresh cookie. Reload restores a signed-in account while the refresh session is valid. Reviews require delivered purchases and backend ownership authorization.
- Administrators use a protected `/admin` workspace for orders and cash payment operations, product and category management, coupons, customer report moderation, and sales statistics. The backend enforces the role; the frontend keeps the access token only in memory and restores it after reload through the refresh cookie.

## Brand Commitments

- Brand name: Vee.
- Preserve its luxury cosmetics positioning.
- User-directed feeling: luxury rooted in nature, rich, comforting, and calming.
- No greens in the authored visual palette or concept imagery. Catalog photos are displayed as supplied by the backend; the user-provided Lip Balm photo contains green leaves.
- Use peach-blush packaging color and rose-gold metal tones from the supplied reference.
- First surface: a storefront homepage. Botanical atelier selected, code-led.
- Collection surface: category directory selected, code-led. Lead with category browsing and keep promotional copy minimal.
- Approved identity assets have not yet been supplied; generated images are concepts.

## Evidence on Hand

The user's brief confirms the brand name, category, positioning, frontend scope, and stack. The existing README.md names the repository vee-frontend.

The local API currently supplies Lip Balm at EGP 170.00 in Lip Care and the user-uploaded product photograph. Catalog copy and availability come from the API; hero and ritual images remain labeled concepts. Future work must not invent commerce data or claims.


