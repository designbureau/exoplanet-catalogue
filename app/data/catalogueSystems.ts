import type { PlanetType } from "~/components/PlanetCanvas";

export interface CataloguePlanet {
  type: PlanetType;
  seed: number;
  r: number; // relative radius
  temp: "hot" | "warm" | "cool" | "cold";
}

export interface CatalogueSystem {
  filename: string; // maps to /system/:filename
  slug: string;
  name: string;
  subtitle?: string;
  blurb: string;
  star: { type: string; label: string; color: string };
  distance: string;
  discovered: number | null;
  tags: string[];
  featured: {
    name: string;
    note: string;
    type: PlanetType;
    seed: number;
    atmosphere?: string | null;
  };
  planets: CataloguePlanet[];
}

export const catalogueSystems: CatalogueSystem[] = [
  {
    filename: "TRAPPIST-1",
    slug: "TRAPPIST-1",
    name: "TRAPPIST-1",
    blurb: "Seven Earth-sized rocky worlds orbiting an ultracool red dwarf. Three sit in the habitable zone.",
    star: { type: "M8V", label: "Ultracool red dwarf", color: "#c06644" },
    distance: "40.7 ly",
    discovered: 2017,
    tags: ["habitable zone", "rocky", "multi-planet"],
    featured: { name: "TRAPPIST-1f", note: "Tidally locked ocean-ice eyeball world", type: "eyeball_ice", seed: 771, atmosphere: "rgba(130,190,220,0.18)" },
    planets: [
      { type: "rocky", seed: 11, r: 0.9, temp: "hot" },
      { type: "rocky", seed: 12, r: 0.88, temp: "hot" },
      { type: "rocky_earthlike", seed: 13, r: 0.78, temp: "warm" },
      { type: "rocky_earthlike", seed: 14, r: 0.92, temp: "warm" },
      { type: "eyeball_ice", seed: 771, r: 1.04, temp: "cool" },
      { type: "eyeball_ice", seed: 16, r: 1.12, temp: "cold" },
      { type: "eyeball_ice", seed: 17, r: 0.76, temp: "cold" },
    ],
  },
  {
    filename: "Sun",
    slug: "Sun",
    name: "Solar System",
    blurb: "Our home system. Eight planets from scorching Mercury to icy Neptune.",
    star: { type: "G2V", label: "Yellow dwarf", color: "#ffd58a" },
    distance: "0 ly",
    discovered: null,
    tags: ["home", "rocky", "gas giant"],
    featured: { name: "Earth", note: "Habitable blue marble, our pale reference", type: "rocky_earthlike", seed: 1337, atmosphere: "rgba(120,170,220,0.22)" },
    planets: [
      { type: "rocky", seed: 101, r: 0.38, temp: "hot" },
      { type: "rocky", seed: 102, r: 0.95, temp: "hot" },
      { type: "rocky_earthlike", seed: 1337, r: 1, temp: "warm" },
      { type: "rocky", seed: 104, r: 0.53, temp: "warm" },
      { type: "gas_giant", seed: 105, r: 2.2, temp: "cold" },
      { type: "gas_giant", seed: 106, r: 1.9, temp: "cold" },
      { type: "ice_giant", seed: 107, r: 1.4, temp: "cold" },
      { type: "ice_giant", seed: 108, r: 1.35, temp: "cold" },
    ],
  },
  {
    filename: "Alpha Centauri",
    slug: "Alpha Centauri",
    name: "Alpha Centauri",
    blurb: "The nearest star system to the Sun. Proxima b sits in the habitable zone, just 4.2 light-years away.",
    star: { type: "G2V + K1V + M5.5Ve", label: "Triple system", color: "#ffe0a8" },
    distance: "4.24 ly",
    discovered: 2016,
    tags: ["nearest", "habitable zone", "rocky", "binary"],
    featured: { name: "Proxima b", note: "Nearest potentially habitable world", type: "rocky_earthlike", seed: 422, atmosphere: "rgba(150,190,220,0.14)" },
    planets: [
      { type: "rocky_earthlike", seed: 422, r: 1.07, temp: "warm" },
      { type: "rocky", seed: 423, r: 1.5, temp: "cold" },
    ],
  },
  {
    filename: "51 Peg",
    slug: "51 Peg",
    name: "51 Pegasi",
    blurb: "First exoplanet discovered around a Sun-like star. A hot Jupiter with a 4-day orbit.",
    star: { type: "G2IV", label: "Yellow subgiant", color: "#ffe1a0" },
    distance: "50.4 ly",
    discovered: 1995,
    tags: ["hot jupiter", "historic"],
    featured: { name: "51 Pegasi b", note: "The original hot Jupiter — turbulent, scorched", type: "hot_jupiter", seed: 51, atmosphere: "rgba(230,140,90,0.18)" },
    planets: [
      { type: "hot_jupiter", seed: 51, r: 2.0, temp: "hot" },
    ],
  },
  {
    filename: "Kepler-16",
    slug: "Kepler-16",
    name: "Kepler-16",
    subtitle: "(Tatooine)",
    blurb: "A circumbinary planet orbiting two stars — like Tatooine from Star Wars.",
    star: { type: "K+M", label: "Eclipsing binary", color: "#ffb470" },
    distance: "245 ly",
    discovered: 2011,
    tags: ["binary", "circumbinary"],
    featured: { name: "Kepler-16b", note: "Saturn-mass gas world with two suns", type: "gas_giant", seed: 16, atmosphere: "rgba(210,170,120,0.16)" },
    planets: [
      { type: "gas_giant", seed: 16, r: 1.9, temp: "cool" },
    ],
  },
  {
    filename: "HD 209458",
    slug: "HD 209458",
    name: "HD 209458",
    subtitle: "(Osiris)",
    blurb: "Home to the first transiting exoplanet and the first with a confirmed atmosphere.",
    star: { type: "G0V", label: "Yellow dwarf", color: "#ffe8b2" },
    distance: "159 ly",
    discovered: 1999,
    tags: ["hot jupiter", "historic", "atmosphere"],
    featured: { name: "HD 209458 b", note: "Evaporating hot Jupiter, tail of hydrogen", type: "hot_jupiter", seed: 209, atmosphere: "rgba(220,120,100,0.2)" },
    planets: [
      { type: "hot_jupiter", seed: 209, r: 2.1, temp: "hot" },
    ],
  },
  {
    filename: "Kepler-90",
    slug: "Kepler-90",
    name: "Kepler-90",
    blurb: "An 8-planet system rivalling our Solar System in count. Discovered with AI.",
    star: { type: "G0V", label: "Sun-like", color: "#ffe6a8" },
    distance: "2,790 ly",
    discovered: 2013,
    tags: ["multi-planet", "historic"],
    featured: { name: "Kepler-90h", note: "Outer gas giant, Jupiter analogue", type: "gas_giant", seed: 908, atmosphere: "rgba(200,160,110,0.16)" },
    planets: [
      { type: "rocky", seed: 901, r: 0.9, temp: "hot" },
      { type: "rocky", seed: 902, r: 1.0, temp: "hot" },
      { type: "rocky", seed: 903, r: 1.15, temp: "warm" },
      { type: "rocky_earthlike", seed: 904, r: 1.3, temp: "warm" },
      { type: "rocky_earthlike", seed: 905, r: 1.4, temp: "warm" },
      { type: "ocean", seed: 906, r: 2.0, temp: "cool" },
      { type: "gas_giant", seed: 907, r: 1.8, temp: "cool" },
      { type: "gas_giant", seed: 908, r: 2.1, temp: "cold" },
    ],
  },
  {
    filename: "Kepler-442",
    slug: "Kepler-442",
    name: "Kepler-442",
    blurb: "One of the most Earth-like planets found — rocky, in the habitable zone of a K-type star.",
    star: { type: "K?V", label: "Orange dwarf", color: "#ffb883" },
    distance: "1,206 ly",
    discovered: 2015,
    tags: ["habitable zone", "Earth-like"],
    featured: { name: "Kepler-442 b", note: "High habitability index, super-Earth", type: "rocky_earthlike", seed: 442, atmosphere: "rgba(140,180,210,0.16)" },
    planets: [
      { type: "rocky_earthlike", seed: 442, r: 1.34, temp: "warm" },
    ],
  },
  {
    filename: "HR 8799",
    slug: "HR 8799",
    name: "HR 8799",
    blurb: "Four massive gas giants directly imaged orbiting a young star — a real photograph of a planetary system.",
    star: { type: "F0V", label: "Young F-type", color: "#fff1c0" },
    distance: "133 ly",
    discovered: 2008,
    tags: ["direct imaging", "gas giant", "multi-planet"],
    featured: { name: "HR 8799 e", note: "Young, glowing hot gas giant", type: "hot_jupiter", seed: 8799, atmosphere: "rgba(220,130,80,0.2)" },
    planets: [
      { type: "hot_jupiter", seed: 8799, r: 1.9, temp: "hot" },
      { type: "gas_giant", seed: 8798, r: 2.0, temp: "warm" },
      { type: "gas_giant", seed: 8797, r: 2.1, temp: "cool" },
      { type: "gas_giant", seed: 8796, r: 1.8, temp: "cold" },
    ],
  },
  {
    filename: "55 Cancri",
    slug: "55 Cancri",
    name: "55 Cancri",
    blurb: "Five planets including a super-Earth that may be a carbon world with a diamond interior.",
    star: { type: "K0IV-V", label: "Orange subgiant", color: "#ffb880" },
    distance: "40.9 ly",
    discovered: 2004,
    tags: ["multi-planet", "super-earth", "exotic"],
    featured: { name: "55 Cancri e", note: "Carbon super-Earth, possible diamond crust", type: "carbon", seed: 55, atmosphere: "rgba(180,160,200,0.14)" },
    planets: [
      { type: "carbon", seed: 55, r: 1.9, temp: "hot" },
      { type: "gas_giant", seed: 552, r: 1.5, temp: "warm" },
      { type: "gas_giant", seed: 553, r: 1.4, temp: "cool" },
      { type: "gas_giant", seed: 554, r: 1.2, temp: "cool" },
      { type: "gas_giant", seed: 555, r: 2.1, temp: "cold" },
    ],
  },
  {
    filename: "HD 189733",
    slug: "HD 189733",
    name: "HD 189733",
    blurb: "A hot Jupiter with deep blue colour from silicate rain. Winds over 8,000 km/h.",
    star: { type: "K2V", label: "Orange dwarf", color: "#ffb070" },
    distance: "64.5 ly",
    discovered: 2005,
    tags: ["hot jupiter", "atmosphere", "exotic"],
    featured: { name: "HD 189733 b", note: "Azure hot Jupiter, sideways glass rain", type: "ice_giant", seed: 189, atmosphere: "rgba(80,140,220,0.22)" },
    planets: [
      { type: "ice_giant", seed: 189, r: 2.05, temp: "hot" },
    ],
  },
  {
    filename: "WASP-12",
    slug: "WASP-12",
    name: "WASP-12",
    blurb: "An ultra-hot Jupiter being slowly devoured by its star. One of the darkest planets known.",
    star: { type: "G0V", label: "Yellow dwarf", color: "#fff0c0" },
    distance: "1,410 ly",
    discovered: 2008,
    tags: ["hot jupiter", "exotic"],
    featured: { name: "WASP-12 b", note: "Darker than asphalt — eating starlight", type: "lava", seed: 12, atmosphere: "rgba(240,120,60,0.22)" },
    planets: [
      { type: "lava", seed: 12, r: 2.1, temp: "hot" },
    ],
  },
  {
    filename: "TOI-700",
    slug: "TOI-700",
    name: "TOI-700",
    blurb: "TESS-discovered system with an Earth-sized planet in the habitable zone of a cool M dwarf.",
    star: { type: "M2V", label: "Red dwarf", color: "#d96a48" },
    distance: "101.4 ly",
    discovered: 2020,
    tags: ["habitable zone", "Earth-like", "TESS"],
    featured: { name: "TOI-700 d", note: "Earth-sized temperate world", type: "rocky_earthlike", seed: 700, atmosphere: "rgba(150,190,220,0.15)" },
    planets: [
      { type: "rocky", seed: 7001, r: 0.9, temp: "hot" },
      { type: "rocky", seed: 7002, r: 1.07, temp: "warm" },
      { type: "rocky_earthlike", seed: 700, r: 1.19, temp: "warm" },
      { type: "rocky", seed: 7003, r: 0.95, temp: "cool" },
    ],
  },
  {
    filename: "Kepler-11",
    slug: "Kepler-11",
    name: "Kepler-11",
    blurb: "Six tightly packed low-density planets, including probable water worlds. A benchmark compact system.",
    star: { type: "G6V", label: "Sun-like", color: "#ffe7a8" },
    distance: "2,110 ly",
    discovered: 2011,
    tags: ["water world", "multi-planet", "compact"],
    featured: { name: "Kepler-11 f", note: "Low-density water world", type: "ocean", seed: 11, atmosphere: "rgba(100,170,220,0.2)" },
    planets: [
      { type: "rocky", seed: 1101, r: 1.8, temp: "hot" },
      { type: "ocean", seed: 1102, r: 2.9, temp: "hot" },
      { type: "ocean", seed: 1103, r: 3.1, temp: "warm" },
      { type: "ocean", seed: 1104, r: 4.5, temp: "warm" },
      { type: "ocean", seed: 11, r: 2.6, temp: "cool" },
      { type: "ocean", seed: 1106, r: 3.6, temp: "cool" },
    ],
  },
  {
    filename: "Kepler-186",
    slug: "Kepler-186",
    name: "Kepler-186",
    blurb: "First Earth-sized planet found in the habitable zone of another star.",
    star: { type: "M1V", label: "Red dwarf", color: "#df7352" },
    distance: "579 ly",
    discovered: 2014,
    tags: ["habitable zone", "Earth-like", "historic"],
    featured: { name: "Kepler-186 f", note: "Earth-cousin in M-dwarf habitable zone", type: "rocky_earthlike", seed: 186, atmosphere: "rgba(160,200,220,0.14)" },
    planets: [
      { type: "rocky", seed: 1861, r: 1.07, temp: "hot" },
      { type: "rocky", seed: 1862, r: 1.25, temp: "hot" },
      { type: "rocky", seed: 1863, r: 1.4, temp: "warm" },
      { type: "rocky", seed: 1864, r: 1.27, temp: "warm" },
      { type: "rocky_earthlike", seed: 186, r: 1.17, temp: "cool" },
    ],
  },
  {
    filename: "Gliese 667",
    slug: "Gliese 667",
    name: "Gliese 667 C",
    blurb: "Up to seven planets around a red dwarf, with three potentially in the habitable zone.",
    star: { type: "M1.5V", label: "Red dwarf", color: "#df7a56" },
    distance: "23.6 ly",
    discovered: 2011,
    tags: ["habitable zone", "red dwarf", "multi-planet"],
    featured: { name: "Gliese 667 Cc", note: "Super-Earth in the habitable zone", type: "rocky_earthlike", seed: 667, atmosphere: "rgba(160,200,220,0.15)" },
    planets: [
      { type: "rocky", seed: 6671, r: 1.1, temp: "hot" },
      { type: "rocky_earthlike", seed: 667, r: 1.5, temp: "warm" },
      { type: "rocky_earthlike", seed: 6672, r: 1.8, temp: "warm" },
      { type: "rocky_earthlike", seed: 6673, r: 1.4, temp: "cool" },
      { type: "rocky", seed: 6674, r: 1.0, temp: "cold" },
    ],
  },
  {
    filename: "PSR 1257+12",
    slug: "PSR 1257+12",
    name: "PSR 1257+12",
    blurb: "The very first exoplanets ever confirmed, orbiting a pulsar. Discovered in 1992.",
    star: { type: "Pulsar", label: "Millisecond pulsar", color: "#9ecaff" },
    distance: "2,300 ly",
    discovered: 1992,
    tags: ["pulsar", "historic"],
    featured: { name: "PSR 1257+12 c", note: "Irradiated rock around a neutron star", type: "rocky", seed: 1257, atmosphere: null },
    planets: [
      { type: "rocky", seed: 12571, r: 0.5, temp: "hot" },
      { type: "rocky", seed: 1257, r: 1.1, temp: "hot" },
      { type: "rocky", seed: 12572, r: 1.05, temp: "warm" },
    ],
  },
  {
    filename: "TOI-178",
    slug: "TOI-178",
    name: "TOI-178",
    blurb: "A 6-planet resonant chain with two likely water worlds. A laboratory for planetary formation.",
    star: { type: "K7V", label: "Orange dwarf", color: "#ffa878" },
    distance: "205 ly",
    discovered: 2020,
    tags: ["water world", "multi-planet", "resonant chain"],
    featured: { name: "TOI-178 g", note: "Mini-Neptune in perfect resonant chain", type: "ocean", seed: 178, atmosphere: "rgba(120,180,220,0.2)" },
    planets: [
      { type: "rocky", seed: 1781, r: 1.15, temp: "hot" },
      { type: "rocky", seed: 1782, r: 1.67, temp: "hot" },
      { type: "ocean", seed: 1783, r: 2.57, temp: "warm" },
      { type: "ocean", seed: 1784, r: 2.07, temp: "warm" },
      { type: "ice_giant", seed: 1785, r: 2.87, temp: "cool" },
      { type: "ocean", seed: 178, r: 2.0, temp: "cool" },
    ],
  },
  {
    filename: "Kepler-452",
    slug: "Kepler-452",
    name: "Kepler-452",
    blurb: "Hosts 'Earth's cousin' — a near-Earth-sized planet in the habitable zone of a Sun-like star.",
    star: { type: "G2V", label: "Sun-like", color: "#ffe6aa" },
    distance: "1,400 ly",
    discovered: 2015,
    tags: ["habitable zone", "Earth-like"],
    featured: { name: "Kepler-452 b", note: "Earth's cousin in a Sun-like system", type: "rocky_earthlike", seed: 452, atmosphere: "rgba(140,185,215,0.16)" },
    planets: [
      { type: "rocky_earthlike", seed: 452, r: 1.6, temp: "warm" },
    ],
  },
  {
    filename: "tau Ceti",
    slug: "tau Ceti",
    name: "Tau Ceti",
    blurb: "A nearby Sun-like star with multiple planet candidates. A staple of science fiction.",
    star: { type: "G8.5V", label: "Sun-like", color: "#ffd890" },
    distance: "11.9 ly",
    discovered: 2012,
    tags: ["Sun-like", "nearest", "multi-planet"],
    featured: { name: "Tau Ceti e", note: "Super-Earth in the habitable zone", type: "rocky_earthlike", seed: 8372, atmosphere: "rgba(140,180,210,0.14)" },
    planets: [
      { type: "rocky", seed: 8371, r: 1.5, temp: "hot" },
      { type: "rocky", seed: 8372, r: 1.7, temp: "warm" },
      { type: "rocky_earthlike", seed: 8373, r: 1.8, temp: "warm" },
      { type: "rocky", seed: 8374, r: 1.9, temp: "cool" },
    ],
  },
  {
    filename: "Gliese 581",
    slug: "Gliese 581",
    name: "Gliese 581",
    blurb: "A red dwarf system with multiple planets, including early habitable zone candidates.",
    star: { type: "M3V", label: "Red dwarf", color: "#d96040" },
    distance: "20.3 ly",
    discovered: 2005,
    tags: ["habitable zone", "red dwarf", "multi-planet"],
    featured: { name: "Gliese 581 g", note: "Contested habitable zone super-Earth", type: "rocky_earthlike", seed: 581, atmosphere: "rgba(150,195,220,0.15)" },
    planets: [
      { type: "rocky", seed: 5811, r: 1.0, temp: "hot" },
      { type: "rocky_earthlike", seed: 5812, r: 1.5, temp: "warm" },
      { type: "rocky_earthlike", seed: 581, r: 1.9, temp: "cool" },
      { type: "ocean", seed: 5813, r: 2.1, temp: "cold" },
    ],
  },
];

// Tag values used for toolbar filtering
export const FILTER_TAGS = [
  "all",
  "habitable zone",
  "rocky",
  "gas giant",
  "historic",
  "nearest",
  "exotic",
  "multi-planet",
] as const;

export type FilterTag = (typeof FILTER_TAGS)[number];

export function filterSystems(systems: CatalogueSystem[], tag: FilterTag): CatalogueSystem[] {
  if (tag === "all") return systems;
  if (tag === "gas giant") return systems.filter((s) => s.tags.some((t) => t.includes("gas giant") || t.includes("hot jupiter")));
  return systems.filter((s) => s.tags.includes(tag));
}
