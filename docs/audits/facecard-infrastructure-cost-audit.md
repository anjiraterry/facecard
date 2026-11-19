# Face Card Infrastructure Cost Audit

Generated from repository inspection on 19 November 2026.

## 1. Cost-Generating Operations & Mitigations

| Resource | Cost Driver | Current Safeguard | Additional Governance |
|---|---|---|---|
| **Cloud AI Vision (`gpt-4o-mini`)** | Per-scan image token inference | Previously enabled whenever `NEON_AI_GATEWAY_TOKEN` existed; broke when absent | Disabled by default (`ENABLE_CLOUD_AI=false`). On-device MediaPipe + deterministic scoring handles 100% of core scans at $0 AI cost. |
| **Neon PostgreSQL** | Row storage, compute, egress | `ScanSlot` (3/day), `AuthSession` expiry, indexed queries, zero raw selfie persistence | Keep ephemeral portrait processing; avoid storing chat logs or raw frames in DB. |
| **Neon Object Storage (`selfies`, `atelier-products`)** | Storage + egress | `CacheControl: immutable` on product images | Resize/compress client images before upload; never upload raw scan frames unless explicitly consented. |
| **Live Face-Off Video (WebRTC)** | Relay (TURN) bandwidth if P2P fails | Currently attempt-based (`FaceOffAttempt`) | Use direct P2P WebRTC with STUN first; cap video resolution/bitrate (data-saving mode for Nigerian mobile networks); fail gracefully if TURN quota is exhausted rather than incurring uncapped relay bills. |
| **Skincare Product Q&A** | LLM token cost per user question | No free-form server LLM endpoint | Offload optional deep-dive Q&A to user's own external assistant (`https://chatgpt.com/?q=...` + copy fallback) + local rules-based `LocalInsightEngine`. |
