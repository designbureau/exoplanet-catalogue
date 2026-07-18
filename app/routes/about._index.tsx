import type { MetaFunction } from "react-router";
import { Link, useLoaderData } from "react-router";
import { SiteHeader } from "~/components/SiteHeader";
import { papers } from "~/data/papers";
import { getXmlFilesList } from "~/utils/getXmlFilesList";

export async function loader() {
  // Feeds the header's full-catalogue search overlay.
  return { xmlFiles: await getXmlFilesList() };
}

export const meta: MetaFunction = () => [
  { title: "About — Exoplanet Catalogue" },
  {
    name: "description",
    content:
      "Three papers on the Exoplanet Catalogue: the system, the procedural rendering pipeline, and the wider landscape of exoplanet visualisation.",
  },
];

const mono = "var(--font-mono, monospace)";

export default function AboutIndex() {
  const { xmlFiles } = useLoaderData<typeof loader>();
  return (
    <div className="relative min-h-screen" style={{ background: "#000" }}>
      <SiteHeader xmlFiles={xmlFiles} />

      <main id="main" className="mx-auto w-full px-5 sm:px-8" style={{ maxWidth: 760, paddingBottom: 120 }}>
        {/* masthead */}
        <header style={{ padding: "96px 0 72px", maxWidth: 720 }}>
          <div
            className="uppercase"
            style={{ fontFamily: mono, fontSize: 11, letterSpacing: "0.16em", color: "oklch(0.62 0.01 240)" }}
          >
            About this project
          </div>
          <h1
            className="font-normal"
            style={{
              fontSize: "clamp(40px, 5vw, 64px)",
              lineHeight: 1.02,
              letterSpacing: "-0.03em",
              color: "oklch(0.98 0.005 240)",
              margin: "20px 0 24px",
            }}
          >
            Worlds derived from data
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.65, color: "oklch(0.78 0.008 240)" }}>
            Every planet on this site is rendered, not painted. A classification pipeline reads each
            system&rsquo;s record from the Open Exoplanet Catalogue, radius, mass, orbit, star, and a
            procedural shader derives an appearance from it: the same record renders the same world on
            every visit, and nothing is hand-drawn. The three papers below document how that works, what
            it can honestly claim, and where it sits in the wider landscape of exoplanet visualisation.
          </p>
        </header>

        {/* the papers */}
        <div
          className="uppercase"
          style={{
            fontFamily: mono,
            fontSize: 11,
            letterSpacing: "0.16em",
            color: "oklch(0.62 0.01 240)",
            marginBottom: 20,
          }}
        >
          Papers &middot; {papers.length}
        </div>

        <div className="flex flex-col" style={{ gap: 20 }}>
          {papers.map((paper) => (
            <Link
              key={paper.slug}
              to={`/about/${paper.slug}`}
              className="group card-draw block"
            >
              <article
                className="relative overflow-hidden p-6 sm:p-10"
                style={{
                  background: "oklch(0.13 0.01 260 / 0.55)",
                  border: "1px solid oklch(0.28 0.01 260 / 0.45)",
                }}
              >
                <div className="flex items-baseline gap-5 flex-wrap">
                  <span
                    style={{ fontFamily: mono, fontSize: 13, color: "oklch(0.62 0.01 240)" }}
                  >
                    {paper.number}
                  </span>
                  <h2
                    className="font-normal"
                    style={{
                      fontSize: "clamp(24px, 2.6vw, 32px)",
                      letterSpacing: "-0.02em",
                      lineHeight: 1.15,
                      color: "oklch(0.98 0.005 240)",
                    }}
                  >
                    {paper.title}
                  </h2>
                </div>
                <p
                  style={{
                    fontSize: 15,
                    lineHeight: 1.5,
                    color: "oklch(0.68 0.01 240)",
                    margin: "10px 0 18px",
                    maxWidth: "62ch",
                  }}
                >
                  {paper.subtitle}
                </p>
                <p
                  style={{
                    fontSize: 15,
                    lineHeight: 1.65,
                    color: "oklch(0.78 0.008 240)",
                    maxWidth: "70ch",
                    marginBottom: 22,
                  }}
                >
                  {paper.teaser}
                </p>
                <div
                  className="flex items-center gap-6 uppercase"
                  style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: "0.14em", color: "oklch(0.62 0.01 240)" }}
                >
                  <span>{paper.register}</span>
                  <span>{paper.date}</span>
                  <span
                    className="ml-auto transition-colors group-hover:text-cyan-400"
                    style={{ letterSpacing: "0.14em" }}
                  >
                    Read &rarr;
                  </span>
                </div>
              </article>
            </Link>
          ))}
        </div>

        {/* colophon */}
        <footer
          style={{
            marginTop: 72,
            paddingTop: 28,
            borderTop: "1px solid oklch(0.25 0.01 260 / 0.5)",
            fontFamily: mono,
            fontSize: 12,
            lineHeight: 1.8,
            color: "oklch(0.62 0.01 240)",
            maxWidth: 720,
          }}
        >
          Data: Open Exoplanet Catalogue, vendored and synced weekly. Rendering: hand-written GLSL
          over three.js. The papers above are also maintained as markdown in the repository&rsquo;s{" "}
          <code>docs/</code> directory &mdash; the site renders those files directly, so the published
          and versioned copies cannot drift apart.
        </footer>
      </main>
    </div>
  );
}
