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

let cachedPositions: SystemPosition[] | null = null;

export async function getSystemPositions(): Promise<SystemPosition[]> {
  if (cachedPositions) return cachedPositions;

  const indexPath = path.resolve("data-json/systems-index.json");
  const raw = fs.readFileSync(indexPath, "utf8");
  cachedPositions = JSON.parse(raw) as SystemPosition[];
  return cachedPositions;
}
