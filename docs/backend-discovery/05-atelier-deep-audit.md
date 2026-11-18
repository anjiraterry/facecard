# 05 — Atelier Deep Audit (Skincare Commerce & Personalisation)

> **Scope:** Exhaustive audit of `/skincare` (`src/app/skincare/page.tsx`), `src/components/commerce/*`, and all references to "Atelier" across the repository (`src/app/page.tsx`, `src/app/home/page.tsx`, `src/app/shop/page.tsx`, `src/components/navigation/BottomNav.tsx`, `src/app/friends/add/page.tsx`).

---

## 1. What the Atelier Actually Is (Verified vs. Uncertain)

### Verified Facts
1. **Two Distinct Shop Experiences:**
   - `/shop` ("Boutique" / Points Boutique) is the **implemented** digital cosmetics & perks shop (`SKIN`, `TITLE`, `FRAME`, `CONSUMABLE`) transacted in `PTS` (`spendableBalance`).
   - `/skincare` ("Atelier") is a **frontend-only design foundation / preview** for **physical skincare commerce and personalized skincare routines**, completely separate from `/shop`.
2. **Explicit Preview Disclaimer:**
   - `src/app/skincare/page.tsx:80-88`: *"Atelier Storefront Design Foundation (Preview Only) — Reusable editorial commerce layouts and components. Live inventory, recommendations, and checkout transactions are not yet enabled. Existing Face Card cosmetics remain in the Points Boutique."*
3. **Intended Capabilities Evidenced in Code (`src/app/skincare/page.tsx` & `src/components/commerce/*`):**
   - **Curated Skincare Storefront:** Categories `ALL`, `CLEANSERS`, `SERUMS`, `MOISTURIZERS`, `SUN_CARE` (SPF), `RITUAL_SETS` (`src/components/commerce/types.ts:1-7`).
   - **Product Detail Page (PDP):** Gallery slot, category + volume label, formulation narrative, retail price, key botanical & active notes, skin suitability mapped to scan telemetry (`RoutineAndOrdersLayout.tsx:69`, `ProductDetailLayout.tsx:82`).
   - **Voluntary Skin Profile Consultation (`QUESTIONNAIRE`):** Multi-step (`02 / 04` shown in UI) voluntary skin goals selector (`More hydration`, `Even-looking tone`, `Fewer breakouts`, `A healthier routine`, `Barrier repair`, `Daily sun protection`) (`src/app/skincare/page.tsx:50-57,173-218`).
   - **Personalised AM/PM Routine Builder (`ROUTINES`):** 3 AM steps (`Gentle Cleanse`, `Hydrating Serum`, `Broad-Spectrum Protection`) + 3 PM steps (`Evening Cleanse`, `Restorative Treatment`, `Barrier Cream`), each linking to a `SkincareProductSpec` (`RoutineAndOrdersLayout.tsx:40-47`).
   - **Shopping Bag, Checkout & Order History:** `ShoppingBagLayout`, `CheckoutLayout` (recipient name, email, delivery address, Standard Courier, Payment Gateway), and `OrderHistoryLayout` (`BagAndCheckoutLayout.tsx`, `RoutineAndOrdersLayout.tsx`).

### Uncertainties / Open Questions
- **Retail Model:** Unknown whether Face Card holds its own inventory, dropships, acts as a multi-brand marketplace, or uses affiliate links.
- **Currency & Region:** `ProductDetailLayout.tsx` shows `"Connect Catalogue"` and `BagAndCheckoutLayout.tsx` shows `"—"`; `src/lib/paystack.ts` uses Naira/kobo (`amountInKobo`), and `getLagosDayKey` assumes `Africa/Lagos`, but Atelier currency/shipping regions are unverified.
- **Points Interaction:** Unknown if Face Card `PTS` can discount physical Atelier orders or if Atelier purchases grant `PTS` / tier progress.
- **Hardcoded Reference:** `src/app/friends/add/page.tsx:110` displays `FC-8821-ATELIER` as a static invite code, unrelated to `/skincare`.

---

## 2. Atelier Feature & Commerce Capability Breakdown

| Capability | Status in Codebase | Source Evidence |
|---|---|---|
| **Product Catalogue & Categories** | Frontend-only empty slots (3 `ProductCard` nulls) | `src/app/skincare/page.tsx:163-167`, `ProductCard.tsx:20-56` |
| **Search & Category Filtering** | Local React state (`searchQuery`, `activeCategory`), no data to filter | `src/app/skincare/page.tsx:61-62,127-161` |
| **Filter by Skin Profile** | Disabled button (`cursor-not-allowed`) | `src/app/skincare/page.tsx:136-143` |
| **Sorting & Pagination** | Missing (not present in UI or types) | — |
| **Brands / Multi-vendor** | Missing (`SkincareProductSpec` has no `brand` field) | `src/components/commerce/types.ts:9-19` |
| **Product Variants (Sizes/Shades)** | Missing (`volumeLabel` is a single string, no variant selector) | `src/components/commerce/types.ts:14` |
| **Ingredients & Suitability** | `keyNotes: string[]`, `suitability: string` in `SkincareProductSpec` | `src/components/commerce/types.ts:16-17`, `ProductDetailLayout.tsx:60-84` |
| **Pricing, Discounts, Inventory** | `priceFormatted: string` only; no numeric price, currency, stock, or discounts | `src/components/commerce/types.ts:15` |
| **Skin Profile Questionnaire** | Interactive local state (`selectedGoals: string[]`) for step `02 / 04` only; steps 1, 3, 4 do not exist; not persisted | `src/app/skincare/page.tsx:63-70,173-218` |
| **AM/PM Routine Builder** | Static `DEFAULT_ROUTINE_SLOTS` (6 slots), `linkedProduct` always `undefined` | `RoutineAndOrdersLayout.tsx:40-47` |
| **Recommendations Engine** | Architecture slot text only: *"connects your existing Skin Clarity & Glow scan metrics to verified formulations"* | `RoutineAndOrdersLayout.tsx:68-70` |
| **Shopping Bag & Wishlists** | `ShoppingBagLayout` accepts `items = []`; Add-to-Bag buttons disabled; no wishlist UI | `BagAndCheckoutLayout.tsx:11-53`, `ProductCard.tsx:91`, `ProductDetailLayout.tsx:87` |
| **Checkout & Payments** | Disabled form inputs (`Recipient Name`, `Contact Email`, `Delivery Address`), disabled `Place Order` button | `BagAndCheckoutLayout.tsx:55-102` |
| **Orders & Fulfilment** | `OrderHistoryLayout` renders empty state; `OrderRecordPlaceholder` has `Fulfilled \| In Transit \| Processing` | `RoutineAndOrdersLayout.tsx:9-38`, `types.ts:26-32` |
| **Reviews, Returns, Loyalty** | Missing | — |

---

## 3. Atelier Data Structures (`src/components/commerce/types.ts`)

```typescript
// Originating file: src/components/commerce/types.ts:1-40
// Consumed by: ProductCard.tsx, ProductDetailLayout.tsx, BagAndCheckoutLayout.tsx, RoutineAndOrdersLayout.tsx, skincare/page.tsx
// Persistence: NONE (in-memory/preview only)

export type CommerceCategory =
  | 'ALL'
  | 'CLEANSERS'
  | 'SERUMS'
  | 'MOISTURIZERS'
  | 'SUN_CARE'
  | 'RITUAL_SETS';

export interface SkincareProductSpec {
  id: string;
  name: string;
  category: Exclude<CommerceCategory, 'ALL'>;
  subtitle: string;
  volumeLabel: string;
  priceFormatted: string;       // NOTE: display string only; backend needs integer minor units + currency
  keyNotes: string[];
  suitability: string;
  ritualStep: 'Cleanse' | 'Treat' | 'Hydrate' | 'Protect';
}

export interface BagLineItem {
  product: SkincareProductSpec;
  quantity: number;
}

export interface OrderRecordPlaceholder {
  orderNumber: string;
  placedAt: string;
  status: 'Fulfilled' | 'In Transit' | 'Processing';
  totalFormatted: string;
  itemCount: number;
}

export interface RoutineStepSlot {
  timeOfDay: 'AM' | 'PM';
  stepNumber: number;
  stepTitle: string;
  guidance: string;
  linkedProduct?: SkincareProductSpec | null;
}
```

**Data Governance Assessment:**
- `SkincareProductSpec`, `OrderRecordPlaceholder`, and `RoutineStepSlot` represent **anticipated backend entities** (`Product`, `Order`, `Routine` / `RoutineStep`).
- `selectedGoals` (`string[]`) in `skincare/page.tsx:63` represents **user-controlled health/skin preference data** (sensitive under NDPA if linked to skin conditions) that must be persisted server-side with explicit consent.
- `priceFormatted` and `totalFormatted` must **never** be client-controlled; backend must calculate totals from authoritative server-side prices in minor currency units.

---

## 4. Atelier Interaction-to-Backend Mapping

| User Action | Source Component | Current Behaviour | Data Required | Existing API | Persistence Required | Missing Backend Capability |
|---|---|---|---|---|---|---|
| View Atelier Catalogue | `src/app/skincare/page.tsx:122-169` | Renders 3 `ProductCard` null skeletons | Category, search query, pagination, user skin profile | None | No (catalog read) | `GET /api/atelier/products` (catalog query, search, filter, sort, pagination) |
| Search formulations | `src/app/skincare/page.tsx:127-134` | Updates local `searchQuery` state; no effect | `q`, category, skin filters | None | No | Full-text / indexed product search |
| Filter by category | `src/app/skincare/page.tsx:146-161` | Updates local `activeCategory` state | `category` | None | No | Category filter query param |
| Filter by Skin Profile | `src/app/skincare/page.tsx:136-143` | Disabled button | User's saved skin goals + latest `Scan.categoryScores.skinClarity` | None | Yes (skin profile) | Skin profile storage + suitability matching query |
| Inspect Product (PDP) | `ProductCard.tsx:86-90`, `ProductDetailLayout.tsx` | Not wired on `/skincare` (passes `product={null}`) | Product slug/ID, variants, stock, ingredients | None | No | `GET /api/atelier/products/:id` |
| Toggle Skin Goals (`02 / 04`) | `src/app/skincare/page.tsx:65-70,188-206` | Local `selectedGoals` array; lost on refresh | `goals[]`, skin type, sensitivities, consent | None | **Yes** (DB) | `PUT /api/atelier/skin-profile` (auth, validation, consent) |
| Preview / Build Routine | `src/app/skincare/page.tsx:213-220`, `PersonalRoutineLayout` | Switches to static 6-slot AM/PM grid | User skin profile, scan telemetry, product matches | None | **Yes** (DB) | Recommendation engine + `GET/PUT /api/atelier/routines` |
| Add to Shopping Bag | `ProductCard.tsx:91`, `ProductDetailLayout.tsx:87` | Disabled button | `productId`, `variantId`, `quantity` | None | **Yes** (DB/session) | `POST /api/atelier/bag/items` (stock check, auth/guest cart) |
| View / Update Bag | `ShoppingBagLayout` (`BagAndCheckoutLayout.tsx:11-53`) | Empty state + `—` totals | Bag items, server-calculated subtotal, shipping | None | **Yes** | `GET/PATCH/DELETE /api/atelier/bag` |
| Place Order / Checkout | `CheckoutLayout` (`BagAndCheckoutLayout.tsx:55-102`) | Disabled inputs & button | Recipient, email, address, shipping method, payment init, `Idempotency-Key` | None (`paystack.ts` unused) | **Yes** (ACID) | Order creation, stock reservation, Paystack init + webhook verification |
| View Order History | `OrderHistoryLayout` (`RoutineAndOrdersLayout.tsx:9-38`) | Empty state | Authenticated user's orders | None | **Yes** | `GET /api/atelier/orders` (auth, ownership check) |
