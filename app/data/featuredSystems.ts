export interface FeaturedSystem {
  filename: string;
  name: string;
  description: string;
  tags: string[];
}

export const featuredSystems: FeaturedSystem[] = [
  {
    filename: "Sun",
    name: "Solar System",
    description: "Our home system. 8 planets from scorching Mercury to icy Neptune.",
    tags: ["home", "rocky", "gas giant"],
  },
  {
    filename: "TRAPPIST-1",
    name: "TRAPPIST-1",
    description: "7 Earth-sized rocky planets orbiting an ultracool red dwarf. 3 in the habitable zone.",
    tags: ["habitable zone", "rocky", "multi-planet"],
  },
  {
    filename: "Kepler-16",
    name: "Kepler-16 (Tatooine)",
    description: "A circumbinary planet orbiting two stars, like Tatooine from Star Wars.",
    tags: ["binary", "circumbinary"],
  },
  {
    filename: "51 Peg",
    name: "51 Pegasi",
    description: "The first exoplanet discovered around a Sun-like star. A hot Jupiter with a 4-day orbit.",
    tags: ["hot jupiter", "historic"],
  },
  {
    filename: "Alpha Centauri",
    name: "Alpha Centauri",
    description: "The nearest star system to the Sun, including Proxima Centauri with a rocky planet in its habitable zone, just 4.2 light-years away.",
    tags: ["nearest", "habitable zone", "rocky", "binary"],
  },
  {
    filename: "Alpha Centauri",
    name: "Alpha Centauri",
    description: "Our nearest stellar neighbours. A binary star system 4.37 light-years from Earth.",
    tags: ["binary", "nearest"],
  },
  {
    filename: "HD 209458",
    name: "HD 209458 (Osiris)",
    description: "Home to the first transiting exoplanet ever detected and the first with a confirmed atmosphere.",
    tags: ["hot jupiter", "historic", "atmosphere"],
  },
  {
    filename: "Kepler-90",
    name: "Kepler-90",
    description: "An 8-planet system rivalling our own Solar System in count. Discovered with help from AI.",
    tags: ["multi-planet", "historic"],
  },
  {
    filename: "Kepler-442",
    name: "Kepler-442",
    description: "Hosts one of the most Earth-like planets found: a rocky world in the habitable zone of a K-type star.",
    tags: ["habitable zone", "Earth-like"],
  },
  {
    filename: "Kepler-186",
    name: "Kepler-186",
    description: "First Earth-sized planet found in the habitable zone of another star.",
    tags: ["habitable zone", "Earth-like", "historic"],
  },
  {
    filename: "HR 8799",
    name: "HR 8799",
    description: "4 massive gas giants directly imaged orbiting a young star. A planetary system seen in real photos.",
    tags: ["direct imaging", "gas giant", "multi-planet"],
  },
  {
    filename: "55 Cancri",
    name: "55 Cancri",
    description: "5 planets including a super-Earth that may be a carbon world with a diamond interior.",
    tags: ["multi-planet", "super-earth", "exotic"],
  },
  {
    filename: "Gliese 581",
    name: "Gliese 581",
    description: "A red dwarf system with multiple planets, including early habitable zone candidates.",
    tags: ["habitable zone", "red dwarf", "multi-planet"],
  },
  {
    filename: "Gliese 667",
    name: "Gliese 667 C",
    description: "Up to 7 planets around a red dwarf, with 3 potentially in the habitable zone.",
    tags: ["habitable zone", "red dwarf", "multi-planet"],
  },
  {
    filename: "PSR 1257+12",
    name: "PSR 1257+12",
    description: "The very first exoplanets ever confirmed, orbiting a pulsar. Discovered in 1992.",
    tags: ["pulsar", "historic"],
  },
  {
    filename: "HD 189733",
    name: "HD 189733",
    description: "A hot Jupiter with deep blue colour from silicate rain. Winds over 8,000 km/h.",
    tags: ["hot jupiter", "atmosphere", "exotic"],
  },
  {
    filename: "WASP-12",
    name: "WASP-12",
    description: "An ultra-hot Jupiter being slowly devoured by its star. One of the darkest planets known.",
    tags: ["hot jupiter", "exotic"],
  },
  {
    filename: "TOI-700",
    name: "TOI-700",
    description: "TESS-discovered system with an Earth-sized planet in the habitable zone of a cool M dwarf.",
    tags: ["habitable zone", "Earth-like", "TESS"],
  },
  {
    filename: "Kepler-452",
    name: "Kepler-452",
    description: "Hosts 'Earth's cousin' - a near-Earth-sized planet in the habitable zone of a Sun-like star.",
    tags: ["habitable zone", "Earth-like"],
  },
  {
    filename: "tau Ceti",
    name: "Tau Ceti",
    description: "A nearby Sun-like star with multiple planet candidates. A staple of science fiction.",
    tags: ["Sun-like", "nearest", "multi-planet"],
  },
];
