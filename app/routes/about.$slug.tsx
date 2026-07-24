import type { LoaderFunctionArgs, MetaFunction } from "react-router";
import { Link, useLoaderData } from "react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { SiteHeader } from "~/components/SiteHeader";
import { getPaper, papers } from "~/data/papers";
import { getXmlFilesList } from "~/utils/getXmlFilesList";

export async function loader({ params }: LoaderFunctionArgs) {
  const paper = getPaper(params.slug ?? "");
  if (!paper) throw new Response("Not Found", { status: 404 });
  // xmlFiles feeds the header's full-catalogue search overlay.
  return { paper, xmlFiles: await getXmlFilesList() };
}

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: data ? `${data.paper.title} — Exoplanet Catalogue` : "Paper — Exoplanet Catalogue" },
  { name: "description", content: data?.paper.subtitle ?? "" },
];

const mono = "var(--font-mono, monospace)";
const body = "oklch(0.8 0.008 240)";
const bright = "oklch(0.97 0.005 240)";
const dim = "oklch(0.62 0.01 240)";
const rule = "1px solid oklch(0.28 0.01 260 / 0.5)";

/**
 * The markdown files open with a front-matter block (title, subtitle, author,
 * date, register) terminated by the first horizontal rule. The page renders
 * its own header from the papers registry, so that block is stripped here.
 */
function stripFrontMatter(md: string): string {
  const parts = md.split(/\n---\n/);
  return parts.length > 1 ? parts.slice(1).join("\n---\n") : md;
}

const components: Components = {
  // Markdown images render as full-width figures with the alt text as caption.
  img: ({ src, alt }) => (
    <figure style={{ margin: "36px 0" }}>
      <img
        src={src}
        alt={alt ?? ""}
        loading="lazy"
        style={{ width: "100%", height: "auto", display: "block", border: rule }}
      />
      {alt && (
        <figcaption
          style={{
            fontFamily: mono,
            fontSize: 12,
            lineHeight: 1.6,
            color: dim,
            padding: "12px 2px 0",
          }}
        >
          {alt}
        </figcaption>
      )}
    </figure>
  ),
  // A paragraph whose sole content is an image unwraps to the figure itself
  // (a <figure> may not sit inside <p>).
  p: ({ node, children }) => {
    const kids = (node as any)?.children?.filter(
      (c: any) => !(c.type === "text" && !c.value.trim()),
    );
    if (kids?.length === 1 && kids[0].tagName === "img") return <>{children}</>;
    return (
      <p style={{ fontSize: 16.5, lineHeight: 1.75, color: body, margin: "0 0 20px" }}>
        {children}
      </p>
    );
  },
  h2: ({ children }) => (
    <h2
      className="font-normal"
      style={{
        fontSize: 30,
        letterSpacing: "-0.02em",
        lineHeight: 1.2,
        color: bright,
        margin: "64px 0 20px",
      }}
    >
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3
      className="font-normal"
      style={{ fontSize: 21, letterSpacing: "-0.01em", color: bright, margin: "40px 0 14px" }}
    >
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4
      style={{
        fontSize: 16.5,
        fontWeight: 600,
        letterSpacing: "-0.005em",
        color: bright,
        margin: "34px 0 12px",
      }}
    >
      {children}
    </h4>
  ),
  strong: ({ children }) => <strong style={{ color: bright, fontWeight: 600 }}>{children}</strong>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="transition-colors hover:text-cyan-300"
      style={{ color: "oklch(0.75 0.1 220)", textDecoration: "underline", textUnderlineOffset: 3 }}
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noreferrer" : undefined}
    >
      {children}
    </a>
  ),
  ul: ({ children }) => (
    <ul style={{ margin: "0 0 20px", paddingLeft: 22, listStyle: "disc", color: body }}>
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol style={{ margin: "0 0 20px", paddingLeft: 24, listStyle: "decimal", color: body }}>
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li style={{ fontSize: 16.5, lineHeight: 1.7, marginBottom: 8 }}>{children}</li>
  ),
  blockquote: ({ children }) => (
    <blockquote
      style={{
        borderLeft: "2px solid oklch(0.5 0.08 220)",
        margin: "0 0 20px",
        padding: "4px 0 4px 22px",
        fontStyle: "italic",
      }}
    >
      {children}
    </blockquote>
  ),
  hr: () => <hr style={{ border: 0, borderTop: rule, margin: "56px 0" }} />,
  code: ({ children }) => (
    <code
      style={{
        fontFamily: mono,
        fontSize: "0.88em",
        background: "oklch(0.2 0.01 260 / 0.7)",
        padding: "2px 6px",
        borderRadius: 3,
      }}
    >
      {children}
    </code>
  ),
  table: ({ children }) => (
    // tabIndex + role make the horizontally scrollable region keyboard-reachable
    // (role "group", not "region": two same-named region landmarks per page
    // would fail axe's landmark-unique rule)
    <div
      tabIndex={0}
      role="group"
      aria-label="Table"
      style={{ overflowX: "auto", margin: "0 0 24px", border: rule }}
    >
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontFamily: mono,
          fontSize: 12.5,
          lineHeight: 1.5,
        }}
      >
        {children}
      </table>
    </div>
  ),
  thead: ({ children }) => <thead>{children}</thead>,
  th: ({ children }) => (
    <th
      className="uppercase"
      style={{
        textAlign: "left",
        padding: "10px 14px",
        borderBottom: rule,
        color: dim,
        fontWeight: 500,
        fontSize: 10.5,
        letterSpacing: "0.1em",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td
      style={{
        padding: "10px 14px",
        borderBottom: "1px solid oklch(0.22 0.01 260 / 0.5)",
        color: body,
        verticalAlign: "top",
        minWidth: 90,
      }}
    >
      {children}
    </td>
  ),
};

export default function PaperPage() {
  const { paper, xmlFiles } = useLoaderData<typeof loader>();
  const idx = papers.findIndex((p) => p.slug === paper.slug);
  const next = papers[(idx + 1) % papers.length];

  return (
    <div className="relative min-h-screen" style={{ background: "#000" }}>
      <SiteHeader xmlFiles={xmlFiles} />

      <main id="main" className="mx-auto w-full px-5 sm:px-8" style={{ maxWidth: 760, paddingBottom: 120 }}>
        {/* breadcrumb */}
        <nav
          className="uppercase"
          style={{
            fontFamily: mono,
            fontSize: 11,
            letterSpacing: "0.14em",
            color: dim,
            padding: "48px 0 0",
          }}
        >
          <Link to="/about" className="transition-colors hover:text-cyan-400">
            About
          </Link>
          <span style={{ margin: "0 10px" }}>/</span>
          <span>Paper {paper.number}</span>
        </nav>

        {/* paper header (rendered from the registry; the markdown's own
            front-matter block is stripped before rendering) */}
        <header style={{ padding: "40px 0 0" }}>
          <h1
            className="font-normal"
            style={{
              fontSize: "clamp(34px, 4.5vw, 52px)",
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              color: bright,
              marginBottom: 20,
            }}
          >
            {paper.title}
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.5, color: "oklch(0.7 0.01 240)", maxWidth: "56ch" }}>
            {paper.subtitle}
          </p>
          <div
            className="flex flex-wrap items-center gap-x-6 gap-y-2 uppercase"
            style={{
              fontFamily: mono,
              fontSize: 11,
              letterSpacing: "0.14em",
              color: dim,
              margin: "26px 0 0",
              paddingBottom: 32,
              borderBottom: rule,
            }}
          >
            <span style={{ color: "oklch(0.75 0.008 240)" }}>Ian Jamieson</span>
            <span>{paper.date}</span>
            <span>{paper.register}</span>
          </div>
        </header>

        {/* body */}
        <article style={{ paddingTop: 40 }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
            {stripFrontMatter(paper.markdown)}
          </ReactMarkdown>
        </article>

        {/* next paper */}
        <footer style={{ marginTop: 72 }}>
          <Link to={`/about/${next.slug}`} className="group card-draw block">
            <div
              className="relative overflow-hidden flex flex-wrap items-baseline gap-x-5 gap-y-2 p-5 sm:px-7 sm:py-6"
              style={{
                background: "oklch(0.13 0.01 260 / 0.55)",
                border: "1px solid oklch(0.28 0.01 260 / 0.45)",
              }}
            >
              <span
                className="uppercase"
                style={{ fontFamily: mono, fontSize: 10.5, letterSpacing: "0.14em", color: dim }}
              >
                Next
              </span>
              <span style={{ fontSize: 19, letterSpacing: "-0.01em", color: bright }}>
                {next.title}
              </span>
              <span
                className="ml-auto transition-colors group-hover:text-cyan-400"
                style={{ fontFamily: mono, fontSize: 12, color: dim }}
              >
                &rarr;
              </span>
            </div>
          </Link>
        </footer>
      </main>
    </div>
  );
}
