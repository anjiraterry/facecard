# 24 — Evidence Index

| Relative Path | Subsystem | Key Symbols / Components | Related Docs |
|---|---|---|---|
| `prisma/schema.prisma` | Database | 16 models, 10 enums | `12-existing-database-schema.md` |
| `prisma/migrations/2_points_integrity/migration.sql` | Database | `PointsLedger_append_only` trigger, CHECK constraints | `09`, `12` |
| `prisma/seed.ts` | Database | `SEED_SHOP_ITEMS`, 5 seeded users, 3 `FaceOff`s | `12` |
| `scripts/add_constraints.ts` | Database | Permissive RLS policies, extra CHECKs | `12`, `18` |
| `src/lib/db.ts` | Database | `db` proxy, `getConnectionString()` (Hyperdrive) | `01`, `12`, `23` |
| `src/lib/economy.ts` | Economy | `EconomyConfig` | `09`, `10` |
| `src/lib/ledger.ts` | Economy | `postLedger()`, `grantSignupBonus()`, `reconcileAllLedgers()` | `09`, `12` |
| `src/lib/scoring.ts` | Scoring | `calculateRawScore()`, `getVerdictBand()`, `calculateScanPoints()`, `getLagosDayKey()` | `07`, `09` |
| `src/lib/idempotency.ts` | API Infra | `runIdempotent()`, `parseIdempotencyKey()` | `13`, `23` |
| `src/lib/logger.ts` | Security / Ops | `StructuredLogger`, `scrubImageData()` | `18` |
| `src/lib/auth/sessions.ts` | Auth | `createSession()`, `validateSessionToken()`, `applySessionCookie()` | `06`, `18` |
| `src/lib/auth/session.ts` | Auth | `getSessionUser()`, `getRequiredUser()` | `06`, `13` |
| `src/lib/auth/otp.ts` | Auth | `createAndSendOtp()`, `verifyOtpCode()`, `hashOtp()` | `06`, `18` |
| `src/lib/auth/pin.ts` | Auth | `hashPin()`, `verifyPin()` (`scrypt`) | `06` |
| `src/lib/auth/rateLimit.ts` | Auth / Security | `isRateLimited()`, `recordAttempt()`, `getClientIp()` | `06`, `19` |
| `src/lib/auth/server.ts` & `client.ts` | Auth (Unused) | `createNeonAuth()`, `createAuthClient()` | `06`, `18` |
| `src/lib/rating/engine.ts` | Facial Analysis | `scoreFace()`, `analyzeImageBytes()`, `callAiGatewayVision()` | `07`, `18` |
| `src/lib/rating/fairness.ts` | Facial Analysis | `runFairnessAudit()` | `07` |
| `src/lib/vision/liveness.ts` | Liveness | `initFaceLandmarker()`, `evaluateLivenessFrame()` | `07`, `18` |
| `src/lib/spikes/spikes.ts` | Legacy / Email | `sendBrevoOtpEmail()`, `verifyAndScoreFeatureVector()` | `02`, `06`, `07` |
| `src/lib/faceoff.ts` | Arena | `createFaceOff()`, `joinFaceOff()`, `resolveFaceOff()`, `expireStaleDuels()` | `10` |
| `src/lib/paystack.ts` | Payments (Stub) | `initializePaystackTransaction()`, `verifyPaystackWebhookSignature()` | `15`, `18` |
| `src/lib/storage.ts` | Storage (Stub) | `s3`, `getPresignedUploadUrl()` | `01`, `19` |
| `src/lib/aiGateway.ts` | AI (Stub) | `callNeonAIGateway()` | `01`, `07` |
| `src/app/skincare/page.tsx` | Atelier | `SkincareAtelierPage` (7 preview views) | `05`, `16` |
| `src/components/commerce/*` | Atelier | `types.ts`, `ProductCard`, `ProductDetailLayout`, `BagAndCheckoutLayout`, `RoutineAndOrdersLayout` | `05`, `14`, `15`, `16` |
| `src/app/shop/page.tsx` | Boutique | `ShopPage` | `04`, `05`, `09` |
| `src/components/card/FaceCard.tsx` | Digital Cards | `FaceCard`, `ProceduralEngraving` | `08` |
| `src/components/card/materials.ts` & `engraving.ts` | Digital Cards | `TIER_MATERIALS`, `resolveCardMaterial()`, `generateContourEngraving()` | `08` |
| `src/app/api/**` | API Routes | 27 route files | `13` |
| `src/services/*` & `src/hooks/*` | Client Data | `apiClient`, 6 services, 6 hooks | `01`, `14` |
