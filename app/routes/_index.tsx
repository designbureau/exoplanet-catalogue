import type { MetaFunction } from "react-router";
import { useLoaderData, Link } from "react-router";
import { useState, useMemo } from "react";
import { getXmlFilesList } from "~/utils/getXmlFilesList";
import { featuredSystems } from "~/data/featuredSystems";
import { Input } from "~/components/ui/input";
import { Card, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";

export const meta: MetaFunction = () => {
  return [
    { title: "Exoplanet Explorer" },
    { name: "description", content: "Explore thousands of real exoplanet systems in 3D." },
  ];
};

export const loader = async () => {
  const xmlFiles = await getXmlFilesList();
  const systemNames = xmlFiles.map((f: string) => f.replace(".xml", ""));
  return { systemNames };
};

export default function Index() {
  const { systemNames } = useLoaderData<{ systemNames: string[] }>();
  const [search, setSearch] = useState("");

  const filteredSystems = useMemo(() => {
    if (!search.trim()) return [];
    const query = search.toLowerCase();
    return systemNames
      .filter((name: string) => name.toLowerCase().includes(query))
      .slice(0, 50);
  }, [search, systemNames]);

  const showResults = search.trim().length > 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 px-6 py-8">
        <div className="mx-auto max-w-4xl">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Exoplanet Explorer
          </h1>
          <p className="mt-2 text-muted-foreground">
            {systemNames.length.toLocaleString()} star systems from the Open Exoplanet Catalogue
          </p>

          {/* Search */}
          <div className="relative mt-6">
            <Input
              type="text"
              placeholder="Search for a star system..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-12 text-base"
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* Search Results */}
        {showResults && (
          <section className="mb-10">
            <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
              {filteredSystems.length > 0
                ? `${filteredSystems.length}${filteredSystems.length === 50 ? "+" : ""} results`
                : "No results found"}
            </h2>
            {filteredSystems.length > 0 && (
              <div className="grid gap-1">
                {filteredSystems.map((name: string) => (
                  <Link
                    key={name}
                    to={`/system/${encodeURIComponent(name)}`}
                    className="rounded-md px-3 py-2 text-sm text-foreground transition-colors hover:bg-accent"
                  >
                    {name}
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Featured Systems */}
        {!showResults && (
          <section>
            <h2 className="mb-6 text-sm font-medium uppercase tracking-wider text-muted-foreground">
              Notable systems
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {featuredSystems.map((system) => (
                <Link
                  key={system.filename}
                  to={`/system/${encodeURIComponent(system.filename)}`}
                  className="group"
                >
                  <Card className="h-full transition-colors group-hover:bg-accent/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">{system.name}</CardTitle>
                      <CardDescription className="text-sm leading-relaxed">
                        {system.description}
                      </CardDescription>
                      <div className="flex flex-wrap gap-1.5 pt-2">
                        {system.tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
