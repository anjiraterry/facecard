# Lethality Engine Calibration & Evaluation Report

Generated 19 November 2026.

## 1. Scoring Model & Version
- **Active Engine:** `LethalityEngine` (`v2.0-presentation`, `src/lib/rating/lethalityEngine.ts`)
- **Controllable Presentation Weights (sum = 1.00):**
  - `visual_presentation`: `0.30`
  - `pose_composition`: `0.25`
  - `expression_engagement`: `0.20`
  - `lighting_balance`: `0.15`
  - `image_detail`: `0.10`

## 2. Fairness & Skin-Tone Neutrality
- **No colourism / brightness bias:** Skin brightness, lightness, and complexion are excluded from both `LethalityEngine` and `SkinAppearanceEngine`.
- **Immutable geometry separation:** `FacialGeometryEngine` and `SymmetryEngine` produce descriptive observations only; `lethalityInputsFromPresentation()` explicitly excludes immutable facial proportions from the 1–100 score.
- **Unavailable vs fabricated results:** When `ScanQualityEngine` detects missing faces, multiple faces, excessive yaw/pitch, or insufficient exposure/sharpness, affected observations return `availability: 'UNAVAILABLE'` instead of manufacturing values.

## 3. Repeatability & Anti-Inflation Guardrails
- `computeLethalityScore()` is 100% deterministic: identical inputs produce identical scores (`tests/intelligence.test.ts`).
- `validateLethalityWeights()` rejects unknown weights (preventing facial-feature or skin-colour weights from being published via Control Centre) and enforces weight sum `= 1.0`.
- `validateRewardPolicy()` locks `dailyFreeScans = 3` and enforces `extraSnapCostPts > extraSnapMaxReward` (`150 > 75`) so Extra Snaps cannot be farmed for net points.
