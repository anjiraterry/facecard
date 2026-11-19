# Face Card AI Dependency Audit

Generated from repository inspection on 19 November 2026.

## 1. Current AI Touchpoints

| File | Current Usage | Provider / Runtime | Failure Mode Without Cloud Key | Migration Target |
|---|---|---|---|---|
| `src/lib/rating/engine.ts` (`callAiGatewayVision`) | Calls `${NEON_AI_GATEWAY_BASE_URL}/v1/chat/completions` (`gpt-4o-mini`) on selfie base64 | Neon AI Gateway (Databricks) | Previously threw 500/422 in `NODE_ENV=production` unless `ALLOW_SCORING_FALLBACK=true` | On-device MediaPipe landmark + feature vector scoring (`LOCAL_ML` / `LOCAL_DETERMINISTIC`); Cloud AI disabled by default (`ENABLE_CLOUD_AI !== 'true'`) |
| `src/lib/aiGateway.ts` | Generic `callNeonAIGateway()` wrapper | Neon AI Gateway | Throws if `NEON_AI_GATEWAY_TOKEN` missing | Replaced by capability-based `IntelligenceGateway` (`src/lib/intelligence/gateway.ts`) with fail-closed budget & consent checks |
| `src/lib/vision/liveness.ts` | `@mediapipe/tasks-vision` `FaceLandmarker` (with optical fallback) | Client-side WASM/GPU | Works 100% offline/zero-cost | Extended into `src/lib/vision/localIntelligence.ts` for full on-device landmark geometry, pose, blendshapes, and quality extraction |
| `src/app/skincare/page.tsx` / `src/app/atelier/page.tsx` | Product education & routine guidance | Static DB catalogue + optional AI | Works without AI | Add zero-cost `LocalInsightEngine` + External AI Assistant ("Ask ChatGPT about this product") |

## 2. Key Principle
- Core scanning, scoring, tiering, Face-Offs, Boutique, Vanity, and Atelier browsing must **never** require a cloud LLM API key or paid inference credits.
