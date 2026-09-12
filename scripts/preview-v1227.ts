// v12.27 local preview: the worker's public page served at :8123 with the
// LIVE payload proxied (structure render + real data) and local assets.
import worker from "../src/worker.ts";

const LIVE = "https://football.sportsignal.ir";
const PORT = 8123;

Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/api/public-matches") {
      const r = await fetch(LIVE + url.pathname, { headers: { "accept": "application/json" } });
      return new Response(r.body, { status: r.status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
    }
    const assetPaths = ["/logo.png", "/hero-stage.mp4", "/bg.jpg", "/favicon.ico", "/favicon.svg"];
    if (assetPaths.includes(url.pathname) || url.pathname.startsWith("/fonts/")) {
      const f = Bun.file("./assets" + url.pathname);
      if (await f.exists()) return new Response(f);
    }
    const env = { TEHRAN_TZ: "Asia/Tehran" };
    const ctx = { waitUntil() {}, passThroughOnException() {} };
    const r = await worker.fetch(new Request("http://local" + (url.pathname === "/" ? "/" : url.pathname)), env, ctx);
    return r;
  },
});
console.log("preview on http://localhost:" + PORT);
