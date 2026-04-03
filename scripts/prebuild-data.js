/**
 * Pre-parse all XML system files into JSON at build time.
 * Outputs:
 *   app/data/systems-index.json  — galaxy view positions array
 *   app/data/systems-json/       — per-system parsed JSON files
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

    index.push({
      name: name || basename,
      filename: basename,
      x, y, z,
      distance,
      planetCount,
    });
  }

  // Write galaxy index
  fs.writeFileSync(INDEX_FILE, JSON.stringify(index));

  console.log(`Done: ${parsed} parsed, ${skipped} skipped, ${index.length} indexed`);
  console.log(`  Index: ${INDEX_FILE} (${(fs.statSync(INDEX_FILE).size / 1024).toFixed(0)} KB)`);
  console.log(`  Systems: ${JSON_DIR}/ (${parsed} files)`);
}

main().catch(console.error);
