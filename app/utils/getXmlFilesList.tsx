import fs from "fs/promises";
import path from "path";

export async function getXmlFilesList() {
  // Adjust the path as necessary. This assumes the server's working directory is the project root.
  const directoryPath = path.resolve(
    "app/data/open_exoplanet_catalogue/systems"
  );

  try {
    const files = await fs.readdir(directoryPath);
    return files.filter((file) => file.endsWith(".xml"));
  } catch (error) {
    console.error("Failed to read the XML directory:", error);
    return []; // Return an empty array or handle the error as needed
  }
}
