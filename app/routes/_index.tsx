import type { MetaFunction } from "react-router";
import { useLoaderData, Link } from "react-router";
import { useState, useMemo, useEffect } from "react";
import { getXmlFilesList } from "~/utils/getXmlFilesList";
import { catalogueSystems, FILTER_TAGS } from "~/data/catalogueSystems";
import type { CatalogueSystem } from "~/data/catalogueSystems";
import { ShaderPlanet } from "~/components/ShaderPlanet";
import { SiteHeader } from "~/components/SiteHeader";
import { LivePlanet } from "~/components/LivePlanet";
import type { PlanetType as CatType } from "~/components/PlanetCanvas";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";

export const meta: MetaFunction = () => [
  { title: "Exo·Catalogue" },
  { name: "description", content: "An editorial catalogue of nearby exoplanet systems." },
];

export const loader = async () => {
  const xmlFiles = await getXmlFilesList();
  return { totalSystems: xmlFiles.length, xmlFiles };
};

// ─── count-up stat number (animates 0 → end once on mount) ───────────────────

function CountUp({ end, duration = 1400 }: { end: number; duration?: number }) {
  // Initial state = final value so SSR / no-JS renders the real number; the
  // mount effect resets to 0 and animates up.
  const [display, setDisplay] = useState(end);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0;
    let start: number | null = null;
    setDisplay(0);
    const tick = (t: number) => {
      if (start === null) start = t;
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setDisplay(Math.round(end * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setDisplay(end);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [end, duration]);
  return <>{display.toLocaleString()}</>;
}

// ─── hero card (Direction B · planet variant) ────────────────────────────────

function FeaturedCard({ system }: { system: CatalogueSystem }) {
  return (
    <Link
      to={`/system/${encodeURIComponent(system.filename)}`}
      className="group card-draw relative grid overflow-hidden"
      style={{
        gridTemplateColumns: "1fr 580px",
        background: "#000",
        border: "1px solid oklch(0.32 0.01 260 / 0.55)",
        backdropFilter: "blur(24px) saturate(1.2)",
        boxShadow: "0 30px 80px -20px rgba(0,0,0,.75), 0 8px 24px -8px rgba(0,0,0,.6)",
      }}
    >
      {/* ── left: text ── */}
      <div
        className="relative z-10 flex flex-col gap-5 p-10"
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
        <div className="flex flex-wrap gap-4">
          {system.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center"
              style={{
                fontSize: 11,
                padding: 0,
                background: "transparent",
                color: "oklch(0.78 0.008 240)",
                height: 22,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* ── right: planet art ── */}
      <div
        className="relative flex items-center justify-center overflow-hidden"
        style={{
          background: "#000",
        }}
      >
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
    </Link>
  );
}

// ─── system grid card (Direction B) ──────────────────────────────────────────

function SystemCard({ system }: { system: CatalogueSystem }) {
  return (
    <Link to={`/system/${encodeURIComponent(system.filename)}`} className="group card-draw block">
      <div
        className="relative flex flex-col overflow-hidden h-full"
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
            background: "#000",
          }}
        >
          {/* planet */}
          <div>
            <ShaderPlanet
              type={system.featured.type}
              seed={system.featured.seed}
              slug={system.slug}
              size={160}
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
        <div className="flex flex-1 flex-col gap-2.5 p-5" style={{ background: "#000" }}>
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
            className="flex flex-col gap-1 rounded-sm py-2.5"
            style={{
              background: "oklch(0.09 0.01 260 / 0.5)",
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
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
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
  const { totalSystems, xmlFiles } = useLoaderData<{ totalSystems: number; xmlFiles: string[] }>();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [sort, setSort] = useState("default");

  const featured = catalogueSystems[0]; // stable for FeaturedCard (SSR-safe)

  // Masthead cycles through every CatType (the catalogue's render-type string
  // — "gas_giant", "rocky", "ocean"… — that buildShaderParams actually
  // switches on). Starts from a random index; advances every CYCLE_MS.
  // Seeds derived from type name char codes so each type is visually stable
  // across reloads.
  const CYCLE_MS = 6000;
  const ALL_TYPES = useMemo<CatType[]>(
    () => [
      "rocky",
      "rocky_earthlike",
      "lava",
      "eyeball_ice",
      "gas_giant",
      "ice_giant",
      "ocean",
      "hot_jupiter",
      "carbon",
    ],
    [],
  );
  const seedFor = (t: string) => {
    let h = 0;
    for (let i = 0; i < t.length; i++) h = (h * 31 + t.charCodeAt(i)) >>> 0;
    return h;
  };
  const [mastheadIdx, setMastheadIdx] = useState(0);
  useEffect(() => {
    setMastheadIdx(Math.floor(Math.random() * ALL_TYPES.length));
    const id = window.setInterval(() => {
      setMastheadIdx((i) => (i + 1) % ALL_TYPES.length);
    }, CYCLE_MS);
    return () => window.clearInterval(id);
  }, [ALL_TYPES.length]);
  const mastheadType = ALL_TYPES[mastheadIdx];
  const mastheadSeed = seedFor(mastheadType);

  // Desktop offsets the sphere right within the canvas. Listen to viewport
  // width so the layout flips at the same `md` breakpoint Tailwind uses
  // (768px). 0.22 ≈ shifts the centre 22% of the masthead width to the right.
  const [mastheadOffsetX, setMastheadOffsetX] = useState(0);
  useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    const apply = () => setMastheadOffsetX(mql.matches ? 0.22 : 0);
    apply();
    mql.addEventListener("change", apply);
    return () => mql.removeEventListener("change", apply);
  }, []);

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
          background: "#000",
        }}
      />

      <div className="relative z-10 min-h-screen text-foreground" style={{ fontFamily: "var(--font-sans, sans-serif)" }}>

        {/* ── NAV ── */}
        <SiteHeader xmlFiles={xmlFiles} />

        {/* ── MASTHEAD ── */}
        <section
          className="relative flex flex-col overflow-hidden px-12 pb-14 pt-[88px]"
          style={{ minHeight: 520, borderBottom: "1px solid oklch(0.28 0.01 260 / 0.45)" }}
        >
          <div className="relative z-10 max-w-3xl">
            {/* title */}
            <h1
              className="flex flex-col font-normal"
              style={{
                fontSize: "clamp(54px, 7.6vw, 116px)",
                fontWeight: 400,
                lineHeight: 0.95,
                letterSpacing: "-0.035em",
                gap: 2,
                color: "#fff",
                marginBottom: 24,
              }}
            >
              <span>Explore</span>
              <span>alien</span>
              <span>worlds</span>
            </h1>
          </div>

          {/* stats strip */}
          <div
            className="relative z-10 mt-auto flex items-stretch"
            style={{ paddingTop: 20 }}
          >
            {[
              { value: totalSystems, label: "confirmed" },
              { value: 4231, label: "systems" },
              { value: 62, label: "habitable zone" },
              { value: 147, label: "earth-like" },
            ].map(({ value, label }, i, arr) => (
              <div
                key={label}
                style={{
                  paddingRight: i < arr.length - 1 ? 48 : 0,
                  marginRight: i < arr.length - 1 ? 48 : 0,
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
                    color: "#fff",
                  }}
                >
                  <CountUp end={value} />
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-mono, monospace)",
                    fontSize: 10.5,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    marginTop: 8,
                    color: "#fff",
                  }}
                >
                  {label}
                </div>
              </div>
            ))}
          </div>

          {/* giant background planet — live shader, fills the masthead behind
              the text. inset:0 so the canvas covers the full section; LivePlanet
              centers a fixed-resolution sphere within whatever container size
              it gets, so a tall-but-wide masthead crops top/bottom of the
              sphere naturally via overflow:hidden on the section. */}
          {/*
           * Container fills the entire masthead (inset-0) so the WebGL
           * canvas spans the full width — no clipped straight edge. The
           * sphere itself is offset horizontally inside the canvas via
           * LivePlanet's offsetX prop, which translates the inner div.
           * On mobile, offsetX=0 keeps the planet centered behind the text.
           */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{ opacity: 0.85, zIndex: 0 }}
          >
            <LivePlanet
              type={mastheadType}
              seed={mastheadSeed}
              offsetX={mastheadOffsetX}
              style={{ width: "100%", height: "100%" }}
            />
          </div>
        </section>

        {/* ── TOOLBAR ── */}
        <div
          className="sticky flex flex-wrap items-center gap-3 px-12 py-5"
          style={{
            top: 73,
            zIndex: 40,
            background: "oklch(0.1 0.01 260 / 0.3)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            borderBottom: "1px solid oklch(0.28 0.01 260 / 0.45)",
            // deep shadow cast upward, over the masthead planet above
            boxShadow: "0 -40px 70px -10px rgba(0,0,0,0.85)",
          }}
        >
          {/* chips */}
          <div className="flex flex-wrap gap-1 flex-1">
            {(["all", ...FILTER_TAGS.filter((t) => t !== "all")] as const).map((tag) => {
              const isActive = tag === "all" ? activeFilter === null : activeFilter === tag;
              return (
                <button
                  key={tag}
                  onClick={() => setActiveFilter(tag === "all" ? null : tag)}
                  className="cursor-pointer transition-all"
                  style={{
                    fontFamily: "var(--font-sans, sans-serif)",
                    fontSize: 11,
                    fontWeight: 400,
                    letterSpacing: "0.08em",
                    padding: "8px 16px",
                    borderRadius: 999,
                    border: `1px solid ${isActive ? "hsl(var(--border))" : "hsl(var(--border) / 0.6)"}`,
                    background: isActive ? "hsl(var(--secondary))" : "transparent",
                    color: isActive ? "hsl(var(--secondary-foreground))" : "oklch(0.65 0.01 240)",
                    textTransform: "uppercase",
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
          <span style={{ fontSize: 12, color: "oklch(0.42 0.01 240)" }}>
            Data: Open Exoplanet Catalogue
          </span>
        </footer>
      </div>
    </>
  );
}
