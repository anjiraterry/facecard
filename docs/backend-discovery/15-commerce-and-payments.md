# 15 — Commerce & Payments Architecture

## 1. Current Commerce Landscape

Face Card currently has **two** separate commerce surfaces:
1. **Points Boutique (`/shop`):** Virtual-currency (`PTS`) store for digital Face Card cosmetics (`SKIN`, `TITLE`, `FRAME`) and perks (`CONSUMABLE`). **Implemented** in DB (`ShopItem`, `UserItem`, `Purchase`) and API (`/api/shop/*`).
2. **Atelier (`/skincare`):** Physical skincare storefront preview (`src/components/commerce/*`). **Unimplemented** — no DB tables, no APIs, no cart/order persistence, no inventory, no payment integration.

## 2. Paystack Integration Stub (`src/lib/paystack.ts`)

- `initializePaystackTransaction(params, secretKey)` (`paystack.ts:27-91`): Calls `https://api.paystack.co/transaction/initialize` with `{ email, amount: amountInKobo, reference, callback_url, metadata }`.
  - **Enforces Economy Rule:** Throws if `metadata.itemType === 'POINTS'` (`paystack.ts:34-36`).
  - **Allowed `itemType` values:** `'COSMETIC' | 'PRACTICE_SCANS' | 'MEMBERSHIP'` (note: physical `'SKINCARE_ORDER'` is not even in this union!).
  - **Mock fallback:** If `PAYSTACK_SECRET_KEY` is empty, returns `https://checkout.paystack.com/mock-${reference}`.
- `verifyPaystackWebhookSignature(rawBody, signature, secretKey)` (`paystack.ts:96-104`): Computes HMAC-SHA512. **Security Risk:** Returns `true` when `PAYSTACK_SECRET_KEY` is empty ("dev bypass").
- **Current Usage:** **Zero callers** anywhere in `src/app/` or `src/app/api/`. No webhook endpoint (`/api/webhooks/paystack`) exists.

## 3. Missing Physical Commerce Capabilities (for Atelier)
- **Retail Model:** Unverified (direct retail vs. marketplace vs. affiliate).
- **Missing Entities & Logic:** Brands, SKUs/Variants (size, volume, shade), Inventory & Stock Reservations (with TTL), Multi-currency / NGN pricing in minor units (`Int`), Tax & Shipping calculation, Discounts/Coupons, Persistent Shopping Bag, Guest vs. Authenticated Checkout, Shipping Addresses, Order State Machine, Fulfilment/Tracking, Refunds/Returns/Chargebacks, Loyalty/Points interaction (if any).
