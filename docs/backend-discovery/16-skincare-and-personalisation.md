# 16 — Skincare Intelligence & Personalisation

## 1. Existing Skincare Structures

All skincare intelligence is currently **UI-only** inside `/skincare` (`src/app/skincare/page.tsx`) and `src/components/commerce/*`:
- **Skin Goals Questionnaire (`skincare/page.tsx:50-57,173-218`):** Step `02 / 04` (`More hydration`, `Even-looking tone`, `Fewer breakouts`, `A healthier routine`, `Barrier repair`, `Daily sun protection`) stored in React `useState<string[]>([])`. Steps `01`, `03`, `04` do not exist.
- **Product Metadata (`src/components/commerce/types.ts:9-19`):** `keyNotes: string[]`, `suitability: string`, `ritualStep: 'Cleanse' | 'Treat' | 'Hydrate' | 'Protect'`.
- **AM/PM Routine Slots (`RoutineAndOrdersLayout.tsx:40-47`):** 6 static slots (3 AM, 3 PM) with `linkedProduct?: SkincareProductSpec | null` (always `undefined`).

## 2. Personalisation & Telemetry Link

- **Stated Intention (`RoutineAndOrdersLayout.tsx:69`, `ProductDetailLayout.tsx:82`):** *"connects your existing Skin Clarity & Glow scan metrics to verified formulations"* and *"Mapped to skin clarity & hydration telemetry when commerce API is enabled."*
- **Existing Telemetry:** `Scan.categoryScores.skinClarity` (0–100 integer) is the **only** skin-related metric persisted today (`src/app/api/scan/route.ts:329`).
- **Missing Capabilities:**
  - User skin profile persistence (skin type, concerns, sensitivities/allergies, budget).
  - Ingredient & contraindication/incompatibility rules (e.g., retinoids + AHAs, pregnancy-safe flags).
  - Recommendation engine separating **beauty entertainment scoring** (`Lethality` / `Harmony Index`) from **skincare suitability** (non-medical disclaimer & clinical evidence boundaries).
  - Routine adherence tracking and replenishment reminders.
