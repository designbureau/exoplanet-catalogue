/**
 * /planet-bake?slug=TRAPPIST-1&size=512
 *
 * Build-time-only render route. The Playwright bake script navigates here for
 * each catalogue system, waits for data-ready="1" on <html>, extracts the data
 * URL from #planet-render, and saves it as a PNG to public/planet-thumbs/.
 *
 * Not linked from any page — safe to keep in production (just returns a blank
 * white page if slug param is missing).
 */

import { useLoaderData } from "react-router";
import { useEffect, useState } from "react";
import path from "path";
import { loadXMLAsJSON } from "~/utils/loadXMLAsJSON";
import { catalogueSystems } from "~/data/catalogueSystems";
import { classifyPlanet } from "~/utils/planetClassification";
import { renderOffscreenFromParams } from "~/utils/planetSnapshot";
import { getMass, getRadius } from "~/utils/helperFunctions";

// ─── XML helpers ─────────────────────────────────────────────────────────────

function parseVal(v: any): number {
  if (v == null) return 0;
  if (Array.isArray(v)) v = v[0];
  if (typeof v === "object") v = v._ ?? v["$t"] ?? v;
  return parseFloat(v) || 0;
}

/** Recursively collect all { planet, star } pairs from xml2js-parsed system. */
function collectPlanets(node: any, parentStar: any = null): Array<{ planet: any; star: any }> {
  const out: Array<{ planet: any; star: any }> = [];

  // Planets directly under a star node
  for (const star of node.star ?? []) {
    for (const planet of star.planet ?? []) {
      out.push({ planet, star });
    }
    for (const b of star.binary ?? []) {
      out.push(...collectPlanets(b, star));
    }
  }

  // Planets directly under a binary node (circumbinary — e.g. Kepler-16 (AB) b)
  for (const b of node.binary ?? []) {
    // Use first star of the binary as proxy for stellar params
    const proxyStar = b.star?.[0] ?? parentStar ?? {};
    for (const planet of b.planet ?? []) {
      out.push({ planet, star: proxyStar });
    }
    out.push(...collectPlanets(b, proxyStar));
  }

  return out;
}

function nameOf(node: any): string {
  const n = node.name;
  if (!n) return "";
  const first = Array.isArray(n) ? n[0] : n;
  return typeof first === "string" ? first.trim() : String(first).trim();
}

/** Normalise planet name for fuzzy match (remove spaces, dashes, lower) */
function normName(s: string) {
  return s.toLowerCase().replace(/[\s\-_]/g, "");
}

// ─── loader ──────────────────────────────────────────────────────────────────

export const loader = async ({ request }: { request: Request }) => {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug") ?? "";
  const size = Math.min(1024, Math.max(64, parseInt(url.searchParams.get("size") ?? "512")));

  const system = catalogueSystems.find((s) => s.slug === slug);
  if (!system) return { error: "unknown slug", slug, size, pairs: [], featuredName: "" };

  const xmlPath = path.resolve(
    `app/data/open_exoplanet_catalogue/systems/${system.filename}.xml`,
  );

  let pairs: Array<{ planet: any; star: any }> = [];
  try {
    const xmlData = await loadXMLAsJSON(xmlPath);
    const systemNode = xmlData?.system ?? xmlData;
    pairs = collectPlanets(systemNode, null);
  } catch (e) {
    console.warn("planet-bake: failed to load XML for", slug, e);
  }

  return {
    error: null,
    slug,
    size,
    featuredName: system.featured.name,
    // Serialise pairs to plain JSON (no class instances)
    pairs: pairs.map(({ planet, star }) => ({
      planet: JSON.parse(JSON.stringify(planet)),
      star: JSON.parse(JSON.stringify(star)),
    })),
  };
};

// ─── client component ────────────────────────────────────────────────────────

export default function PlanetBake() {
  const { error, slug, size, featuredName, pairs } = useLoaderData<typeof loader>();
  const [dataURL, setDataURL] = useState<string | null>(null);
  const [status, setStatus] = useState("loading…");

  useEffect(() => {
    if (error || !pairs?.length) {
      setStatus(`error: ${error ?? "no pairs"}`);
      document.documentElement.dataset.ready = "1";
      return;
    }

    // Find the featured planet
    const normTarget = normName(featuredName);
    let match = pairs.find(({ planet }) =>
      normName(nameOf(planet)) === normTarget,
    );
    // Fallback: partial prefix match (e.g. "TRAPPIST-1f" matches "TRAPPIST-1 f")
    if (!match) {
      match = pairs.find(({ planet }) => {
        const pn = normName(nameOf(planet));
        return pn.startsWith(normTarget) || normTarget.startsWith(pn);
      });
    }
    // Last resort: use first planet
    if (!match) match = pairs[0];

    const { planet, star } = match!;

    // Extract classification inputs
    const massJupiter = getMass({ data: planet });
    const radiusJupiter = getRadius({ data: planet });
    const semimajorAxisAU = parseVal(planet.semimajoraxis);
    const eccentricity = parseVal(planet.eccentricity);
    const starTemp = parseVal(star.temperature) || 5500;
    const starMass = parseVal(star.mass) || 1;
    const starRadius = parseVal(star.radius) || 1;
    const planetName = nameOf(planet) || slug;

    setStatus(`classifying ${planetName} (T★=${starTemp}K, SMA=${semimajorAxisAU.toFixed(3)}AU)`);

    const params = classifyPlanet({
      massJupiter,
      radiusJupiter,
      semimajorAxisAU: semimajorAxisAU || 1,
      starTemp,
      starMass,
      starRadius,
      name: planetName,
      eccentricity,
    });

    try {
      const url = renderOffscreenFromParams(params, size);
      setDataURL(url);
      setStatus(`done — ${params.type}`);
    } catch (e) {
      setStatus(`render error: ${e}`);
    }

    document.documentElement.dataset.ready = "1";
  }, []);

  return (
    <div
      style={{
        background: "#000",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        fontFamily: "monospace",
        color: "#aaa",
        fontSize: 13,
      }}
    >
      <p>{status}</p>
      {dataURL && (
        <img
          id="planet-render"
          src={dataURL}
          alt={slug}
          width={size}
          height={size}
          data-slug={slug}
          style={{ borderRadius: "50%", display: "block" }}
        />
      )}
    </div>
  );
}
