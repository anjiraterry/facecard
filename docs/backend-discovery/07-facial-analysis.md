# 07 — Facial Analysis Subsystem

## 1. End-to-End Pipeline (`src/app/scan/page.tsx` → `POST /api/scan`)

1. **Client Capture & Liveness (`src/app/scan/page.tsx`, `src/components/camera/LivenessOverlay.tsx`, `src/lib/vision/liveness.ts`):**
   - Captures 640×640 or 1080×1080 JPEG (`toDataURL('image/jpeg', 0.85)`) via `getUserMedia`, or via `startSyntheticCamera()` ("Test Live Camera Simulator" button in `scan/page.tsx:165-197,403-409` — a stylized smiley face drawn on a `<canvas>`!).
   - `LivenessOverlay` generates 2 random actions from `TURN_LEFT`, `TURN_RIGHT`, `BLINK`, `NOD_UP`, `SMILE` and evaluates frames using `@mediapipe/tasks-vision` `FaceLandmarker` (loaded from `cdn.jsdelivr.net` + `storage.googleapis.com`) with an optical luminance-quadrant fallback.
   - **Bypass:** Users can click the prompt card (`handleManualActionPass`, line 241) or click `Skip Action →` (line 315) to bypass liveness.
2. **API Request (`POST /api/scan`, `src/app/api/scan/route.ts`):**
   - Requires `fc_session` auth (`401` if missing) and `Idempotency-Key` header (`400` if missing).
   - Validates `imageBase64` non-empty and `<= 11_000_000` chars (~8 MB decoded).
   - Enforces `ageConfirmedAt` & `consentAt` (`403` unless `consentAccepted` / `ageConfirmed` is passed).
   - Checks `DAILY_SCAN_CAP` (3 `SOLO` scans per `dayKey` in `Africa/Lagos` WAT) via `ScanSlot` unique constraint `(userId, dayKey, slotIndex)`.
3. **Quality Gate & Scoring (`scoreFace()` in `src/lib/rating/engine.ts:344-486`):**
   - **Quality Gate (`analyzeImageBytes`, lines 145-263):** Checks magic bytes (`jpeg`, `png`, `webp`), samples up to 1,000 bytes for mean byte value (exposure: rejects `< 22` or `> 242`), byte-to-byte diff + Shannon entropy (sharpness: rejects `sharpnessScore < 40 || entropy < 3.5`). Does **not** verify that a human face is present in the image!
   - **AI Vision Call (`callAiGatewayVision`, lines 291-339):** If `NEON_AI_GATEWAY_BASE_URL` and `NEON_AI_GATEWAY_TOKEN` are set, POSTs to `/v1/chat/completions` (`model: 'gpt-4o-mini'`, 6s timeout) requesting JSON `{ lighting, sharpness, framing, harmony, skinClarity, featureDefinition, symmetry, expression, aura }`.
   - **SHA-256 Fallback (lines 400-419):** If AI Gateway env vars are missing, call fails, or times out, computes `crypto.createHash('sha256').update(imageStr).digest()` and derives `faceHarmony` (72–96), `faceSkinClarity` (70–95), `faceFeatureDefinition` (74–96), `faceSymmetry` (70–95), `expressionScoreVal` (75–95). **Warning:** This produces plausible-looking "biometric" scores from a cryptographic hash of any valid JPEG/PNG, including the synthetic smiley face!
   - **Client Feature Vector Path (lines 358-381):** If `input.featureVector` (`ClientFeatureVector`) is passed, `scoreFace()` trusts client-supplied `qualityGate.passed`, `lightingBalance`, `symmetry`, etc. (though `/api/scan` currently passes `imageBuffer`, not `featureVector`).
4. **Scoring Formula (`engine.ts:431-449`, `scoring.ts:4-43`):**
   - `photoCraftScore` (30%) = `lighting * 0.15 + sharpness * 0.08 + framing * 0.07`
   - `faceScore` (45%) = `harmony * 0.18 + skinClarity * 0.12 + featureDefinition * 0.10 + symmetry * 0.05`
   - `expressionScore` (15%) = `expression * 0.15`
   - `auraScore` (10%) = `aura * 0.10`
   - `totalScore = clamp(0, 100, photoCraftScore + faceScore + expressionScore + auraScore)`
   - Verdict Bands: `>= 85` `LETHAL`, `>= 65` `DANGEROUS`, `>= 40` `SUSPICIOUS`, `< 40` `HARMLESS`.
5. **Zero Data Retention:** `imageBase64 = ''` immediately after `scoreFace()` (`scan/route.ts:161,298`). Only `score`, `band`, and `categoryScores` JSON are persisted in `Scan`.

---

## 2. Gaps & Integrity Risks

- **No Server-Side Face Detection:** Any non-blank JPEG/PNG with sufficient entropy passes `analyzeImageBytes()`, and the synthetic camera simulator in `/scan` produces a cartoon circle that can be scored if AI Gateway is off/unavailable.
- **No Liveness Enforcement:** `liveness` payload from client is never validated or required.
- **Unauthenticated Scan Read:** `GET /api/scans/[id]` (`src/app/api/scans/[id]/route.ts`) has no auth check.
- **Fairness Harness (`src/lib/rating/fairness.ts`):** `runFairnessAudit()` calls `scoreFace({ toneMode: 'STRAIGHT' })` with **no image**, hitting the static default path (`88/85/92/...`) for every cohort — it does not test actual skin-tone images.
- **Contradiction with `spikes.ts`:** `verifyAndScoreFeatureVector()` in `src/lib/spikes/spikes.ts:41-96` has completely different weights, band thresholds (`90/80/60`), and tier derivation.
