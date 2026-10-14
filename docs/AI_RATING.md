# Face Card — AI Rating Specification

Version 0.1 · October 12, 2026 · Companion to the Face Card PRD and Backend Requirements

## 1. Purpose and the "free" rule

The AI rating turns a selfie into a **Lethality score** (0–100) with a breakdown, a verdict band, and a few tips. It is entertainment, not a measurement of attractiveness or worth.

**The rating is free, for everyone, always.**

- No paywall on the score, the breakdown, the tips, or the verdict line.
- No "unlock your full result" step and no premium rating tier.
- Cost is controlled by caps and budgets (section 13), never by hiding the result.
- Money is made elsewhere (cosmetics, practice scans, membership). See the PRD.

### Principles

1. **Entertainment, framed kindly.** Every result comes with a warm line and a way to improve.
2. **Score what the user controls.** A large share of the score is photo craft (lighting, sharpness, framing), which anyone can improve in one retake.
3. **No identity inference.** The system never infers or outputs race, ethnicity, skin lightness, age, gender, health, disability, religion, or any identity trait.
4. **No "flaw" advice.** The product never tells a user how to change their face or body.
5. **Consistent and auditable.** Same photo, same score (within 2 points). Every score records its model and prompt version.
6. **Privacy first.** The image is processed in memory and discarded. It is never stored, logged, or used for training.

## 2. What the user receives

| Output | Description |
| --- | --- |
| Lethality score | Integer 0–100 |
| Verdict band | Harmless, Suspicious, Dangerous, or Lethal |
| Verdict line | A short, pre-approved line chosen by band and tone mode |
| Breakdown | Four groups (photo craft, face, expression, aura) with the sub-scores |
| Tips | One to three tips, almost all about the photo |
| Points | Computed by the economy engine, not by the rating |

## 3. Pipeline

1. **Quality gate (code).** Measure sharpness, exposure, lighting evenness, framing, and face count. Reject with a specific, friendly reason if the photo is unusable. A rejection never uses up a scan.
2. **Model call.** The vision model scores the subjective categories and raises safety flags. It returns structured JSON only.
3. **Safety checks.** Apply flags (screen or print photo, heavy filter, covered face, possible minor, not a person).
4. **Score assembly (code).** Combine code-measured and model-scored sub-scores with the weights below. Apply the calibration curve and map to a band.
5. **Copy selection.** Choose the verdict line and tips from approved libraries.
6. **Discard the image.** Only scores and keys are saved.

## 4. Score structure

Nine sub-scores, each 0–100, combined with fixed weights that sum to 100.

| Group | Sub-score | Weight | Measured by |
| --- | --- | --- | --- |
| Photo craft (30) | Lighting | 15 | Code |
| | Sharpness | 8 | Code |
| | Framing and angle | 7 | Code |
| Face (45) | Harmony and averageness | 18 | Model |
| | Skin clarity | 12 | Model |
| | Feature definition | 10 | Model |
| | Symmetry | 5 | Model |
| Expression (15) | Expression and eye contact | 15 | Model |
| Aura (10) | Presence and styling | 10 | Model |

Raw score = sum of (sub-score × weight) ÷ 100.

**Why these weights:** research on facial attractiveness finds symmetry has the weakest effect, while averageness, skin texture, and dimorphism predict ratings better, though all of them explain less than popular claims suggest. Photo craft carries 30% so the score is fair, improvable, and not only about the face.

### Verdict bands

| Band | Lethality | Intent |
| --- | --- | --- |
| Harmless | under 40 | Warm and friendly, never an error state |
| Suspicious | 40–64 | Playful |
| Dangerous | 65–84 | Confident |
| Lethal | 85 and above | Celebratory |

### Calibration

The raw score passes through a monotonic calibration curve so results feel fair and the bands fill sensibly. Initial target distribution for beta users (to tune): Harmless about 10%, Suspicious about 30%, Dangerous about 40%, Lethal about 20%. The curve is set from the consenting calibration set (section 11), versioned, and never reshuffles ranks.

## 5. What code measures

These are deterministic, run on the server, and do not depend on the model. All thresholds are initial values to tune on the calibration set.

### Face region

Detect one face and its landmarks (client MediaPipe for hints; on the server a WebAssembly-compatible detector or the model's bounding box). Crop the face region and a ring of background around it. Downscale the crop to 256 px on the long side before measuring.

### Sharpness (weight 8)

- Metric: variance of the Laplacian on the face crop.
- Below the reject threshold: reject with `BLURRY`.
- Between reject and full-marks thresholds: linear score 0–100.
- Above the full-marks threshold: 100.

### Lighting (weight 15)

Lighting is **never absolute brightness**. Measure relative to the person's own face region, so darker skin tones are not penalized.

```text
exposureScore:
  use luminance (L*) values inside the face region only
  highlightClip = share of face pixels with L* above the clip level
  shadowCrush   = share of face pixels with L* below the crush level
  detailRange   = P95(L*) - P5(L*) inside the face region
  exposureScore = 100 minus penalties for highlightClip, shadowCrush,
                  and for detailRange below the minimum useful range

evennessScore:
  compare median L* of the left and right halves of the face
  evennessScore = 100 * (1 - min(1, |left - right| / evennessTolerance))

directionScore:
  compare face-region median L* to the background ring
  penalize strong backlight (face much darker than the ring)
  penalize harsh overhead or side shadow via vertical and horizontal gradients

lighting = 0.5 * exposureScore + 0.35 * evennessScore + 0.15 * directionScore
```

Reject with `TOO_DARK` or `TOO_BRIGHT` only when the face region has too little usable detail (very low `detailRange` or extreme clipping), not when the image is simply dim.

### Framing and angle (weight 7)

- Face height between roughly 35% and 65% of the frame height scores full marks; score falls off outside that range.
- Face centered horizontally within a tolerance.
- Head roll within about 8 degrees, yaw within about 15 degrees.
- Face fully inside the frame (else reject `FACE_CUT_OFF`).

### Rejection reasons

| Code | Meaning | User message (friendly) |
| --- | --- | --- |
| `NO_FACE` | No clear face found | "We couldn't spot your face. Try again facing the camera." |
| `MULTIPLE_FACES` | More than one face | "Just you this time, please." |
| `TOO_DARK` / `TOO_BRIGHT` | Not enough usable detail | "Move toward a window and try again." |
| `BLURRY` | Too soft | "Hold still for a sharper shot." |
| `FACE_TOO_SMALL` / `FACE_CUT_OFF` | Framing | "Move closer and keep your whole face in view." |
| `FACE_COVERED` | Sunglasses, mask, hand | "Take off sunglasses or masks for this one." |
| `SCREEN_OR_PRINT` | Photo of a screen or print | "Use the live camera, not a photo of a photo." |
| `HEAVY_FILTER` | Beauty filter or edit | "Try again without a filter." |
| `POSSIBLE_MINOR` | Person appears to be a child | "Face Card is for 18 and over." |
| `NOT_A_PERSON` | No human subject | "That doesn't look like a selfie." |

Rejections release the reserved scan and award nothing.

## 6. What the model scores

The model scores only the six subjective sub-scores and sets flags. It writes no free text about the user's face or body.

| Sub-score | Definition |
| --- | --- |
| Harmony and averageness | How balanced and typical the overall proportions look, in a pleasing way |
| Skin clarity | Evenness and clarity of skin texture under the visible lighting. Never color or lightness |
| Feature definition | How clearly the eyes, brows, cheekbones, and jawline read in the photo |
| Symmetry | Left and right balance as seen in this photo, accounting for head angle |
| Expression and eye contact | Warmth, confidence, and connection with the lens |
| Presence and styling | Overall presence and the choices the user controls: grooming, hair, outfit, accessories |

Anchors for every sub-score: **50 is a typical, well-composed selfie**; reserve scores above 90 and below 20 for clear cases; a clear photo of a face should rarely score under 25.

### System prompt

```text
You are the scoring engine for Face Card, a playful, entertainment-only selfie game
for adults. You will be shown one selfie. Return ONLY a JSON object that matches the
schema you are given. No prose, no markdown.

RULES
1. This is a game. Scores are not a measure of anyone's worth or real attractiveness.
2. Score only these six categories, each as an integer from 0 to 100:
   harmony, skinClarity, featureDefinition, symmetry, expression, presence.
   Use 50 as a typical well-composed selfie. Use the full range sparingly.
3. Never infer, estimate, or mention: race, ethnicity, skin color or lightness, age,
   gender, health, disability, religion, sexuality, nationality, or any identity.
   skinClarity concerns only how even and clear the skin texture appears under the
   lighting in this photo, never color or lightness.
4. Do not penalize hair, hairstyle, headwear (for example gele, hijab, caps, braids,
   locs), glasses, beards, or cultural styling. Presence and styling may reward
   neat, intentional choices of any kind.
5. Do not identify any real person. If the face resembles a public figure, ignore that.
6. Set flags truthfully: faceCount, faceCovered, screenOrPrint, heavyFilter,
   possibleMinor, notAPerson. If possibleMinor is true, notAPerson is true,
   or faceCount is not exactly 1, set all scores to null.
7. Do not write any free text about the person's face or body. Choose only from the
   allowed tipKeys for tips.
8. Be consistent. The same image must receive the same scores.

OUTPUT SCHEMA
{
  "flags": {
    "faceCount": number,
    "faceCovered": boolean,
    "screenOrPrint": boolean,
    "heavyFilter": boolean,
    "possibleMinor": boolean,
    "notAPerson": boolean
  },
  "faceBox": { "x": number, "y": number, "w": number, "h": number },
  "scores": {
    "harmony": number | null,
    "skinClarity": number | null,
    "featureDefinition": number | null,
    "symmetry": number | null,
    "expression": number | null,
    "presence": number | null
  },
  "tipKeys": string[]   // from the allowed list, at most 3
}
```

`faceBox` uses fractions of the image width and height, and is used by the lighting and framing code.

### Result types

```ts
type Band = 'HARMLESS' | 'SUSPICIOUS' | 'DANGEROUS' | 'LETHAL';

type ScoreResult =
  | { ok: false; reason: RejectionCode }
  | {
      ok: true;
      lethality: number;          // 0-100 integer, after calibration
      band: Band;
      groups: { photoCraft: number; face: number; expression: number; aura: number };
      subScores: {
        lighting: number; sharpness: number; framing: number;
        harmony: number; skinClarity: number; featureDefinition: number; symmetry: number;
        expression: number; presence: number;
      };
      tipKeys: TipKey[];
      modelVersion: string;
      promptVersion: string;
      calibrationVersion: string;
    };
```

Validate every model response with Zod. On malformed output, retry once; if it fails again, return a retryable error and release the scan.

## 7. Stability and fairness in face-offs

- Low temperature, fixed prompt, and structured output.
- Run the model twice. If any sub-score differs by more than 10 points, average the two; if the overall difference is above 6 points, run a third time and take the median.
- Face-offs always use the double run.
- No random jitter anywhere in the score.
- Test–retest target: the same image scored twice differs by 2 points or less.

## 8. Tips

Tips are chosen by key from an approved library, triggered by low sub-scores. They are almost all about the photo and a few about expression. There are **no tips about changing the face, skin, or body.**

| Key | Tip |
| --- | --- |
| `LIGHT_FACE_WINDOW` | Face a window for soft, even light. |
| `LIGHT_AVOID_BACKLIGHT` | Put the light in front of you, not behind. |
| `LIGHT_SOFTEN_HARSH` | Step out of harsh overhead light. |
| `CLEAN_LENS` | Wipe the camera lens for a clearer shot. |
| `HOLD_STEADY` | Hold still, or rest your elbows on something. |
| `MOVE_CLOSER` | Move a little closer so your face fills the frame. |
| `CENTER_FACE` | Center your face in the guide. |
| `LEVEL_PHONE` | Hold the phone at eye level. |
| `NEUTRAL_BACKGROUND` | A simple background helps you stand out. |
| `LOOK_AT_LENS` | Look into the lens for stronger connection. |
| `TRY_A_HALF_SMILE` | A relaxed half smile reads confident. |

Skin clarity never triggers a corrective tip. If it is low, the usual cause is lighting, so the tip is `LIGHT_FACE_WINDOW` ("soft light is kind to every skin").

## 9. Verdict lines and tone modes

Verdict lines are **pre-approved copy**, selected by band and tone mode. The model never free-writes about a user's face.

- Library size: at least 20 lines per band per tone mode, reviewed by Nigerian writers before launch.
- Selection: random, without repeating the last few lines shown to that user.
- Tone modes: Hype (default), Smooth, Roast (opt-in), Straight. See the Design System.
- Roast mode teases the **photo and lighting**, never the face or body.
- Every low-band result ends with a way to improve.
- Run all copy through a profanity and harm filter before it ships.

Sample lines:

| Band | Hype | Roast |
| --- | --- | --- |
| Harmless | "Warm-up round. Your card is just getting started." | "That lighting is doing you dirty. Find a window." |
| Dangerous | "Careful out there. This card travels with a warning." | "Not bad. Now imagine it with a window." |
| Lethal | "Face card never declines. Keep it moving." | "Okay, we see you. Don't let it go to your head." |

## 10. Safety rules

- Reject, do not score, any photo where a person appears to be a child. The product is 18+.
- Never output or store sensitive inferences (race, age estimate, gender, health, and so on).
- Never identify real people.
- No free-text face commentary from the model.
- Do not let heavy filters through; they distort the score and the fairness tests.
- Treat the image as biometric data: processed in memory, discarded, never logged, never sent to storage or analytics, never used for training.
- Use a model provider configured for zero data retention and no training on inputs. Confirm in the provider's terms before launch.

## 11. Fairness and bias testing

Fairness is a release gate, not a nice-to-have.

### Calibration and test set

- Faces from **consenting adult volunteers**, collected and stored separately from user data, deletable on request.
- Start with about 300 images for beta and grow toward 1,000 or more.
- Cover a wide range of skin tones (for example the 10-point Monk Skin Tone scale), genders, ages 18 and over, hairstyles and headwear (gele, hijab, caps, braids, locs, afros), glasses, beards, phone models, and lighting conditions (bright, indoor, low-light, backlit).
- Include the same faces under good and poor lighting, to test the lighting logic directly.

### Release gates (initial targets, to tune)

| Test | Target |
| --- | --- |
| Mean Lethality gap between any two skin-tone groups, at matched photo quality | 3 points or less |
| Quality-gate rejection rate gap between skin-tone groups | 3 percentage points or less |
| Lighting score drop when the same face is relit from good to dim, darker vs lighter skin | No meaningful difference |
| Gap between hairstyle and headwear groups | 3 points or less |
| Test–retest (same image twice) | 2 points or less |
| Distribution after calibration | Within a few points of the target band shares |

Run the suite on every model, prompt, threshold, or calibration change. A change that widens a gap does not ship.

### Ongoing monitoring

- Track score and rejection distributions by device type and time of day (never by inferred identity).
- Offer a "this didn't feel right" button after each result; review reports for patterns.
- Record `modelVersion`, `promptVersion`, and `calibrationVersion` on every scan so scores can be audited and re-baselined.

## 12. Interface

```ts
scoreFace(input: {
  image: Uint8Array;          // JPEG or PNG, at most 2 MB, already downscaled by the client
  userContext: { userId: string; toneMode: 'HYPE' | 'SMOOTH' | 'ROAST' | 'STRAIGHT' };
}): Promise<ScoreResult>
```

- The function is provider-agnostic. The model provider sits behind one adapter.
- Requirements for any provider: vision input, structured JSON output, zero data retention, no training on inputs, and acceptable latency (aim for a p95 under 8 seconds for the full scan).
- On Cloudflare Workers, the image analysis in code must use WebAssembly codecs, and the model call is an HTTP request.

## 13. Cost control (how the rating stays free)

- Daily scan cap of 3 point-earning scans per account, plus the face-off limits.
- Client downscales to about 1024 px and compresses before upload.
- A small, cheap pre-check (the code-based quality gate) runs before any model call, so bad photos cost nothing.
- Rejected photos never reach the model unless they need the model's face box.
- A global daily budget circuit breaker pauses scans with a friendly message instead of hiding results behind a paywall.
- Track cost per scan and per active user weekly. Review the model tier if cost per scan rises.
- Fund the free rating from cosmetics, practice scans, and membership (see the PRD), not from the score.

## 14. Test plan and acceptance criteria

| Area | Acceptance |
| --- | --- |
| Determinism | Same image twice differs by 2 points or less |
| Schema | 100% of model responses pass Zod validation after one retry |
| Quality gate | Rejections match the table in section 5; no rejections for dim-but-usable photos of darker skin |
| Safety | Child, screen, filter, covered-face, and non-person test images are rejected |
| Fairness | All gates in section 11 pass |
| Copy | Every band, tone, and tip is reviewed; no copy about changing the face or body |
| Privacy | No image bytes in logs, error reports, storage, or analytics (verify with scrubbing tests) |
| Free rule | No code path hides any part of the rating from any user |

## 15. Open questions

- Which vision model provider and prompt set gives the most stable scores, and do its retention terms meet NDPA needs?
- Final thresholds for sharpness, exposure, and framing, from the calibration set.
- How to handle `possibleMinor` fairly, given age estimation is imperfect (a reviewed appeal path, or a stricter 18+ confirmation).
- Whether the shop item "full stat breakdown unlock" in the PRD should be removed, since the breakdown is now free.
- Whether to show sub-scores as numbers or as simple bars for the beta.
