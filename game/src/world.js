// World generation: a seeded chain of islands under a golden sunset,
// a start runway, a destination runway 2.6 km up the coast, and six
// glowing target rings strung between them. One seed rebuilds it all.

import { makeFractalNoise, mulberry32 } from './random.js';

export const SEA_LEVEL = 0;
export const COURSE_LENGTH = 2600; // metres from start runway to destination

function smoothstep(a, b, t) {
  const s = Math.min(1, Math.max(0, (t - a) / (b - a)));
  return s * s * (3 - 2 * s);
}

// A radial island bump: 1 at the centre, 0 past the rim, smooth in between.
function islandBump(x, z, cx, cz, radius, height) {
  const dx = x - cx;
  const dz = z - cz;
  const d = Math.sqrt(dx * dx + dz * dz) / radius;
  if (d >= 1) return 0;
  const s = 1 - d * d;
  return height * s * s * (3 - 2 * s);
}

export function createWorld(seed) {
  const rand = mulberry32(seed);
  const hills = makeFractalNoise(seed + 7, 260);

  // The island chain the course follows, plus side islands for the view.
  const islands = [
    { x: 0, z: -160, r: 420, h: 30 },    // home island (start runway, low to the north)
    { x: -260, z: 620, r: 300, h: 55 },   // west island, low hills
    { x: 330, z: 1050, r: 380, h: 95 },   // east island, the big ridge
    { x: -180, z: 1500, r: 260, h: 42 },
    { x: 120, z: 1950, r: 340, h: 70 },
    { x: 0, z: 2600, r: 460, h: 30 },     // destination island
    { x: -700, z: 900, r: 320, h: 60 },   // far west, scenery only
    { x: 800, z: 1700, r: 300, h: 80 },   // far east, scenery only
    { x: -500, z: 2300, r: 280, h: 48 },
  ];

  // The Sunset Ridge: a long mountain spine east of the course.
  const ridge = { x: 560, z: 1300, length: 1500, height: 150 };

  const startRunway = {
    x: 0, z: 40, heading: 0, length: 320, width: 26, elevation: 8,
    name: 'RIDGE FIELD',
  };
  const destRunway = {
    x: 0, z: COURSE_LENGTH - 40, heading: 0, length: 340, width: 28, elevation: 8,
    name: 'SUNSET BAY',
  };

  function runwayBlend(x, z, runway) {
    const dx = x - runway.x;
    const dz = z - runway.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    return 1 - smoothstep(90, 190, d);
  }

  function height(x, z) {
    let h = 0;
    for (const isl of islands) h += islandBump(x, z, isl.x, isl.z, isl.r, isl.h);
    // Ridge spine: distance to the ridge segment.
    const rz = Math.min(Math.max(z, ridge.z - ridge.length / 2), ridge.z + ridge.length / 2);
    const rdx = x - ridge.x;
    const rdz = z - rz;
    const rd = Math.sqrt(rdx * rdx + rdz * rdz);
    h += ridge.height * Math.max(0, 1 - rd / 320) ** 2;
    // Rolling detail only where land already rises, so the sea stays flat.
    const detail = (hills(x, z) - 0.5) * 26 * smoothstep(2, 18, h);
    h += detail;
    // Flatten the ground under both runways.
    const b1 = runwayBlend(x, z, startRunway);
    const b2 = runwayBlend(x, z, destRunway);
    const b = Math.max(b1, b2);
    const elev = b1 > b2 ? startRunway.elevation : destRunway.elevation;
    return h * (1 - b) + elev * b;
  }

  // Six rings strung along the course, each with a target altitude.
  const ringPlan = [
    { z: 380, x: -60, alt: 55 },
    { z: 820, x: 90, alt: 85 },
    { z: 1240, x: -110, alt: 110 },
    { z: 1660, x: 70, alt: 95 },
    { z: 2060, x: -40, alt: 70 },
    { z: 2380, x: 30, alt: 45 },
  ];
  const rings = ringPlan.map((r, i) => ({
    index: i,
    x: r.x + (rand() - 0.5) * 20,
    y: r.alt,
    z: r.z,
    radius: 26,
    passed: false,
  }));

  // Is a point on (or just past) a runway strip? Used for landing checks.
  function onRunway(x, z, runway) {
    const dx = x - runway.x;
    const dz = z - runway.z;
    const along = Math.abs(dz);
    const across = Math.abs(dx);
    return along <= runway.length / 2 + 30 && across <= runway.width / 2 + 12;
  }

  // Heading (radians, 0 = north = +z, clockwise) of the course at a point.
  function courseHeading(z) {
    return 0;
  }

  return {
    seed,
    height,
    onRunway,
    courseHeading,
    startRunway,
    destRunway,
    rings,
    islands,
    ridge,
  };
}
