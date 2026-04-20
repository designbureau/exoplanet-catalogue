#!/usr/bin/env node
/**
 * scripts/bake-planets.mjs
 *
 * Pre-renders every catalogue system's featured planet using the real GLSL
 * shader and real OEC classification data, saving PNGs to public/planet-thumbs/.
 *
 * Usage:
 *   npm run bake                      # render all systems
 *   npm run bake -- TRAPPIST-1 Sun    # render specific slugs only
 *   npm run bake -- --force           # re-render even if PNG exists
 *
 * Prerequisites (one-time):
 *   npm install --save-dev playwright
 *   npx playwright install chromium
 */

import { readFileSync, mkdirSync, writeFileSync, existsSync } from "fs";
import { spawn } from "child_process";
import { createServer } from "net";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, "..");
const OUT_DIR   = path.join(ROOT, "public", "planet-thumbs");
const PORT      = 5174;
const BASE_URL  = `http://localhost:${PORT}`;
const SIZE      = 512;
const TIMEOUT   = 45_000; // ms per planet

// ── read slug list from catalogueSystems.ts (no ts-node needed) ──────────────

function getSlugs(filter) {
  const src = readFileSync(path.join(ROOT, "app/data/catalogueSystems.ts"), "utf8");
  const hits = [...src.matchAll(/slug:\s*["'`]([^"'`\n]+)["'`]/g)];
  const all = [...new Set(hits.map((m) => m[1].trim()))];
  return filter.length ? all.filter((s) => filter.includes(s)) : all;
}

// ── utilities ─────────────────────────────────────────────────────────────────

function isPortFree(port) {
  return new Promise((resolve) => {
    const s = createServer().once("error", () => resolve(false)).once("listening", () => {
      s.close(() => resolve(true));
    });
    s.listen(port);
  });
}

async function waitForHttp(url, ms = 40_000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (r.status < 500) return;
    } catch {}
    await sleep(600);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function dataURLtoPNG(dataURL) {
  const b64 = dataURL.replace(/^data:image\/\w+;base64,/, "");
  return Buffer.from(b64, "base64");
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args    = process.argv.slice(2);
  const force   = args.includes("--force");
  const filter  = args.filter((a) => !a.startsWith("-"));
  const slugs   = getSlugs(filter);

  if (!slugs.length) {
    console.error("No slugs found. Is app/data/catalogueSystems.ts populated?");
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });

  const pending = force ? slugs : slugs.filter(
    (s) => !existsSync(path.join(OUT_DIR, `${s}.png`))
  );

  console.log(`\n🪐  Baking ${slugs.length} system(s) — ${pending.length} pending\n`);
  if (!pending.length) {
    console.log("   All thumbs up-to-date. Pass --force to re-render.\n");
    return;
  }

  // ── check Playwright ────────────────────────────────────────────────────────
  let chromium;
  try {
    ({ chromium } = await import("playwright"));
  } catch {
    console.error(
      "❌  playwright not installed.\n" +
      "   npm install --save-dev playwright\n" +
      "   npx playwright install chromium\n"
    );
    process.exit(1);
  }

  // ── start dev server if needed ──────────────────────────────────────────────
  let devProc = null;
  if (await isPortFree(PORT)) {
    console.log(`   Starting dev server on port ${PORT}…`);
    devProc = spawn("npm", ["run", "dev", "--", "--port", String(PORT)], {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, FORCE_COLOR: "0" },
    });
    devProc.stderr.on("data", (d) => {
      // suppress most vite output; show errors
      const s = d.toString();
      if (s.includes("error") || s.includes("Error")) process.stderr.write("  [dev] " + s);
    });

    try {
      await waitForHttp(BASE_URL + "/");
      console.log(`   ✓ Dev server ready\n`);
    } catch (e) {
      devProc.kill();
      throw e;
    }
  } else {
    console.log(`   ✓ Using existing server at ${BASE_URL}\n`);
  }

  // ── launch browser ───────────────────────────────────────────────────────────
  const browser = await chromium.launch({ headless: true });
  const ctx     = await browser.newContext({ viewport: { width: 700, height: 700 } });

  let ok = 0, fail = 0;

  for (const slug of pending) {
    const url     = `${BASE_URL}/planet-bake?slug=${encodeURIComponent(slug)}&size=${SIZE}`;
    const outPath = path.join(OUT_DIR, `${slug}.png`);
    process.stdout.write(`   ${slug.padEnd(32)}`);

    const page = await ctx.newPage();
    try {
      await page.goto(url, { waitUntil: "networkidle", timeout: TIMEOUT });

      // Wait for the React useEffect to finish (sets data-ready="1" on <html>)
      await page.waitForFunction(
        () => document.documentElement.dataset.ready === "1",
        { timeout: TIMEOUT },
      );

      const imgEl = page.locator("#planet-render");
      const count = await imgEl.count();
      if (!count) throw new Error("no #planet-render element rendered");

      const src = await imgEl.getAttribute("src");
      if (!src?.startsWith("data:image/png")) {
        throw new Error(`unexpected src prefix: ${src?.slice(0, 30)}`);
      }

      const buf = dataURLtoPNG(src);
      writeFileSync(outPath, buf);
      console.log(` ✓  ${(buf.length / 1024).toFixed(0)} kB`);
      ok++;
    } catch (e) {
      console.log(` ✗  ${e.message}`);
      fail++;
    } finally {
      await page.close();
    }
  }

  await browser.close();
  if (devProc) devProc.kill();

  console.log(`\n   Done — ${ok} saved, ${fail} failed\n`);
  if (fail) process.exit(1);
}

main().catch((e) => {
  console.error("\n💥 ", e.message || e);
  process.exit(1);
});
