/**
 * capture-paper-figures.mjs — renders the figures used by the About papers.
 *
 * Captures, into public/paper-figures/:
 *   star-map.png       — the /galaxy point cloud
 *   system-viewer.png  — /system/TRAPPIST-1 with live orbits
 *   eyeball-world.png  — TRAPPIST-1 f via the bake route at 1024px
 *   planet-plate.png   — labelled grid of eight baked planet types
 *
 * Requires a dev server (BASE_URL, default http://localhost:5173) and
 * `npx playwright install chromium`.
 *
 * Usage: node scripts/capture-paper-figures.mjs [figure...]
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:5173";
const OUT_DIR = "public/paper-figures";
const only = process.argv.slice(2);
const want = (name) => only.length === 0 || only.includes(name);

// Labels follow the classification pipeline's assignment for each featured
// planet (what the shader actually rendered), not the card blurbs.
const PLATE = [
  { file: "TRAPPIST-1.png", label: "TRAPPIST-1 f · ice-ocean eyeball" },
  { file: "Sun.png", label: "Earth · temperate" },
  { file: "Kepler-442.png", label: "Kepler-442 b · temperate super-Earth" },
  { file: "51 Peg.png", label: "51 Pegasi b · hot Jupiter (Class IV)" },
  { file: "PSR 1257+12.png", label: "PSR 1257+12 · frozen pulsar planet" },
  { file: "Kepler-16.png", label: "Kepler-16 b · cool giant (Class II)" },
  { file: "55 Cancri.png", label: "55 Cancri e · lava eyeball" },
  { file: "WASP-12.png", label: "WASP-12 b · hot Jupiter (Class V)" },
];

const HIDE_CHROME_CSS = `
  nav, a, button, select, aside { display: none !important; }
  [data-paper-figure-hide] { display: none !important; }
`;

async function main() {
  const { chromium } = await import("playwright");
  mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    channel: "chrome", // system Chrome; the bundled chromium download stalls on this network
    args: ["--use-angle=metal", "--enable-webgl", "--ignore-gpu-blocklist"],
  });

  const page = await browser.newPage({
    viewport: { width: 1600, height: 1000 },
    deviceScaleFactor: 1,
  });

  if (want("star-map")) {
    console.log("capturing star-map…");
    await page.goto(`${BASE_URL}/galaxy`, { waitUntil: "networkidle" });
    await page.waitForTimeout(7000); // points + grid settle
    await page.addStyleTag({ content: HIDE_CHROME_CSS });
    await page.screenshot({ path: join(OUT_DIR, "star-map.png") });
  }

  if (want("system-viewer")) {
    console.log("capturing system-viewer…");
    await page.goto(`${BASE_URL}/system/TRAPPIST-1`, { waitUntil: "networkidle" });
    await page.waitForTimeout(12000); // shaders, skybox, nebula
    // Default camera sits close to the star, in the orbital plane; dolly out
    // and tilt above the plane so the orbits read as rings.
    await page.mouse.move(800, 500);
    const WHEELS = parseInt(process.env.WHEELS ?? "3");
    const WHEEL_DELTA = parseInt(process.env.WHEEL_DELTA ?? "750");
    for (let i = 0; i < WHEELS; i++) {
      await page.mouse.wheel(0, WHEEL_DELTA);
      await page.waitForTimeout(150);
    }
    const DRAG = parseInt(process.env.DRAG ?? "220");
    await page.mouse.down();
    await page.mouse.move(800, 500 - DRAG, { steps: 24 });
    await page.mouse.up();
    await page.waitForTimeout(2500); // damping settles
    await page.addStyleTag({ content: HIDE_CHROME_CSS });
    await page.screenshot({ path: join(OUT_DIR, "system-viewer.png") });
  }

  if (want("habitable-zone")) {
    console.log("capturing habitable-zone…");
    await page.goto(`${BASE_URL}/system/TRAPPIST-1`, { waitUntil: "networkidle" });
    await page.waitForTimeout(12000);
    // Toggle the habitable-zone annulus on from the toolbar, then frame as
    // for the system-viewer figure.
    await page.getByRole("button", { name: /habitable zone/i }).click();
    await page.waitForTimeout(500);
    await page.mouse.move(800, 500);
    await page.mouse.wheel(0, parseInt(process.env.WHEEL_DELTA ?? "400"));
    await page.waitForTimeout(500);
    await page.mouse.down();
    await page.mouse.move(800, 500 - parseInt(process.env.DRAG ?? "220"), { steps: 24 });
    await page.mouse.up();
    await page.waitForTimeout(2500);
    await page.addStyleTag({ content: HIDE_CHROME_CSS });
    await page.screenshot({ path: join(OUT_DIR, "habitable-zone.png") });
  }

  if (want("eyeball-world")) {
    console.log("capturing eyeball-world…");
    const p2 = await browser.newPage({
      viewport: { width: 1024, height: 1024 },
      deviceScaleFactor: 1,
    });
    await p2.goto(`${BASE_URL}/planet-bake?slug=TRAPPIST-1&size=1024`, {
      waitUntil: "networkidle",
    });
    // The bake route renders offscreen and exposes a data-URL <img>; grab it
    // directly (same pattern as scripts/bake-planets.mjs).
    await p2.waitForFunction(() => document.documentElement.dataset.ready === "1", {
      timeout: 60_000,
    });
    const src = await p2.locator("#planet-render").getAttribute("src");
    if (!src?.startsWith("data:image/png")) throw new Error("no baked render");
    writeFileSync(join(OUT_DIR, "eyeball-world.png"), Buffer.from(src.split(",")[1], "base64"));
    await p2.close();
  }

  if (want("planet-plate")) {
    console.log("capturing planet-plate…");
    const cells = PLATE.map(
      ({ file, label }) => `
        <figure>
          <img src="${BASE_URL}/planet-thumbs/${encodeURI(file)}" width="300" height="300" />
          <figcaption>${label}</figcaption>
        </figure>`,
    ).join("\n");
    const html = `<!doctype html><html><head><style>
      body { margin: 0; background: #000; }
      main { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px 24px; padding: 36px; width: 1528px; box-sizing: border-box; }
      figure { margin: 0; text-align: center; }
      img { width: 300px; height: 300px; display: block; }
      figcaption { font: 12px/1.4 "JetBrains Mono", ui-monospace, monospace; color: #9aa0a8; letter-spacing: 0.06em; text-transform: uppercase; padding: 2px 0 14px; }
    </style></head><body><main>${cells}</main></body></html>`;
    const p3 = await browser.newPage({
      viewport: { width: 1600, height: 800 },
      deviceScaleFactor: 1,
    });
    await p3.setContent(html, { waitUntil: "networkidle" });
    await p3.waitForTimeout(1500);
    const mainEl = p3.locator("main");
    await mainEl.screenshot({ path: join(OUT_DIR, "planet-plate.png") });
    await p3.close();
  }

  await browser.close();
  console.log(`done → ${OUT_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
