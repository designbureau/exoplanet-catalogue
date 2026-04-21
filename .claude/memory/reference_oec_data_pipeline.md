---
name: OEC Data Pipeline and NASA Integration
description: How exoplanet data flows from NASA through OEC into the project, and the role of oec_continuity
type: reference
originSessionId: b497df1c-e498-45a9-830d-52fe0fe92e70
---
**Data flow:** NASA Exoplanet Archive → `oec_continuity` (automated Python pipeline) → main OEC catalogue → our GitHub Action (weekly rsync) → `app/data/open_exoplanet_catalogue/systems/` (4,081 XML files as of 2026-04-03).

**oec_continuity** (https://github.com/OpenExoplanetCatalogue/oec_continuity): Upstream pipeline that generates OEC XML from NASA data. Runs nightly. We don't integrate directly — our weekly sync pulls from the main OEC repo which includes these imports.

**Gap:** NASA has ~5,800+ confirmed planets across ~4,300+ systems. OEC has ~4,081 systems. The difference is systems not yet merged upstream.

**GitHub Action:** `.github/workflows/update-catalogue.yml` — weekly Monday 06:00 UTC, clones OEC, rsyncs `systems/` directory, auto-commits if changed.
