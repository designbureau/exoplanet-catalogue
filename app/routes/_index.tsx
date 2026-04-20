import type { MetaFunction } from "react-router";
import { useLoaderData, Link } from "react-router";
import { useState, useMemo, useRef, useCallback } from "react";
import { getXmlFilesList } from "~/utils/getXmlFilesList";
import { catalogueSystems, FILTER_TAGS } from "~/data/catalogueSystems";
import type { CatalogueSystem } from "~/data/catalogueSystems";
import { PlanetCanvas } from "~/components/PlanetCanvas";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";

export const meta: MetaFunction = () => [
  { title: "Exo·Catalogue" },
  { name: "description", content: "An editorial catalogue of nearby exoplanet systems." },
];

export const loader = async () => {
  const xmlFiles = await getXmlFilesList();
  const systemNames = xmlFiles.map((f: string) => f.replace(".xml", ""));
  return { totalSystems: systemNames.length };
};

// ---------- parallax hook ----------

function useParallax(strength = 6) {
  const ref = useRef<HTMLDivElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const nx = (e.clientX - cx) / (rect.width / 2);
    const ny = (e.clientY - cy) / (rect.height / 2);
    setOffset({ x: nx * strength, y: ny * strength });
  }, [strength]);

  const onLeave = useCallback(() => setOffset({ x: 0, y: 0 }), []);

  return { ref, offset, onMove, onLeave };
}

// ---------- featured card (Direction B / editorial) ----------

function FeaturedCard({ system }: { system: CatalogueSystem }) {
  const { ref, offset, onMove, onLeave } = useParallax(6);

  return (
    <Card
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className="relative overflow-hidden"
      style={{ boxShadow: "0 20px 50px -18px rgba(0,0,0,.7), 0 4px 14px -6px rgba(0,0,0,.55)" }}
    >
      <CardContent className="p-0">
        <div className="flex flex-col gap-6 p-8 md:flex-row md:items-center">
          {/* Left: text */}
          <div className="flex-1 space-y-4">
            {/* star badge */}
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: system.star.color }}
              />
              <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
                {system.star.label} · {system.star.type}
              </span>
            </div>

            <div>
              <h2 className="text-2xl font-medium tracking-tight">{system.name}</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{system.blurb}</p>
            </div>

            {/* featured planet note */}
            <div className="border-l-2 border-border pl-3">
              <p className="text-xs text-muted-foreground uppercase tracking-widest font-mono">
                {system.featured.name}
              </p>
              <p className="text-sm text-foreground/80">{system.featured.note}</p>
            </div>

            {/* tags */}
            <div className="flex flex-wrap gap-1.5">
              {system.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs rounded-sm">
                  {tag}
                </Badge>
              ))}
            </div>

            {/* meta row */}
            <div className="flex gap-6 font-mono text-xs text-muted-foreground">
              <span>{system.distance}</span>
              {system.discovered && <span>Disc. {system.discovered}</span>}
              <span>{system.planets.length} planets</span>
            </div>

            <Button asChild variant="default" className="rounded-full">
              <Link to={`/system/${encodeURIComponent(system.filename)}`}>
                Explore system →
              </Link>
            </Button>
          </div>

          {/* Right: planet canvas with parallax */}
          <div className="flex shrink-0 items-center justify-center md:justify-end">
            <div
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px)`,
                transition: "transform 0.15s ease-out",
              }}
            >
              <PlanetCanvas
                type={system.featured.type}
                seed={system.featured.seed}
                size={260}
                animate={false}
                atmosphere={system.featured.atmosphere}
                tilt={0.12}
                lightAngle={-0.6}
              />
            </div>
          </div>
        </div>

        {/* Companion planets strip */}
        <div className="flex items-center gap-3 border-t border-border/40 px-8 py-4">
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest mr-2">
            System
          </span>
          {system.planets.map((p, i) => {
            const sz = Math.round(24 + p.r * 14);
            return (
              <PlanetCanvas
                key={i}
                type={p.type}
                seed={p.seed}
                size={sz}
                animate={false}
                tilt={0.08}
                lightAngle={-0.55}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ---------- system grid card ----------

function SystemCard({ system }: { system: CatalogueSystem }) {
  const { ref, offset, onMove, onLeave } = useParallax(5);

  return (
    <Link to={`/system/${encodeURIComponent(system.filename)}`} className="group block">
      <Card
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        className="relative h-full overflow-hidden transition-transform duration-150 group-hover:-translate-y-0.5"
        style={{ boxShadow: "0 20px 50px -18px rgba(0,0,0,.7), 0 4px 14px -6px rgba(0,0,0,.55)" }}
      >
        <CardContent className="p-5">
          {/* Planet — top right corner */}
          <div
            className="absolute right-4 top-4 z-0"
            style={{
              transform: `translate(${offset.x}px, ${offset.y}px)`,
              transition: "transform 0.15s ease-out",
            }}
          >
            <PlanetCanvas
              type={system.featured.type}
              seed={system.featured.seed}
              size={88}
              animate={false}
              atmosphere={system.featured.atmosphere ?? null}
              tilt={0.1}
              lightAngle={-0.6}
            />
          </div>

          {/* Text content */}
          <div className="relative z-10 pr-24">
            {/* star type */}
            <div className="flex items-center gap-1.5 mb-3">
              <span
                className="inline-block h-1.5 w-1.5 rounded-full"
                style={{ background: system.star.color }}
              />
              <span className="text-xs font-mono text-muted-foreground">
                {system.star.type}
              </span>
            </div>

            <h3 className="text-base font-medium tracking-tight leading-tight">{system.name}</h3>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed line-clamp-3">
              {system.blurb}
            </p>

            {/* tags */}
            <div className="mt-3 flex flex-wrap gap-1">
              {system.tags.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="outline" className="text-[10px] rounded-sm px-1.5 py-0">
                  {tag}
                </Badge>
              ))}
            </div>

            {/* meta */}
            <div className="mt-3 flex gap-4 font-mono text-[10px] text-muted-foreground/70">
              <span>{system.distance}</span>
              {system.discovered && <span>{system.discovered}</span>}
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// ---------- page ----------

const SORT_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "distance", label: "Distance" },
  { value: "discovered", label: "Year discovered" },
  { value: "name", label: "Name" },
];

export default function Index() {
  const { totalSystems } = useLoaderData<{ totalSystems: number }>();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [sort, setSort] = useState("default");

  const featured = catalogueSystems[0]; // TRAPPIST-1 as hero

  const filteredSystems = useMemo(() => {
    let systems = catalogueSystems;

    // Tag filter
    if (activeFilter) {
      if (activeFilter === "gas giant") {
        systems = systems.filter((s) =>
          s.tags.some((t) => t.includes("gas giant") || t.includes("hot jupiter"))
        );
      } else {
        systems = systems.filter((s) => s.tags.includes(activeFilter));
      }
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      systems = systems.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.blurb.toLowerCase().includes(q) ||
          s.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Sort
    if (sort === "distance") {
      systems = [...systems].sort((a, b) => {
        const pa = parseFloat(a.distance) || 0;
        const pb = parseFloat(b.distance) || 0;
        return pa - pb;
      });
    } else if (sort === "discovered") {
      systems = [...systems].sort((a, b) => (a.discovered ?? 9999) - (b.discovered ?? 9999));
    } else if (sort === "name") {
      systems = [...systems].sort((a, b) => a.name.localeCompare(b.name));
    }

    return systems;
  }, [activeFilter, search, sort]);

  // Separate hero from grid (don't show featured in grid when no filter/search active)
  const showHero = !activeFilter && !search.trim();
  const gridSystems = showHero
    ? filteredSystems.filter((s) => s.filename !== featured.filename)
    : filteredSystems;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 border-b border-border/40 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-3">
          {/* Wordmark */}
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-foreground shrink-0">
            EXO·CATALOGUE
          </span>

          {/* Nav links */}
          <div className="hidden items-center gap-5 md:flex">
            {["Systems", "Catalogue", "Telemetry", "About"].map((label) => (
              <span
                key={label}
                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                {label}
              </span>
            ))}
          </div>

          <div className="ml-auto flex items-center gap-3">
            {/* Search */}
            <div className="relative">
              <Input
                type="text"
                placeholder="Search systems…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-48 pr-10 text-xs md:w-64"
              />
              <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border border-border/60 px-1 py-0.5 font-mono text-[9px] text-muted-foreground">
                ⌘K
              </kbd>
            </div>

            {/* Result count */}
            <span className="font-mono text-[11px] text-muted-foreground whitespace-nowrap">
              {filteredSystems.length} systems
            </span>
          </div>
        </div>
      </nav>

      {/* ── MASTHEAD ── */}
      <section className="relative overflow-hidden px-6 pb-16 pt-20">
        <div className="mx-auto max-w-7xl">
          {/* Title */}
          <div className="relative z-10 max-w-2xl">
            <h1
              className="font-normal leading-[0.95] tracking-[-0.035em]"
              style={{ fontSize: "clamp(54px, 7.6vw, 116px)" }}
            >
              <span className="block">Nearby</span>
              <span
                className="block"
                style={{
                  background: "linear-gradient(to bottom, oklch(0.78 0.14 320), oklch(0.55 0.18 320))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                worlds
              </span>
              <span className="block">catalogue</span>
            </h1>
          </div>

          {/* Stats strip */}
          <div className="relative z-10 mt-10 flex flex-wrap gap-x-10 gap-y-3">
            {[
              { value: totalSystems.toLocaleString(), label: "confirmed" },
              { value: "4,231", label: "systems" },
              { value: "62", label: "habitable zone" },
              { value: "147", label: "earth-like" },
            ].map(({ value, label }) => (
              <div key={label} className="flex items-baseline gap-2">
                <span className="font-mono text-2xl font-medium tabular-nums">{value}</span>
                <span className="text-xs text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Giant background planet */}
        <div
          className="pointer-events-none absolute"
          style={{
            right: "-50vw",
            top: "50%",
            transform: "translateY(-50%)",
            width: "min(100vw, 1800px)",
            height: "min(100vw, 1800px)",
            opacity: 0.85,
            zIndex: 0,
          }}
        >
          <PlanetCanvas
            type={featured.featured.type}
            seed={featured.featured.seed}
            size={Math.min(typeof window !== "undefined" ? window.innerWidth : 800, 1800)}
            animate={false}
            atmosphere={featured.featured.atmosphere}
            tilt={0.1}
            lightAngle={-0.5}
            style={{ width: "100%", height: "100%" }}
          />
        </div>
      </section>

      {/* ── TOOLBAR ── */}
      <div className="sticky top-[49px] z-40 border-b border-border/40 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-6 py-3">
          {/* Filter chips */}
          <div className="flex flex-wrap gap-2 flex-1">
            <button
              onClick={() => setActiveFilter(null)}
              className={[
                "rounded-full border px-4 py-1.5 text-[13px] transition-colors",
                activeFilter === null
                  ? "border-foreground/30 bg-secondary text-foreground"
                  : "border-border/50 text-muted-foreground hover:text-foreground",
              ].join(" ")}
            >
              All
            </button>
            {FILTER_TAGS.filter((t) => t !== "all").map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveFilter(activeFilter === tag ? null : tag)}
                className={[
                  "rounded-full border px-4 py-1.5 text-[13px] transition-colors",
                  activeFilter === tag
                    ? "border-foreground/30 bg-secondary text-foreground"
                    : "border-border/50 text-muted-foreground hover:text-foreground",
                ].join(" ")}
              >
                {tag}
              </button>
            ))}
          </div>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="ml-auto shrink-0 bg-transparent font-mono text-xs text-muted-foreground focus:outline-none cursor-pointer"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                Sort: {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <main className="mx-auto max-w-7xl px-6 py-10 space-y-10">
        {/* ── FEATURED HERO CARD ── */}
        {showHero && (
          <section>
            <h2 className="mb-4 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Featured system
            </h2>
            <FeaturedCard system={featured} />
          </section>
        )}

        {/* ── SYSTEM GRID ── */}
        <section>
          <h2 className="mb-5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            {activeFilter ? `${activeFilter} · ${gridSystems.length} systems` : `All systems · ${gridSystems.length}`}
          </h2>

          {gridSystems.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
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
      <footer className="border-t border-border/30 px-6 py-8 mt-10">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
          <span className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            EXO·CATALOGUE
          </span>
          <span className="text-xs text-muted-foreground">
            Data: Open Exoplanet Catalogue
          </span>
        </div>
      </footer>
    </div>
  );
}
