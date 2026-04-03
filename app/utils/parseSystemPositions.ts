import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

export interface SystemPosition {
  name: string;
  filename: string;
  x: number;
  y: number;
  z: number;
  distance: number; // parsecs
  planetCount: number;
}

let cachedPositions: SystemPosition[] | null = null;

export async function getSystemPositions(): Promise<SystemPosition[]> {
  if (cachedPositions) return cachedPositions;

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve("data-json/systems-index.json"),
    path.resolve(__dirname, "..", "..", "data-json/systems-index.json"),
    path.resolve(__dirname, "..", "data-json/systems-index.json"),
  ];

  for (const indexPath of candidates) {
    try {
      const raw = fs.readFileSync(indexPath, "utf8");
      cachedPositions = JSON.parse(raw) as SystemPosition[];
      return cachedPositions;
    } catch {
      continue;
    }
  }

  console.error("Could not find systems-index.json in any candidate path");
  return [];
}
