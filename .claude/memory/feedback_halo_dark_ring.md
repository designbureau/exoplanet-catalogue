---
name: Halo dark ring artifact — solved
description: Dark ring at halo edge caused by EffectComposer MSAA — fix is multisampling=0
type: feedback
---

The halo billboard dark ring artifact was caused by EffectComposer's 8x MSAA multisampling. MSAA resolves edge fragments between additive transparent geometry and background incorrectly, averaging alpha to create darker-than-background pixels.

**Fix:** `<EffectComposer multisampling={0}>`. Use SMAA post-processing effect as AA alternative.

**Why:** Multiple other approaches were tried and failed (custom blending, discard, alpha hacks). The root cause was always MSAA, not the shader.

**How to apply:** Never use EffectComposer multisampling with additive transparent billboards. If AA is needed, use SMAA toggle instead.
