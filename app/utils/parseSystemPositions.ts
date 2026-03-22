import fs from "fs";
import path from "path";

export interface SystemPosition {
  name: string;
  filename: string;
  x: number;
  y: number;
  z: number;
  distance: number; // parsecs
  planetCount: number;
}

// Parse sexagesimal RA (HH MM SS.ss) to radians
function parseRA(ra: string): number {
  const parts = ra.trim().split(/\s+/);
  const hours = parseFloat(parts[0]);
  const minutes = parseFloat(parts[1] || "0");
  const seconds = parseFloat(parts[2] || "0");
  const degrees = (hours + minutes / 60 + seconds / 3600) * 15;
  return (degrees * Math.PI) / 180;
}

// Parse sexagesimal Dec (±DD MM SS.ss) to radians
function parseDec(dec: string): number {
  const trimmed = dec.trim();
  const sign = trimmed.startsWith("-") ? -1 : 1;
  const parts = trimmed.replace(/^[+-]/, "").split(/\s+/);
  const degrees = parseFloat(parts[0]);
  const minutes = parseFloat(parts[1] || "0");
  const seconds = parseFloat(parts[2] || "0");
  const decimalDeg = sign * (degrees + minutes / 60 + seconds / 3600);
  return (decimalDeg * Math.PI) / 180;
}

// Extract a simple XML tag value using regex (fast, avoids full XML parse)
function extractTag(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}[^>]*>([^<]+)</${tag}>`));
  return match ? match[1] : null;
}

// Count occurrences of a tag
function countTag(xml: string, tag: string): number {
  const matches = xml.match(new RegExp(`<${tag}[\\s>]`, "g"));
  return matches ? matches.length : 0;
}

let cachedPositions: SystemPosition[] | null = null;

export async function getSystemPositions(): Promise<SystemPosition[]> {
  if (cachedPositions) return cachedPositions;

  const dir = path.resolve("app/data/open_exoplanet_catalogue/systems");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".xml"));

  const positions: SystemPosition[] = [];

  for (const file of files) {
    const xml = fs.readFileSync(path.join(dir, file), "utf8");

    const ra = extractTag(xml, "rightascension");
    const dec = extractTag(xml, "declination");
    const dist = extractTag(xml, "distance");
    const name = extractTag(xml, "name");

    if (!ra || !dec || !dist) continue;

    const distance = parseFloat(dist);
    if (isNaN(distance) || distance <= 0) continue;

    const raRad = parseRA(ra);
    const decRad = parseDec(dec);

    // Convert spherical (RA/Dec/Distance) to Cartesian
    const x = distance * Math.cos(decRad) * Math.cos(raRad);
    const y = distance * Math.cos(decRad) * Math.sin(raRad);
    const z = distance * Math.sin(decRad);

    const planetCount = countTag(xml, "planet");

    positions.push({
      name: name || file.replace(".xml", ""),
      filename: file.replace(".xml", ""),
      x,
      y,
      z,
      distance,
      planetCount,
    });
  }

  cachedPositions = positions;
  return positions;
}
