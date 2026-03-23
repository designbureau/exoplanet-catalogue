export interface ConstellationStar {
  name: string;
  bayer: string;
  ra: number;    // decimal hours
  dec: number;   // decimal degrees
  distance: number; // parsecs
}

export interface Constellation {
  name: string;
  stars: ConstellationStar[];
  connections: [number, number][];
}

export const ZODIAC_CONSTELLATIONS: Record<string, Constellation> = {
  aries: {
    name: "Aries",
    stars: [
      { name: "Hamal",     bayer: "α Ari", ra: 2.1195,  dec: 23.4628,  distance: 20.2  },
      { name: "Sheratan",   bayer: "β Ari", ra: 1.9107,  dec: 20.8083,  distance: 17.9  },
      { name: "Mesarthim",  bayer: "γ Ari", ra: 1.8922,  dec: 19.2941,  distance: 62.7  },
    ],
    connections: [[0, 1], [1, 2]],
  },
  taurus: {
    name: "Taurus",
    stars: [
      { name: "Aldebaran",  bayer: "α Tau", ra: 4.5987,  dec: 16.5092,  distance: 20.0  },
      { name: "Elnath",      bayer: "β Tau", ra: 5.4382,  dec: 28.6076,  distance: 41.1  },
      { name: "Hyadum I",    bayer: "γ Tau", ra: 4.3299,  dec: 15.6277,  distance: 49.5  },
      { name: "Hyadum II",   bayer: "δ¹ Tau", ra: 4.3822, dec: 17.5426, distance: 47.7  },
      { name: "Ain",          bayer: "ε Tau", ra: 4.4769,  dec: 19.1805,  distance: 45.0  },
      { name: "Tianguan",    bayer: "ζ Tau", ra: 5.6274,  dec: 21.1426,  distance: 136.4 },
    ],
    connections: [[2, 3], [3, 4], [2, 0], [4, 0], [0, 1], [0, 5]],
  },
  gemini: {
    name: "Gemini",
    stars: [
      { name: "Pollux",   bayer: "β Gem", ra: 7.7553,  dec: 28.0263, distance: 10.36 },
      { name: "Castor",   bayer: "α Gem", ra: 7.5767,  dec: 31.8886, distance: 15.60 },
      { name: "Alhena",   bayer: "γ Gem", ra: 6.6285,  dec: 16.3994, distance: 33.5  },
      { name: "Mebsuta",  bayer: "ε Gem", ra: 6.7322,  dec: 25.1312, distance: 259.1 },
      { name: "Tejat",    bayer: "μ Gem", ra: 6.3828,  dec: 22.5135, distance: 71.0  },
      { name: "Propus",   bayer: "η Gem", ra: 6.2479,  dec: 22.5068, distance: 120.0 },
      { name: "Wasat",    bayer: "δ Gem", ra: 7.3356,  dec: 21.9822, distance: 18.5  },
    ],
    connections: [[1, 0], [1, 3], [3, 4], [4, 5], [0, 6], [6, 2]],
  },
  cancer: {
    name: "Cancer",
    stars: [
      { name: "Altarf",            bayer: "β Cnc", ra: 8.2753,  dec: 9.1857,   distance: 93.0  },
      { name: "Asellus Australis", bayer: "δ Cnc", ra: 8.7447,  dec: 18.1543,  distance: 40.0  },
      { name: "Acubens",           bayer: "α Cnc", ra: 8.9748,  dec: 11.8578,  distance: 55.0  },
      { name: "Asellus Borealis",  bayer: "γ Cnc", ra: 8.7214,  dec: 21.4685,  distance: 55.6  },
      { name: "Iota Cancri",       bayer: "ι Cnc", ra: 8.7783,  dec: 28.7600,  distance: 101.5 },
    ],
    connections: [[0, 1], [1, 2], [1, 3], [3, 4]],
  },
  leo: {
    name: "Leo",
    stars: [
      { name: "Regulus",   bayer: "α Leo", ra: 10.1395, dec: 11.9672, distance: 24.3  },
      { name: "Denebola",  bayer: "β Leo", ra: 11.8177, dec: 14.5720, distance: 11.0  },
      { name: "Algieba",   bayer: "γ Leo", ra: 10.3328, dec: 19.8419, distance: 39.9  },
      { name: "Zosma",     bayer: "δ Leo", ra: 11.2351, dec: 20.5237, distance: 17.9  },
      { name: "Chertan",   bayer: "θ Leo", ra: 11.2373, dec: 15.4297, distance: 51.0  },
      { name: "Algenubi",  bayer: "ε Leo", ra: 9.7642,  dec: 23.7743, distance: 75.7  },
      { name: "Adhafera",  bayer: "ζ Leo", ra: 10.2782, dec: 23.4174, distance: 84.0  },
      { name: "Al Jabhah", bayer: "η Leo", ra: 10.1222, dec: 16.7627, distance: 389.0 },
      { name: "Rasalas",   bayer: "μ Leo", ra: 9.8794,  dec: 26.0069, distance: 38.0  },
    ],
    connections: [[5, 8], [8, 6], [6, 2], [2, 7], [7, 0], [0, 5], [3, 1], [1, 4], [4, 3], [2, 3], [0, 4]],
  },
  virgo: {
    name: "Virgo",
    stars: [
      { name: "Spica",        bayer: "α Vir", ra: 13.4199, dec: -11.1613, distance: 77.0  },
      { name: "Zavijava",     bayer: "β Vir", ra: 11.8448, dec: 1.7654,   distance: 10.9  },
      { name: "Porrima",      bayer: "γ Vir", ra: 12.6944, dec: -1.4495,  distance: 11.7  },
      { name: "Minelauva",    bayer: "δ Vir", ra: 12.9269, dec: 3.3975,   distance: 61.0  },
      { name: "Vindemiatrix", bayer: "ε Vir", ra: 13.0363, dec: 10.9592,  distance: 33.6  },
      { name: "Zaniah",       bayer: "η Vir", ra: 12.3319, dec: -0.6667,  distance: 75.0  },
    ],
    connections: [[0, 2], [2, 3], [3, 4], [2, 5], [5, 1]],
  },
  libra: {
    name: "Libra",
    stars: [
      { name: "Zubenelgenubi",  bayer: "α Lib", ra: 14.8448, dec: -15.9971, distance: 23.0  },
      { name: "Zubeneschamali", bayer: "β Lib", ra: 15.2835, dec: -9.3829,  distance: 56.8  },
      { name: "Zubenelhakrabi", bayer: "γ Lib", ra: 15.5921, dec: -14.7896, distance: 50.0  },
      { name: "Brachium",       bayer: "σ Lib", ra: 15.0678, dec: -25.2819, distance: 88.4  },
      { name: "Upsilon Librae", bayer: "υ Lib", ra: 15.6171, dec: -28.1351, distance: 68.6  },
      { name: "Tau Librae",     bayer: "τ Lib", ra: 15.6443, dec: -29.7777, distance: 112.5 },
    ],
    connections: [[0, 1], [0, 3], [1, 2], [3, 4], [4, 5], [2, 4]],
  },
  scorpius: {
    name: "Scorpius",
    stars: [
      { name: "Antares",    bayer: "α Sco", ra: 16.4900, dec: -26.4319, distance: 170.0 },
      { name: "Shaula",     bayer: "λ Sco", ra: 17.5602, dec: -37.1038, distance: 175.0 },
      { name: "Dschubba",   bayer: "δ Sco", ra: 16.0056, dec: -22.6216, distance: 150.6 },
      { name: "Sargas",     bayer: "θ Sco", ra: 17.6220, dec: -42.9978, distance: 92.0  },
      { name: "Acrab",      bayer: "β Sco", ra: 16.0906, dec: -19.8054, distance: 124.0 },
      { name: "Alniyat",    bayer: "σ Sco", ra: 16.3531, dec: -25.5928, distance: 174.0 },
      { name: "Paikauhale", bayer: "τ Sco", ra: 16.5981, dec: -28.2160, distance: 150.0 },
      { name: "Larawag",    bayer: "ε Sco", ra: 16.8362, dec: -34.2926, distance: 20.1  },
      { name: "Xamidimura", bayer: "μ¹ Sco", ra: 16.8645, dec: -38.0473, distance: 150.0 },
      { name: "Eta Scorpii", bayer: "η Sco", ra: 17.2025, dec: -43.2385, distance: 22.0 },
      { name: "Girtab",     bayer: "κ Sco", ra: 17.7081, dec: -39.0299, distance: 142.3 },
      { name: "Lesath",     bayer: "υ Sco", ra: 17.5127, dec: -37.2958, distance: 159.0 },
    ],
    connections: [[4, 2], [2, 5], [5, 0], [0, 6], [6, 7], [7, 8], [8, 9], [9, 3], [3, 10], [10, 1], [1, 11]],
  },
  sagittarius: {
    name: "Sagittarius",
    stars: [
      { name: "Kaus Australis", bayer: "ε Sgr", ra: 18.4029, dec: -34.3846, distance: 44.0  },
      { name: "Nunki",          bayer: "σ Sgr", ra: 18.9211, dec: -26.2967, distance: 70.0  },
      { name: "Ascella",        bayer: "ζ Sgr", ra: 19.0440, dec: -29.8803, distance: 27.0  },
      { name: "Kaus Media",     bayer: "δ Sgr", ra: 18.3499, dec: -29.8280, distance: 107.0 },
      { name: "Kaus Borealis",  bayer: "λ Sgr", ra: 18.4662, dec: -25.4213, distance: 24.0  },
      { name: "Alnasl",         bayer: "γ² Sgr", ra: 18.0968, dec: -30.4236, distance: 29.7 },
      { name: "Nanto",          bayer: "φ Sgr", ra: 18.7609, dec: -26.9908, distance: 73.4  },
      { name: "Tau Sagittarii", bayer: "τ Sgr", ra: 19.1157, dec: -27.6698, distance: 37.0  },
    ],
    connections: [[3, 0], [0, 2], [2, 6], [6, 3], [3, 4], [3, 5], [2, 1], [1, 7]],
  },
  capricornus: {
    name: "Capricornus",
    stars: [
      { name: "Deneb Algedi",     bayer: "δ Cap", ra: 21.7840, dec: -16.1266, distance: 11.9  },
      { name: "Dabih",             bayer: "β Cap", ra: 20.3504, dec: -14.7814, distance: 100.5 },
      { name: "Algedi",            bayer: "α² Cap", ra: 20.3014, dec: -12.5082, distance: 33.4 },
      { name: "Nashira",           bayer: "γ Cap", ra: 21.6681, dec: -16.6622, distance: 42.6  },
      { name: "Zeta Capricorni",   bayer: "ζ Cap", ra: 21.4444, dec: -22.4114, distance: 122.1 },
      { name: "Omega Capricorni",  bayer: "ω Cap", ra: 20.8637, dec: -26.9192, distance: 192.7 },
      { name: "Psi Capricorni",    bayer: "ψ Cap", ra: 20.7689, dec: -25.2706, distance: 14.7  },
    ],
    connections: [[2, 1], [1, 6], [6, 5], [5, 4], [4, 3], [3, 0], [2, 0]],
  },
  aquarius: {
    name: "Aquarius",
    stars: [
      { name: "Sadalsuud",  bayer: "β Aqr", ra: 21.5260, dec: -5.5712,   distance: 167.4 },
      { name: "Sadalmelik", bayer: "α Aqr", ra: 22.0964, dec: -0.3198,   distance: 161.0 },
      { name: "Skat",        bayer: "δ Aqr", ra: 22.9108, dec: -15.8208,  distance: 49.2  },
      { name: "Sadachbia",   bayer: "γ Aqr", ra: 22.3609, dec: -1.3874,   distance: 50.0  },
      { name: "Albali",      bayer: "ε Aqr", ra: 20.7946, dec: -9.4958,   distance: 63.7  },
      { name: "Shatabhisha", bayer: "λ Aqr", ra: 22.8769, dec: -7.5797,   distance: 112.0 },
      { name: "Ancha",       bayer: "θ Aqr", ra: 22.2808, dec: -7.7833,   distance: 57.0  },
    ],
    connections: [[4, 0], [0, 1], [1, 3], [3, 6], [6, 5], [5, 2]],
  },
  pisces: {
    name: "Pisces",
    stars: [
      { name: "Gamma Piscium",  bayer: "γ Psc", ra: 23.2860, dec: 3.2823,   distance: 42.3  },
      { name: "Theta Piscium",  bayer: "θ Psc", ra: 23.4662, dec: 6.3791,   distance: 45.5  },
      { name: "Iota Piscium",   bayer: "ι Psc", ra: 23.6658, dec: 5.6274,   distance: 13.8  },
      { name: "Omega Piscium",  bayer: "ω Psc", ra: 23.9885, dec: 6.8636,   distance: 32.0  },
      { name: "Alrescha",        bayer: "α Psc", ra: 2.0340,  dec: 2.7637,   distance: 42.6  },
      { name: "Alpherg",         bayer: "η Psc", ra: 1.5247,  dec: 15.3458,  distance: 90.2  },
      { name: "Epsilon Piscium", bayer: "ε Psc", ra: 1.0490,  dec: 7.8900,   distance: 58.3  },
    ],
    connections: [[0, 1], [1, 2], [2, 3], [2, 4], [4, 6], [6, 5]],
  },
};
