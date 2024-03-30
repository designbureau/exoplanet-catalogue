import fs from "fs";
import { parseStringPromise } from "xml2js";

// Async function to read an XML file and convert it to JSON
export async function loadXMLAsJSON(filePath: string) {
  try {
    // Read the XML file content
    const xmlData = fs.readFileSync(filePath, "utf8");

    // Convert XML to JSON
    const result = await parseStringPromise(xmlData, {
      explicitArray: false,
      ignoreAttrs: true,
    });

    // Return the JSON data
    return result;
  } catch (error) {
    console.error("Error loading or parsing XML file:", error);
    throw new Error("Failed to load or parse XML file");
  }
}
