import type { MetaFunction } from "react-router";
import { useLoaderData, Link } from "react-router";
import { useState, useMemo } from "react";
import { getXmlFilesList } from "~/utils/getXmlFilesList";
import { catalogueSystems, FILTER_TAGS } from "~/data/catalogueSystems";
import type { CatalogueSystem } from "~/data/catalogueSystems";
import { ShaderPlanet } from "~/components/ShaderPlanet";
import { LivePlanet } from "~/components/LivePlanet";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";

export const meta: MetaFunction = () => [
  { title: "Exo·Catalogue" },
  { name: "description", content: "An editorial catalogue of nearby exoplanet systems." },
];

export const loader = async () => {
  const xmlFiles = await getXmlFilesList();
  return { totalSystems: xmlFiles.length };
};

// ─── hero card (Direction B · planet variant) ────────────────────────────────

function FeaturedCard({ system }: { system: CatalogueSystem }) {
  return (
    <div
      className="relative grid overflow-hidden rounded-sm"
      style={{
        gridTemplateColumns: "1fr 580px",
        minHeight: 600,
        background: "oklch(0.11 0.012 260 / 0.5)",
        border: "1px solid oklch(0.32 0.01 260 / 0.55)",
        backdropFilter: "blur(24px) saturate(1.2)",
        boxShadow: "0 30px 80px -20px rgba(0,0,0,.75), 0 8px 24px -8px rgba(0,0,0,.6)",
      }}
    >
      {/* ── left: text ── */}
      <div
        className="relative z-10 flex flex-col gap-5 p-14"
        style={{ borderRight: "1px solid oklch(0.28 0.01 260 / 0.45)" }}
      >
        {/* eyebrow */}
        <div className="flex items-center gap-2.5" style={{ color: "oklch(0.58 0.01 240)" }}>
          <span
            className="inline-block h-2 w-2 rounded-full flex-shrink-0"
            style={{ background: system.star.color }}
          />
          <span
            className="uppercase tracking-widest"
            style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 11 }}
          >
            {system.star.label} · {system.star.type}
          </span>
        </div>

        {/* title */}
        <h2
          className="font-normal leading-[0.95]"
          style={{
            fontSize: "clamp(44px, 5.5vw, 80px)",
            letterSpacing: "-0.035em",
            color: "oklch(0.98 0.005 240)",
          }}
        >
          {system.name}
        </h2>

        {/* blurb */}
        <p style={{ fontSize: 17, lineHeight: 1.55, color: "oklch(0.78 0.008 240)", maxWidth: "48ch" }}>
          {system.blurb}
        </p>

        {/* featured planet note */}
        <div
          className="flex flex-col gap-1.5 py-4"
          style={{ borderTop: "1px solid oklch(0.28 0.01 260 / 0.45)", borderBottom: "1px solid oklch(0.28 0.01 260 / 0.45)" }}
        >
          <div className="flex items-baseline gap-2.5 flex-wrap" style={{ fontSize: 15, color: "oklch(0.78 0.008 240)" }}>
            <span style={{ fontFamily: "var(--font-mono, monospace)", color: "oklch(0.98 0.005 240)", letterSpacing: "0.02em" }}>
              {system.featured.name}
            </span>
            <span style={{ color: "oklch(0.42 0.01 240)" }}>—</span>
            <span>{system.featured.note}</span>
          </div>
        </div>

        {/* companion planets row */}
        <div className="flex flex-col gap-2">
          <span
            className="uppercase tracking-widest"
            style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 10.5, color: "oklch(0.42 0.01 240)" }}
          >
            System · {system.planets.length} planets
          </span>
          <div className="flex items-center gap-2">
            {system.planets.map((p, i) => {
              const sz = Math.round(22 + p.r * 12);
              return (
                <ShaderPlanet
                  key={i}
                  type={p.type}
                  seed={p.seed}
                  size={sz}
                  style={{ filter: "drop-shadow(0 4px 10px rgba(0,0,0,0.6))" }}
                />
              );
            })}
          </div>
        </div>

        {/* meta */}
        <div className="flex gap-6" style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 12, color: "oklch(0.58 0.01 240)" }}>
          <span>{system.distance}</span>
          {system.discovered && <span>Disc. {system.discovered}</span>}
        </div>

        {/* tags */}
        <div className="flex flex-wrap gap-1.5">
          {system.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center"
              style={{
                fontSize: 11,
                padding: "2px 8px",
                borderRadius: 4,
                background: "hsl(var(--secondary))",
                color: "hsl(var(--secondary-foreground))",
                height: 22,
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-auto">
          <Button asChild className="rounded-full h-11 px-6 text-sm font-medium">
            <Link to={`/system/${encodeURIComponent(system.filename)}`}>
              Explore system →
            </Link>
          </Button>
        </div>
      </div>

      {/* ── right: planet art ── */}
      <div
        className="relative flex items-center justify-center overflow-hidden"
        style={{
          background: "radial-gradient(circle at 50% 55%, oklch(0.2 0.04 240 / 0.35), transparent 65%), oklch(0.08 0.012 260)",
        }}
      >
        {/* glow */}
        <div
          className="pointer-events-none absolute"
          style={{
            width: 480,
            height: 480,
            borderRadius: "50%",
            background: "radial-gradient(circle, oklch(0.4 0.1 220 / 0.2), transparent 60%)",
            filter: "blur(40px)",
          }}
        />
        {/* planet */}
        <div style={{ position: "relative", zIndex: 2 }}>
          <ShaderPlanet
            type={system.featured.type}
            seed={system.featured.seed}
            slug={system.slug}
            size={360}
            style={{ filter: "drop-shadow(0 30px 80px rgba(0,0,0,0.7))" }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── system grid card (Direction B) ──────────────────────────────────────────

function SystemCard({ system }: { system: CatalogueSystem }) {
  return (
    <Link to={`/system/${encodeURIComponent(system.filename)}`} className="group block">
      <div
        className="relative flex flex-col overflow-hidden rounded-sm h-full"
        style={{
          background: "oklch(0.13 0.01 260 / 0.55)",
          border: "1px solid oklch(0.28 0.01 260 / 0.45)",
          backdropFilter: "blur(18px) saturate(1.2)",
          boxShadow: "0 20px 50px -18px rgba(0,0,0,.7), 0 4px 14px -6px rgba(0,0,0,.55)",
          transition: "transform 0.45s cubic-bezier(0.2,0.8,0.2,1), border-color 0.4s, background 0.4s",
        }}
      >
        {/* art panel */}
        <div
          className="relative flex items-center justify-center overflow-hidden"
          style={{
            height: 220,
            background: "radial-gradient(circle at 50% 55%, oklch(0.22 0.04 220 / 0.5), transparent 65%), oklch(0.08 0.012 260)",
          }}
        >
          {/* inner frame */}
          <div
            className="pointer-events-none absolute"
            style={{ inset: 14, border: "1px solid oklch(0.3 0.01 260 / 0.35)" }}
          />

          {/* planet */}
          <div>
            <ShaderPlanet
              type={system.featured.type}
              seed={system.featured.seed}
              slug={system.slug}
              size={140}
              style={{ filter: "drop-shadow(0 14px 36px rgba(0,0,0,0.55))" }}
            />
          </div>

          {/* art labels */}
          <span
            className="absolute left-3.5 top-3.5 uppercase tracking-widest"
            style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 9.5, color: "oklch(0.58 0.01 240)" }}
          >
            {system.star.type}
          </span>
          <span
            className="absolute right-3.5 top-3.5 uppercase tracking-widest"
            style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 9.5, color: "oklch(0.58 0.01 240)" }}
          >
            {system.distance}
          </span>
        </div>

        {/* body */}
        <div className="flex flex-1 flex-col gap-2.5 p-5">
          {/* star */}
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full flex-shrink-0" style={{ background: system.star.color }} />
            <span style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 10.5, color: "oklch(0.58 0.01 240)", letterSpacing: "0.04em" }}>
              {system.star.label}
            </span>
          </div>

          <h3
            className="font-medium leading-tight"
            style={{ fontSize: 20, letterSpacing: "-0.02em", color: "oklch(0.98 0.005 240)" }}
          >
            {system.name}
          </h3>

          <p
            className="line-clamp-2"
            style={{ fontSize: 13.5, lineHeight: 1.55, color: "oklch(0.78 0.008 240)" }}
          >
            {system.blurb}
          </p>

          {/* featured planet inset */}
          <div
            className="flex flex-col gap-1 rounded-sm p-2.5"
            style={{
              background: "oklch(0.09 0.01 260 / 0.5)",
              border: "1px solid oklch(0.28 0.01 260 / 0.45)",
              fontSize: 12,
            }}
          >
            <span style={{ fontFamily: "var(--font-mono, monospace)", color: "oklch(0.98 0.005 240)", letterSpacing: "0.04em" }}>
              {system.featured.name}
            </span>
            <span className="line-clamp-1" style={{ color: "oklch(0.78 0.008 240)", fontSize: 12.5 }}>
              {system.featured.note}
            </span>
          </div>

          {/* footer */}
          <div
            className="mt-auto flex items-center justify-between gap-2 pt-3"
            style={{ borderTop: "1px solid oklch(0.28 0.01 260 / 0.45)" }}
          >
            {/* companion dots */}
            <div className="flex items-center gap-1">
              {system.planets.slice(0, 6).map((p, i) => {
                const sz = Math.round(14 + p.r * 6);
                return (
                  <ShaderPlanet
                    key={i}
                    type={p.type}
                    seed={p.seed}
                    size={sz}
                    style={{ filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.7))" }}
                  />
                );
              })}
              {system.planets.length > 6 && (
                <span style={{ fontSize: 10, color: "oklch(0.42 0.01 240)", marginLeft: 2 }}>
                  +{system.planets.length - 6}
                </span>
              )}
            </div>

            {/* tags */}
            <div className="flex gap-1 flex-wrap justify-end">
              {system.tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontSize: 10.5,
                    padding: "2px 7px",
                    borderRadius: 4,
                    border: "1px solid hsl(var(--border))",
                    color: "oklch(0.78 0.008 240)",
                    background: "transparent",
                    whiteSpace: "nowrap",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "distance", label: "Distance" },
  { value: "discovered", label: "Year" },
  { value: "name", label: "Name A–Z" },
];

export default function Index() {
  const { totalSystems } = useLoaderData<{ totalSystems: number }>();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [sort, setSort] = useState("default");

  const featured = catalogueSystems[0]; // TRAPPIST-1

  const filteredSystems = useMemo(() => {
    let systems = [...catalogueSystems];

    if (activeFilter) {
      if (activeFilter === "gas giant") {
        systems = systems.filter((s) =>
          s.tags.some((t) => t.includes("gas giant") || t.includes("hot jupiter")),
        );
      } else {
        systems = systems.filter((s) => s.tags.includes(activeFilter));
      }
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      systems = systems.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.blurb.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }

    if (sort === "distance") {
      systems = systems.sort((a, b) => (parseFloat(a.distance) || 0) - (parseFloat(b.distance) || 0));
    } else if (sort === "discovered") {
      systems = systems.sort((a, b) => (a.discovered ?? 9999) - (b.discovered ?? 9999));
    } else if (sort === "name") {
      systems = systems.sort((a, b) => a.name.localeCompare(b.name));
    }

    return systems;
  }, [activeFilter, search, sort]);

  const showHero = !activeFilter && !search.trim();
  const gridSystems = showHero
    ? filteredSystems.filter((s) => s.filename !== featured.filename)
    : filteredSystems;

  return (
    <>
      {/* ── stars background ── */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background: `
            radial-gradient(circle at 20% 10%, oklch(0.2 0.05 260 / 0.5), transparent 40%),
            radial-gradient(circle at 85% 70%, oklch(0.2 0.04 220 / 0.35), transparent 45%),
            radial-gradient(circle at 50% 100%, oklch(0.18 0.03 60 / 0.25), transparent 50%),
            oklch(0.08 0.012 260)
          `,
        }}
      />

      <div className="relative z-10 min-h-screen text-foreground" style={{ fontFamily: "var(--font-sans, sans-serif)" }}>

        {/* ── NAV ── */}
        <nav
          className="sticky top-0 z-50 flex items-center gap-6 px-12 py-[18px]"
          style={{
            background: "oklch(0.08 0.01 260 / 0.55)",
            backdropFilter: "blur(16px) saturate(1.2)",
            WebkitBackdropFilter: "blur(16px) saturate(1.2)",
            borderBottom: "1px solid oklch(0.32 0.012 260 / 0.55)",
          }}
        >
          {/* brand */}
          <div className="flex items-center gap-3 shrink-0">
            {/* planet glyph */}
            <span
              className="inline-block h-[18px] w-[18px] rounded-full"
              style={{
                background: "radial-gradient(circle at 35% 35%, #fff, oklch(0.75 0.1 220) 50%, oklch(0.3 0.1 260) 85%)",
                boxShadow: "0 0 12px oklch(0.75 0.12 220 / 0.5)",
              }}
            />
            <span
              className="uppercase tracking-[0.1em]"
              style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 13, letterSpacing: "0.1em" }}
            >
              EXO·CATALOGUE
            </span>
          </div>

          {/* links */}
          <div className="hidden items-center gap-[22px] md:flex">
            {["Systems", "Catalogue", "Telemetry", "About"].map((l) => (
              <span
                key={l}
                className="cursor-pointer transition-colors"
                style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 12, color: "oklch(0.58 0.01 240)", letterSpacing: "0.08em" }}
              >
                {l}
              </span>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-3">
            {/* search */}
            <div
              className="flex items-center gap-2.5 transition-shadow focus-within:ring-1"
              style={{
                height: 36,
                padding: "0 12px",
                border: "1px solid hsl(var(--input))",
                borderRadius: "calc(var(--radius) - 2px)",
                background: "hsl(var(--background) / 0.6)",
                backdropFilter: "blur(8px)",
                minWidth: 280,
              }}
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, opacity: 0.4 }}>
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                placeholder="Search systems…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
                style={{ fontSize: 13, color: "oklch(0.98 0.005 240)", fontFamily: "var(--font-sans, sans-serif)" }}
              />
              <kbd
                style={{
                  fontFamily: "var(--font-mono, monospace)",
                  fontSize: 10,
                  padding: "2px 6px",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 4,
                  color: "oklch(0.58 0.01 240)",
                  background: "hsl(var(--muted) / 0.7)",
                  marginLeft: "auto",
                  flexShrink: 0,
                }}
              >
                ⌘K
              </kbd>
            </div>

            {/* count */}
            <span
              style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 12, color: "oklch(0.58 0.01 240)", letterSpacing: "0.08em", whiteSpace: "nowrap" }}
            >
              {filteredSystems.length} systems
            </span>
          </div>
        </nav>

        {/* ── MASTHEAD ── */}
        <section
          className="relative overflow-hidden px-12 pb-14 pt-[88px]"
          style={{ minHeight: 520, borderBottom: "1px solid oklch(0.28 0.01 260 / 0.45)" }}
        >
          <div className="relative z-10 max-w-3xl">
            {/* breadcrumb */}
            <p
              className="mb-6 uppercase tracking-widest"
              style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 11, color: "oklch(0.42 0.01 240)", letterSpacing: "0.14em" }}
            >
              Exoplanet catalogue · {new Date().getFullYear()}
            </p>

            {/* title */}
            <h1
              className="flex flex-col font-normal"
              style={{
                fontSize: "clamp(54px, 7.6vw, 116px)",
                fontWeight: 400,
                lineHeight: 0.95,
                letterSpacing: "-0.035em",
                gap: 2,
                color: "oklch(0.98 0.005 240)",
              }}
            >
              <span>Nearby</span>
              <span
                style={{
                  background: "linear-gradient(180deg, var(--accent-exotic, oklch(0.78 0.14 320)) 0%, oklch(0.98 0.005 240) 85%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                worlds
              </span>
              <span>catalogue</span>
            </h1>
          </div>

          {/* stats strip */}
          <div
            className="relative z-10 mt-7 flex items-stretch"
            style={{ borderTop: "1px solid oklch(0.28 0.01 260 / 0.45)", paddingTop: 20 }}
          >
            {[
              { value: totalSystems.toLocaleString(), label: "confirmed" },
              { value: "4,231", label: "systems" },
              { value: "62", label: "habitable zone" },
              { value: "147", label: "earth-like" },
            ].map(({ value, label }, i, arr) => (
              <div
                key={label}
                style={{
                  paddingRight: i < arr.length - 1 ? 48 : 0,
                  marginRight: i < arr.length - 1 ? 48 : 0,
                  borderRight: i < arr.length - 1 ? "1px solid oklch(0.28 0.01 260 / 0.45)" : "none",
                }}
              >
                <div
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: 30,
                    fontWeight: 400,
                    lineHeight: 1,
                    letterSpacing: "-0.02em",
                    fontVariantNumeric: "tabular-nums",
                    color: "oklch(0.98 0.005 240)",
                  }}
                >
                  {value}
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: 10.5,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    marginTop: 8,
                    color: "oklch(0.42 0.01 240)",
                  }}
                >
                  {label}
                </div>
              </div>
            ))}
          </div>

          {/* giant background planet — live shader */}
          <div
            className="pointer-events-none absolute"
            style={{
              right: "-50vw",
              top: "50%",
              transform: "translateY(-50%)",
              width: "min(100vw, 1800px)",
              height: "min(100vw, 1800px)",
              opacity: 0.85,
              zIndex: 1,
            }}
          >
            <LivePlanet
              type={featured.featured.type}
              seed={featured.featured.seed}
              style={{ width: "100%", height: "100%" }}
            />
          </div>
        </section>

        {/* ── TOOLBAR ── */}
        <div
          className="sticky flex flex-wrap items-center gap-3 px-12 py-5"
          style={{
            top: 57,
            zIndex: 40,
            background: "oklch(0.1 0.01 260 / 0.3)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            borderBottom: "1px solid oklch(0.28 0.01 260 / 0.45)",
          }}
        >
          {/* chips */}
          <div className="flex flex-wrap gap-1.5 flex-1">
            {(["all", ...FILTER_TAGS.filter((t) => t !== "all")] as const).map((tag) => {
              const isActive = tag === "all" ? activeFilter === null : activeFilter === tag;
              return (
                <button
                  key={tag}
                  onClick={() => setActiveFilter(tag === "all" ? null : tag)}
                  className="cursor-pointer transition-all"
                  style={{
                    fontFamily: "var(--font-sans, sans-serif)",
                    fontSize: 13,
                    fontWeight: 500,
                    padding: "8px 16px",
                    borderRadius: 999,
                    border: `1px solid ${isActive ? "hsl(var(--border))" : "hsl(var(--border) / 0.6)"}`,
                    background: isActive ? "hsl(var(--secondary))" : "transparent",
                    color: isActive ? "hsl(var(--secondary-foreground))" : "oklch(0.65 0.01 240)",
                    textTransform: "none",
                  }}
                >
                  {tag === "all" ? "All" : tag}
                </button>
              );
            })}
          </div>

          {/* sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="cursor-pointer bg-transparent outline-none"
            style={{
              fontFamily: "var(--font-mono, monospace)",
              fontSize: 11.5,
              letterSpacing: "0.08em",
              color: "oklch(0.58 0.01 240)",
              textTransform: "uppercase",
            }}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} style={{ background: "hsl(var(--card))" }}>
                Sort: {o.label}
              </option>
            ))}
          </select>
        </div>

        {/* ── MAIN ── */}
        <main className="mx-auto max-w-[1520px] px-12 py-10 space-y-12">

          {/* featured hero */}
          {showHero && (
            <section>
              <div
                className="mb-5 flex items-baseline justify-between pb-3.5"
                style={{ borderBottom: "1px solid oklch(0.28 0.01 260 / 0.45)" }}
              >
                <span
                  className="uppercase tracking-widest"
                  style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 11, color: "oklch(0.42 0.01 240)" }}
                >
                  Featured system
                </span>
              </div>
              <FeaturedCard system={featured} />
            </section>
          )}

          {/* grid */}
          <section>
            <div
              className="mb-5 flex items-baseline justify-between pb-3.5"
              style={{ borderBottom: "1px solid oklch(0.28 0.01 260 / 0.45)" }}
            >
              <span
                className="uppercase tracking-widest"
                style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 11, color: "oklch(0.42 0.01 240)" }}
              >
                {activeFilter
                  ? `${activeFilter} · ${gridSystems.length} systems`
                  : `All systems · ${gridSystems.length}`}
              </span>
            </div>

            {gridSystems.length === 0 ? (
              <p
                className="py-16 text-center"
                style={{ fontSize: 14, color: "oklch(0.58 0.01 240)" }}
              >
                No systems match "{search}"
              </p>
            ) : (
              <div
                className="grid gap-5"
                style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}
              >
                {gridSystems.map((system) => (
                  <SystemCard key={system.slug} system={system} />
                ))}
              </div>
            )}
          </section>
        </main>

        {/* ── FOOTER ── */}
        <footer
          className="mt-10 flex items-center justify-between px-12 py-8"
          style={{ borderTop: "1px solid oklch(0.28 0.01 260 / 0.45)" }}
        >
          <span
            className="uppercase tracking-widest"
            style={{ fontFamily: "var(--font-mono, monospace)", fontSize: 11, color: "oklch(0.42 0.01 240)", letterSpacing: "0.14em" }}
          >
            EXO·CATALOGUE
          </span>
          <span style={{ fontSize: 12, color: "oklch(0.42 0.01 240)" }}>
            Data: Open Exoplanet Catalogue
          </span>
        </footer>
      </div>
    </>
  );
}
