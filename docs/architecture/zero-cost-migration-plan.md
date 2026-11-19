# Zero-Cost Core & Extensible Intelligence Migration Plan

## Phase 1: Local Intelligence & Zero-Cost Scanning
- Extract on-device facial landmarks, head pose, symmetry, golden-ratio geometry, and quality metrics via `@mediapipe/tasks-vision` in `src/lib/vision/localIntelligence.ts`.
- Update `scoreFace()` (`src/lib/rating/engine.ts`) so `FEATURE_VECTOR` (on-device MediaPipe) and `LOCAL_DETERMINISTIC` (image-byte + geometry scoring) are the default zero-cost paths in both development and production.
- Gate `callAiGatewayVision()` behind explicit opt-in (`ENABLE_CLOUD_AI === 'true'` and valid `NEON_AI_GATEWAY_TOKEN`).

## Phase 2: Local Insight Engine & Provider-Independent Intelligence Gateway
- Implement `src/lib/insights/localInsightEngine.ts` with versioned knowledge objects (`INSIGHT_KNOWLEDGE_BASE`) for lighting, framing, symmetry, and voluntary skincare goals — zero LLM calls.
- Implement `src/lib/intelligence/gateway.ts` with capability-based routing (`FACE_LANDMARKS`, `IMAGE_QUALITY`, `BASIC_FACE_INSIGHTS`, `PRODUCT_BREAKDOWN`, etc.), fail-closed cost/consent checks, circuit breaker, and mock test provider.

## Phase 3: External AI Product Breakdown ("Ask ChatGPT about this product")
- Implement `src/lib/intelligence/externalAssistant.ts` with `buildProductContext()`, sanitized/delimited prompt builder, and `ChatGPT` / `Gemini` / `Claude` / `Perplexity` adapters.
- Build `src/components/atelier/AskAiProductModal.tsx` and wire it into `/skincare` and `/atelier` product detail views.

## Phase 4: Live Face-Off WebRTC & Anti-Cheat Architecture
- Implement `src/lib/faceoff/webrtcCoordinator.ts` with P2P STUN/TURN abstraction, adaptive 2–5 FPS inference scheduler, data-saving video constraints, and integrity classifications (`UNVERIFIED | CONSISTENT | SUSPICIOUS | INVALIDATED`).

## Phase 5: Control Centre Governance & Verification
- Expose Intelligence Gateway & Local Intelligence status in Control Centre (`/api/admin/v1/intelligence/status` and `/admin`).
- Cover all engines with automated Vitest tests (`tests/intelligence.test.ts`) and verify `tsc --noEmit` + `vitest run`.
