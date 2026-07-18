/**
 * SiteHeader — persistent top navigation shared across the catalogue,
 * system viewer and galaxy/star-map pages.
 *
 * Brand → home, Star Map → /galaxy, and a search button that opens the
 * full-catalogue system search (SystemMenu) as a top-right overlay.
 */

import { useState } from "react";
import { Link } from "react-router";
import SystemMenu from "~/components/SystemMenu";

const linkStyle: React.CSSProperties = {
  fontFamily: "var(--font-mono, monospace)",
  fontSize: 12,
  color: "oklch(0.58 0.01 240)",
  letterSpacing: "0.08em",
};

export function SiteHeader({
  xmlFiles,
  variant = "sticky",
}: {
  xmlFiles: string[];
  /** "sticky" for scrolling pages (catalogue); "fixed" to float over a full-screen canvas */
  variant?: "sticky" | "fixed";
}) {
  const [menuActive, setMenuActive] = useState(false);

  return (
    <>
      <nav
        className={`${
          variant === "fixed" ? "fixed inset-x-0" : "sticky"
        } top-0 z-50 flex items-center gap-6 px-12 py-[18px]`}
        style={{
          background: "oklch(0.08 0.01 260 / 0.28)",
          backdropFilter: "blur(16px) saturate(1.2)",
          WebkitBackdropFilter: "blur(16px) saturate(1.2)",
          borderBottom: "1px solid oklch(0.32 0.012 260 / 0.4)",
        }}
      >
        {/* brand */}
        <div className="flex items-center gap-3 shrink-0">
          <Link
            to="/"
            className="uppercase tracking-[0.1em]"
            style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 13, letterSpacing: "0.1em" }}
          >
            Exoplanet Catalogue
          </Link>
        </div>

        {/* right cluster: nav links + search */}
        <div className="ml-auto flex items-center gap-6">
          <div className="hidden items-center gap-[22px] md:flex">
            <Link
              to="/galaxy"
              className="cursor-pointer uppercase transition-colors hover:text-cyan-400"
              style={linkStyle}
            >
              Star Map
            </Link>
            <span className="cursor-pointer uppercase transition-colors" style={linkStyle}>
              About
            </span>
          </div>

          {/* search toggle → opens the full-catalogue system search */}
          <button
            onClick={() => setMenuActive(true)}
            className="flex items-center gap-2.5 transition-colors hover:text-white"
            style={{
              height: 36,
              padding: "0 12px",
              border: "1px solid hsl(var(--input))",
              borderRadius: "calc(var(--radius) - 2px)",
              background: "hsl(var(--background) / 0.6)",
              backdropFilter: "blur(8px)",
              color: "oklch(0.58 0.01 240)",
              fontFamily: "var(--font-sans, sans-serif)",
              fontSize: 13,
              cursor: "pointer",
              minWidth: 240,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, opacity: 0.5 }}>
              <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span>Search systems…</span>
          </button>

          {/* GitHub source link */}
          <a
            href="https://github.com/designbureau/exoplanet-catalogue"
            target="_blank"
            rel="noreferrer"
            aria-label="View source on GitHub"
            className="shrink-0 transition-colors hover:text-white"
            style={{ color: "oklch(0.58 0.01 240)", display: "flex" }}
          >
            <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.65 7.65 0 0 1 2-.27c.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
            </svg>
          </a>
        </div>
      </nav>

      {/* full-catalogue system search overlay */}
      {menuActive && (
        <>
          <div className="fixed inset-0 z-[60]" onClick={() => setMenuActive(false)} />
          <aside className="fixed inset-x-4 top-16 z-[70] h-[70vh] rounded-md bg-black/80 backdrop-blur-md border border-white/10 overflow-hidden flex flex-col shadow-2xl">
            <SystemMenu xmlFiles={xmlFiles} setNavActive={() => setMenuActive(false)} />
          </aside>
        </>
      )}
    </>
  );
}
