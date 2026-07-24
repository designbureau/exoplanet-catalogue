/**
 * Pre-parse all XML system files into JSON at build time.
 * Outputs:
 *   data-json/systems-index.json — galaxy view positions array
 *   data-json/<name>.json        — per-system parsed JSON files
 *
 * Run: node scripts/prebuild-data.js
 */

import fs from "fs";
import path from "path";
import { parseStringPromise } from "xml2js";

const XML_DIR = path.resolve("app/data/open_exoplanet_catalogue/systems");
const JSON_DIR = path.resolve("data-json");
const INDEX_FILE = path.resolve("data-json/systems-index.json");

// RA/Dec parsing from parseSystemPositions.ts
function parseRA(ra) {
  const parts = ra.trim().split(/\s+/);
  const hours = parseFloat(parts[0]);
  const minutes = parseFloat(parts[1] || "0");
  const seconds = parseFloat(parts[2] || "0");
  const degrees = (hours + minutes / 60 + seconds / 3600) * 15;
  return (degrees * Math.PI) / 180;
}

function parseDec(dec) {
  const trimmed = dec.trim();
  const sign = trimmed.startsWith("-") ? -1 : 1;
  const parts = trimmed.replace(/^[+-]/, "").split(/\s+/);
  const degrees = parseFloat(parts[0]);
  const minutes = parseFloat(parts[1] || "0");
  const seconds = parseFloat(parts[2] || "0");
  const decimalDeg = sign * (degrees + minutes / 60 + seconds / 3600);
  return (decimalDeg * Math.PI) / 180;
}

function extractTag(xml, tag) {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`));
  return match ? match[1] : null;
}

function countTag(xml, tag) {
  const matches = xml.match(new RegExp(`<${tag}[\\s>]`, "g"));
  return matches ? matches.length : 0;
}

// Fallback spectral-type → temperature (K) table, matching
// app/utils/helperFunctions.tsx's spectralTypeTemperatures, for systems whose
// primary star records a spectral type but no direct temperature.
const SPECTRAL_TEMP = { O: 40000, B: 20000, A: 8000, F: 6500, G: 5500, K: 4500, M: 3000 };

// The primary star's own XML content, with any nested <planet> blocks
// stripped out. OEC records both a star's effective temperature and a
// planet's equilibrium temperature under the same <temperature> tag name,
// and a star's own scalar fields can appear *after* its nested planets in
// the schema (e.g. HD 104067: the planet's 363 K equilibrium temperature
// precedes the star's own 4969 K, textually, inside the same <star>...
// </star> block). A whole-document first-match search for <temperature>
// therefore silently returns the wrong value for any system whose planet
// happens to record one before its star does — 329 of 4,081 systems in
// this catalogue, including 51 Pegasi. Stripping nested <planet> blocks
// before searching fixes this at the source.
function extractPrimaryStarBlock(xml) {
  const match = xml.match(/<star>([\s\S]*?)<\/star>/);
  if (!match) return null;
  return match[1].replace(/<planet>[\s\S]*?<\/planet>/g, "");
}

// Primary star's effective temperature (K), for colouring the star map by
// stellar class. Scoped to the primary star's own block (see
// extractPrimaryStarBlock) — the same first-match convention the rest of
// this script uses for name/ra/dec picks out the primary star itself.
function extractStarTemp(xml) {
  const starBlock = extractPrimaryStarBlock(xml);
  if (!starBlock) return null;
  const direct = extractTag(starBlock, "temperature");
  if (direct) {
    const t = parseFloat(direct);
    if (!isNaN(t) && t > 0) return t;
  }
  const spec = extractTag(starBlock, "spectraltype");
  if (spec) {
    const letter = spec.trim().toUpperCase()[0];
    if (SPECTRAL_TEMP[letter]) return SPECTRAL_TEMP[letter];
  }
  return null;
}

async function main() {
  console.log("Pre-building system data...");

  // Ensure output directory exists
  if (!fs.existsSync(JSON_DIR)) {
    fs.mkdirSync(JSON_DIR, { recursive: true });
  }

  const files = fs.readdirSync(XML_DIR).filter((f) => f.endsWith(".xml"));
  console.log(`Found ${files.length} XML files`);

  const index = [];
  let parsed = 0;
  let skipped = 0;

  for (const file of files) {
    const xmlPath = path.join(XML_DIR, file);
    const xml = fs.readFileSync(xmlPath, "utf8");
    const basename = file.replace(".xml", "");

    // Parse full XML → JSON for system view
    try {
      const jsonData = await parseStringPromise(xml, {
        explicitArray: true,
        ignoreAttrs: true,
      });
      fs.writeFileSync(
        path.join(JSON_DIR, `${basename}.json`),
        JSON.stringify(jsonData)
      );
      parsed++;
    } catch (err) {
      console.warn(`  Skipping ${file}: parse error`);
      skipped++;
      continue;
    }

    // Extract position data for galaxy index
    const ra = extractTag(xml, "rightascension");
    const dec = extractTag(xml, "declination");
    const dist = extractTag(xml, "distance");
    const name = extractTag(xml, "name");

    if (!ra || !dec || !dist) continue;

    const distance = parseFloat(dist);
    if (isNaN(distance) || distance <= 0) continue;

    const raRad = parseRA(ra);
    const decRad = parseDec(dec);

    const x = distance * Math.cos(decRad) * Math.cos(raRad);
    const y = distance * Math.cos(decRad) * Math.sin(raRad);
    const z = distance * Math.sin(decRad);

    const planetCount = countTag(xml, "planet");
    const starTemp = extractStarTemp(xml);

    index.push({
      name: name || basename,
      filename: basename,
      x, y, z,
      distance,
      planetCount,
      ...(starTemp ? { starTemp } : {}),
    });
  }

  // Write galaxy index
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index));

  console.log(`Done: ${parsed} parsed, ${skipped} skipped, ${index.length} indexed`);
  console.log(`  Index: ${INDEX_FILE} (${(fs.statSync(INDEX_FILE).size / 1024).toFixed(0)} KB)`);
  console.log(`  Systems: ${JSON_DIR}/ (${parsed} files)`);
}

main().catch(console.error);
