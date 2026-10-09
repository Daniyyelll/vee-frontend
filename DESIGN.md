---
name: Vee — Botanical atelier
description: Warm, sculptural luxury cosmetics with the comfort of a quiet natural atelier.
colors:
  ivory: "#f5f0e9"
  paper: "#faf7f2"
  blush: "#ddbaa9"
  rose: "#b07e60"
  cocoa: "#4b352a"
  muted: "#795e50"
  line: "#d5c5b7"
  error-text: "#743625"
  error-ground: "#f1ded1"
typography:
  brand:
    fontFamily: "Pacifico, cursive"
    fontSize: "43px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "0"
  display:
    fontFamily: "DM Sans, Arial, sans-serif"
    fontSize: "clamp(52px, 5.15vw, 78px)"
    fontWeight: 500
    lineHeight: 1.1
    letterSpacing: "-0.03em"
  headline:
    fontFamily: "DM Sans, Arial, sans-serif"
    fontSize: "clamp(32px, 3.05vw, 47px)"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  title:
    fontFamily: "DM Sans, Arial, sans-serif"
    fontSize: "25px"
    fontWeight: 500
  body:
    fontFamily: "DM Sans, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.75
  supporting:
    fontFamily: "DM Sans, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "DM Sans, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 400
rounded:
  square: "0px"
spacing:
  control-gap: "12px"
  compact-gap: "16px"
  mobile-gutter: "24px"
  desktop-grid-gap: "27px"
  mobile-grid-gap: "33px"
components:
  button-primary:
    backgroundColor: "{colors.cocoa}"
    textColor: "{colors.paper}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "17px 24px"
  button-text:
    backgroundColor: "transparent"
    textColor: "{colors.cocoa}"
    typography: "{typography.label}"
    rounded: "{rounded.square}"
    padding: "8px 0"
  button-icon:
    backgroundColor: "transparent"
    textColor: "{colors.cocoa}"
    rounded: "{rounded.square}"
    size: "44px"
    padding: "0"
  input-email:
    backgroundColor: "transparent"
    textColor: "{colors.cocoa}"
    rounded: "{rounded.square}"
    padding: "14px 0"
    width: "100%"
  filter:
    backgroundColor: "transparent"
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    padding: "12px 5px"
  filter-selected:
    backgroundColor: "transparent"
    textColor: "{colors.cocoa}"
    typography: "{typography.label}"
    padding: "12px 5px"
  dialog:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.cocoa}"
    rounded: "{rounded.square}"
    width: "min(520px, calc(100% - 32px))"
  input-account:
    backgroundColor: "{colors.ivory}"
    textColor: "{colors.cocoa}"
    rounded: "{rounded.square}"
    padding: "12px 10px"
    width: "100%"
  input-review:
    backgroundColor: "{colors.ivory}"
    textColor: "{colors.cocoa}"
    rounded: "{rounded.square}"
    padding: "12px 10px"
    width: "100%"
  form-error:
    backgroundColor: "{colors.error-ground}"
    textColor: "{colors.error-text}"
    typography: "{typography.label}"
    padding: "14px 16px"
  form-message:
    backgroundColor: "{colors.ivory}"
    textColor: "{colors.cocoa}"
    typography: "{typography.label}"
    padding: "14px 16px"
---

# Design System: Vee

## Overview

**Creative North Star: "Botanical atelier"**

Vee's luxury feels rich, comforting, and unhurried. Warm paper, peach-blush packaging, copper and rose-gold details, limestone, amber vessels, and dry botanicals bring nature into a sunlit atelier. The user-confirmed rejection of green applies to the authored interface palette and concept imagery. Actual catalog photography is displayed as supplied by the backend; the user-provided Lip Balm photo includes green leaves.

Measured DM Sans headings, a Pacifico brand signature, and broad photography carry the atmosphere. Small, quiet controls keep collection exploration available, while fine seams and generous spacing give objects room to breathe. This document records the implemented visual system; the homepage's composition remains in its surface contract. Bundled hero and ritual imagery remain labeled concepts until an admin replaces them. Product photos, copy, categories, prices, currency, stock, and reviews come from the API; the bag and checkout remain previews.

**Key Characteristics:**

- Warm mineral neutrals with peach-blush and copper accents.
- Pacifico signature accents paired with clean DM Sans headings and controls.
- Unboxed photography, square geometry, and fine seams.
- Deliberate spaciousness and restrained motion.

## Colors

The palette combines warm paper and mineral tones with cocoa lettering; peach and metal warmth primarily come through the imagery.

### Primary

- **Cocoa** supplies the main text, solid actions, focus outlines, and selected controls.
- **Rose copper** supplies fine text-action underlines and scrollbar accents. Its warmth echoes the metal and packaging in the still lifes.

### Secondary

- **Peach blush** supplies selection color and the imagery's soft packaging character. It is not the default button fill.

### Neutral

- **Paper** is the page, navigation, and dialog ground, and the inverse text on cocoa actions.
- **Warm ivory** distinguishes the hero ground, image annotations, and small tags.
- **Muted cocoa** supports paragraphs, metadata, and inactive category controls.
- **Mineral seam** supplies product-action borders, quantity controls, search rows, and mobile navigation divisions.

Warm error text and its pale peach error ground distinguish account and review failures. Successful actions and session notices use ivory with cocoa text rather than adding a green success color.

### Named Rules

**The Dry Botanical Rule.** Keep authored nature warm and mineral: limestone, amber, dry stems, peach-blush, and copper or rose gold. Do not introduce green in the interface palette or concept imagery. Display backend-supplied product photography faithfully, including its existing foliage.

## Typography

**Brand Accent:** Pacifico, with a cursive fallback. Use it for the Vee wordmark and short emphasized phrases in homepage editorial headings only.

**Display and Body Font:** DM Sans, with Arial and sans-serif fallbacks. Use medium weight for headings and regular or semibold for interface text.

**Character:** Pacifico adds a warm handwritten signature while DM Sans keeps catalog details, prices, forms, and operations crisp. Both families are bundled with the app; only used Latin weights load.

### Hierarchy

- **Display:** The frontmatter display role governs the hero. At the intermediate breakpoint it becomes 57px; on mobile it uses `clamp(52px, 11.5vw, 72px)`.
- **Headline:** The frontmatter headline role governs collection headings. Other editorial headings retain the same face and weight but adjust to their compositions: introductory headings use `clamp(36px, 3.45vw, 52px)`, ritual headings use `clamp(39px, 3.8vw, 59px)`, and dialog headings use 35px.
- **Title:** Product names use the medium-weight DM Sans title role, rising to 26px on mobile. Bag item titles use 23px.
- **Body:** The frontmatter body role is used for primary customer-facing copy and product descriptions. Compact contextual copy is 15px; main editorial copy is 16px with line-height around 1.7–1.75. Deliberate line breaks remain local to each composition.
- **Supporting:** Short contextual paragraphs, dialog explanations, and empty states use the 15px supporting role.
- **Label:** Navigation, actions, labels, and filters use the quiet label role. Contextual metadata is smaller and belongs to its local component, rather than a new heading tier.

### Named Rules

**The Two Voices Rule.** Use Pacifico only for the Vee signature and short editorial accents. Use DM Sans for headings, product names, actions, navigation, prices, forms, and supporting explanation. The small V favicon uses DM Sans for legibility. Keep functional text out of Pacifico.

## Layout

The implementation uses full-width photographic bands and percentage gutters rather than a fixed maximum-width shell. Main desktop sections have 5.5% side gutters; at 1600px and above these become 8%. The header uses a three-part grid with the wordmark centered between navigation and tools.

The hero pairs text and imagery at 47%/53%, the ritual band at 48%/52%, and the newsletter at equal columns. The collection is a three-column grid with the desktop grid gap in frontmatter. At 1000px and below the grid gap becomes 17px and the header compresses. At 700px and below the main compositions stack, the collection becomes one column, the section gutter becomes the mobile gutter, navigation becomes a menu, and filters remain visible above the products. Product images change from a 4/4.7 aspect ratio to 4/4.1 on mobile.

Desktop editorial sections use roughly 86–94px of vertical breathing room; mobile sections typically use 49–63px. These are composition-specific measurements rather than a universal spacing scale. Dialogs preserve 16px viewport side clearance and a maximum height of `calc(100dvh - 48px)`; product details stack on mobile.

## Elevation & Depth

The page is flat at rest. Paper, ivory, peach-toned bands, broad still lifes, and one-pixel seams provide depth. Shadows are reserved for temporary feedback and dialogs; they do not wrap collection products.

### Shadow Vocabulary

- **Toast ambient:** `0 6px 24px rgba(75, 53, 42, 0.15)` grounds transient feedback.
- **Dialog ambient:** `0 15px 60px rgba(50, 30, 20, 0.16)` separates the modal from the page, paired with a warm dark translucent backdrop.

### Named Rules

**The Quiet Surface Rule.** Let tonal grounds, imagery, and fine seams define ordinary surfaces. Reserve ambient shadows for overlays and transient feedback.

## Shapes

Square geometry is the recurring form: actions, fields, product imagery, tags, and dialogs have no softened corners. Products are not boxed cards; image, name, price, and a small bordered add action form an open arrangement. Borders are fine, typically one pixel. Search fields use bottom seams; account and review fields use enclosing mineral-seam borders on ivory.

## Components

### Buttons

Solid actions are compact, confident cocoa rectangles with paper text, a one-pixel cocoa border, and a directional SVG icon. The canonical padding is in frontmatter; hover changes the fill to the implemented warmer cocoa (`#6a4736`) over 0.2s. Mobile and detail views reduce padding to fit their available width.

Text actions sit on a fine rose underline with an SVG arrow and become warm dark copper (`#8a5139`) on hover. Icon actions use a transparent square and the same copper hover color. The product add action is a local 39px square with a mineral-seam border. Global keyboard focus uses a two-pixel cocoa outline offset by five pixels. Disabled buttons reduce opacity to 0.5.

### Chips

Category filters are unfilled text controls rather than pills. Inactive text is muted; the pressed category uses cocoa text and a cocoa bottom seam. Their state is conveyed with `aria-pressed`. Category names come from the API, and filters wrap as needed. The small ivory image tag identifies an out-of-stock product; it is an availability annotation, not a new display hierarchy.

### Cards / Containers

Collection products remain unboxed and shadow-free. Their large photographic button includes an always-visible translucent ivory discovery bar, then an open information row. API product photos replace the illustrative catalog shots. Missing or failed photos use an ivory placeholder with muted text and an SVG; do not substitute invented product imagery. The open information row shows the API name and price with tabular numerals and the configured store currency. Add controls disable when stock is unavailable or the preview bag reaches the supplied stock quantity.

Dialogs use paper and cocoa with ambient elevation. Search rows and bag quantities use fine seams; product detail dialogs pair a full-height image with API copy, price, and availability before stacking on mobile. Account and review forms occupy the existing native dialog rather than a separate visual shell. The reviews region sits below product details behind a mineral seam with 32px padding, reduced to 27px 23px on mobile.

### Inputs / Fields

Search fields are transparent with cocoa text, muted placeholders, and a mineral bottom seam. Labels stay visible above inputs. The global focus outline is preserved for keyboard use. The newsletter is a static coming-soon preview and does not collect email addresses.

Account inputs and address textareas, review textareas, and rating selects use an ivory fill, cocoa text, square corners, a one-pixel mineral-seam border, 14px text, and the field padding in frontmatter. Account inputs and rating selects have a minimum height of 44px. Labels use 12px text with a 9px gap and 20px bottom spacing; textareas resize vertically with line-height 1.7. Busy forms disable their fieldsets and expose `aria-busy`; action labels become “Please wait…” or “Saving…”.

Form errors use the warm error pair in frontmatter with 12px text, line-height 1.7, and 22px bottom spacing; they expose `role="alert"`. Ivory action confirmations and session notices share the same padding and type treatment and expose `role="status"`. Catalog loading uses an ivory panel with 30px padding and a 220px minimum height. Request failures and empty collections use plain 13px copy with retry or exploration actions; their 28px serif headings remain local state headings.

Account modes cover sign-in, registration, reset, profile, and password changes. The bearer access token stays in memory for 15 minutes. A revocable HttpOnly refresh cookie restores the session after reload; its notice stays visible in small muted text. Reviews show API author, numeric rating, comment, and date with loading, error, empty, and pagination states. Signed-out visitors receive a sign-in action; delivered-purchase eligibility and ownership are enforced by the backend. Edit and remove actions appear for the current review owner, with inline removal confirmation. The preview bag does not create purchases or unlock reviews.

### Navigation

Small DM Sans links flank the Pacifico wordmark. Link hover uses an underline, with distinct SVG search, account, and bag controls on the right. On mobile the menu reveals a stacked, seam-separated link list beneath the header; the bag retains its numeric count while its text label is hidden.

### Still-life motion

The hero image settles once over 1.4s with `cubic-bezier(0.16, 1, 0.3, 1)`, moving from scale 1.035 and brightness 0.96 to its final state. Category selection can scroll smoothly to the collection. Reduced-motion preference disables animations and transitions and makes category scrolling immediate. Do not turn the settle into a repeating animation.

## Do's and Don'ts

### Do:

- **Do** preserve the Dry Botanical Rule in authored concept imagery and interface color, while displaying supplied product photos faithfully.
- **Do** pair selective Pacifico accents with DM Sans headings and controls.
- **Do** use open photographic arrangements, square geometry, and fine seams.
- **Do** keep keyboard focus visible and honor reduced-motion preferences.
- **Do** label bundled hero and ritual art as concepts, use API catalog facts, and keep bag and checkout preview disclosures visible.

### Don't:

- **Don't** add green tones or green foliage to the authored interface palette or concept imagery; supplied product photos retain their original colors.
- **Don't** give ordinary product arrangements overlay-style shadows.
- **Don't** introduce pill-shaped controls into the square component grammar.
- **Don't** repeat the hero's settle animation continuously.
- **Don't** convert temporary preview disclosures into a reusable promotional eyebrow or kicker style.

## Admin Workspace

The `/admin` route extends the same Vee palette and typography into an Operate surface. A warm ivory left rail anchors navigation; paper is the content ground, and fine mineral seams define tables, editors, and report panels. The Pacifico Vee signature keeps the brand present while DM Sans carries headings, labels, data, controls, and status text. Square geometry and restrained cocoa actions remain consistent with the storefront.

The overview gives live sales, order, refund, and stock context. Statistics expose date and currency filters; orders and reports use compact tables on desktop and tappable rows on mobile. Editors sit inline above their lists. Order and report details use a right drawer with keyboard focus contained inside it. The mobile rail is hidden from keyboard navigation until opened, then focuses its close control and supports Escape. Status tones stay within the established warm mineral palette; backend product images are shown as supplied.

The admin workspace uses the existing session and API response vocabulary. It communicates loading, error, empty, disabled, and success states. Destructive review, product, category, cancellation, and refund actions require explicit confirmation or a reason where the backend calls for one. Backend authorization and workflow validation remain authoritative.

The Landing images editor manages only Hero and Ritual. Each slot previews wide and narrow crops, accepts one replacement image, required alternative text, an optional caption, and a focal point. Save publishes immediately. The controls use the same square fields, cocoa action, and paper surface as catalog editors; the storefront keeps bundled art as a fallback.
