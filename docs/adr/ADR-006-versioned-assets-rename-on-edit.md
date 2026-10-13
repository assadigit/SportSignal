# ADR-006: Versioned assets, rename-on-edit

- **Status:** Accepted (since v12.x; reaffirmed every asset release)
- **Context:** `assets/core-13.9.js`, `assets/public-13.23.css/js` are
  served immutable with `Cache-Control: max-age=31536000` pins in
  `_headers`. An in-place edit would leave clients on stale caches for up
  to a year.
- **Decision:** Client-referenced assets carry a version in the FILENAME.
  Any edit bumps the name and every reference (page templates, harness
  assertions — check-stats pins core-13.9.js, check-venue scans the LIVE
  minified artifact) in the same commit. `sw.js` `CACHE` bumps ONLY when
  a client-referenced asset changed; server-side src changes never bump it.
- **Consequences:** Deploys are atomic: old caches keep serving the old
  (working) asset, new HTML references the new name. Dead versions are
  pruned (v13.29, v13.72) once grep-proven unreferenced. The cost: any
  asset work touches the harness pins — grep `scripts/` for the old name
  BEFORE deleting.
