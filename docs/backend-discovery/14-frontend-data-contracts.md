# 14 — Frontend Data Contracts

## 1. Core Domain Types (`src/types/index.ts`)

- `Tier`: `'CLASSIC' | 'GOLD' | 'PLATINUM' | 'BLACK'`
- `Band`: `'HARMLESS' | 'SUSPICIOUS' | 'DANGEROUS' | 'LETHAL'`
- `ToneMode`: `'HYPE' | 'SMOOTH' | 'ROAST' | 'STRAIGHT'`
- `FaceOffMode`: `'STAKED' | 'FRIENDLY'`
- `FaceOffStatus`: `'WAITING' | 'ACTIVE' | 'TIE_REMATCH' | 'COMPLETED' | 'EXPIRED' | 'CANCELLED'`
- `CategoryBreakdown`: `{ photoCraft, harmony, skinClarity, featureDefinition?, symmetry?, expression, aura }`
- `LethalityResult`: `{ score, band, verdictLine, categoryBreakdown, tips, pointsEarned, multiplier, newStreak, tier, unlockedNewTier? }`
- `FaceCardData`: `{ id?, tier, score?, band?, cardNumber?, cardholderName, handle?, title?, skinId?, frameId?, avatarUrl?, streakDays?, multiplier? }`

## 2. Service Layer Contracts (`src/services/*.ts`)

- **`UserProfile`** (`authService.ts:3-21`): `{ id, email, displayName, handle, dob?, dobFormatted?, location?, bio?, tier, lifetimePoints, spendableBalance, streakDays, streakMultiplier, streakFreezesHeld, memberSince?, biometricVerified?, avatarUrl? }`
  - *Gap:* `dob`, `location`, `bio` are expected by `/profile` UI but not persisted in `User` table.
- **`CardDetailsResponse`** (`cardService.ts:29-41`): `{ success, activeCard, tiers: CardTierItem[], formula?, spendableBalance, lifetimePoints, nextTierPoints, progressPercent, equippedSkinId, equippedTitleId, equippedFrameId }`
- **`PointsLedgerResponse`** (`cardService.ts:43-53`): `{ success, spendableBalance, lifetimePoints, scansLeftToday, maxScansPerDay, resetTimeWat, streakMultiplier, fundingHistory, spendsHistory }`
- **`ScanResultResponse`** (`scanService.ts:4-41`) & **`LivenessPayload`** (`scanService.ts:43-47`): `{ passed, actionsCompleted, clientEngine? }`
- **`ShopItemData`** (`shopService.ts:3-16`) & **`ShopCatalogResponse`** (`shopService.ts:18-28`)
- **`DuelItem`** (`faceoffService.ts:3-25`): Note `status` is typed as `'WAITING' | 'ACTIVE' | 'COMPLETED'` in `faceoffService.ts:15` (omits `'TIE_REMATCH' | 'EXPIRED' | 'CANCELLED'`).
- **`FriendItem`** (`src/app/api/friends/route.ts:8-22`) & **`FriendProfileData`** (`src/app/friends/[id]/page.tsx:34-72`).

## 3. Atelier / Skincare Commerce Contracts (`src/components/commerce/types.ts`)

- `CommerceCategory`: `'ALL' | 'CLEANSERS' | 'SERUMS' | 'MOISTURIZERS' | 'SUN_CARE' | 'RITUAL_SETS'`
- `SkincareProductSpec`: `{ id, name, category, subtitle, volumeLabel, priceFormatted, keyNotes, suitability, ritualStep }`
- `BagLineItem`: `{ product: SkincareProductSpec, quantity: number }`
- `OrderRecordPlaceholder`: `{ orderNumber, placedAt, status: 'Fulfilled' | 'In Transit' | 'Processing', totalFormatted, itemCount }`
- `RoutineStepSlot`: `{ timeOfDay: 'AM' | 'PM', stepNumber, stepTitle, guidance, linkedProduct? }`
