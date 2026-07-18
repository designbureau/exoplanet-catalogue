// The About section's three papers. The markdown files in docs/ are the
// single source of truth — imported raw at build time so the site and the
// repo can never drift apart.
import cataloguePaper from "../../docs/catalogue-paper.md?raw";
import renderingPaper from "../../docs/rendering-paper.md?raw";
import visualizationPaper from "../../docs/visualization-paper.md?raw";

export interface Paper {
  slug: string;
  /** Reading-list ordinal, e.g. "01" */
  number: string;
  title: string;
  subtitle: string;
  /** The paper's register line, e.g. "System description." */
  register: string;
  date: string;
  /** One-paragraph teaser for the About landing page. */
  teaser: string;
  markdown: string;
}

export const papers: Paper[] = [
  {
    slug: "catalogue",
    number: "01",
    title: "A Catalogue of Alien Worlds",
    subtitle:
      "A procedural-visualisation interface to the Open Exoplanet Catalogue",
    register: "System description",
    date: "July 2026",
    teaser:
      "The system paper: how 4,081 catalogued systems become explorable places. The XML-to-JSON pipeline, the Keplerian viewer, the star map, and the engineering required to stay numerically honest at seventy-nine thousand scene units.",
    markdown: cataloguePaper,
  },
  {
    slug: "rendering",
    number: "02",
    title: "Plausible Worlds from Sparse Parameters",
    subtitle:
      "Procedural appearance synthesis for planets no one has seen, and where measurement ends and fiction begins",
    register: "Method description and epistemic bounds",
    date: "July 2026",
    teaser:
      "No exoplanet has ever been resolved as more than a point of light. This paper documents the classification pipeline and procedural shaders that derive each planet's appearance from its recorded parameters, and grades every visible feature as measured, derived, theory-guided or fictive.",
    markdown: renderingPaper,
  },
  {
    slug: "visualization",
    number: "03",
    title: "From Data Point to Destination",
    subtitle:
      "What visualisation can and cannot do for the public understanding of exoplanets",
    register: "Survey and synthesis",
    date: "July 2026",
    teaser:
      "Exoplanets are the most pictured objects in science that have never been seen. A survey of the landscape, from press art and NASA's Eyes to planetarium platforms and procedural universes, and an argument that disclosure, not realism, is the axis that matters.",
    markdown: visualizationPaper,
  },
];

export function getPaper(slug: string): Paper | undefined {
  return papers.find((p) => p.slug === slug);
}
