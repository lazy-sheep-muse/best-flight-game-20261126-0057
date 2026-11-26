// Seeded randomness: mulberry32 plus smooth value noise for the terrain.
// Everything the world generates comes from one seed, so a ?seed=N URL
// always rebuilds the same islands, rings and runway.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Smooth 2D value noise: a grid of random heights, bilinearly blended
// with a smoothstep so the terrain has soft rolling hills, not spikes.
export function makeNoise2D(seed, cellSize) {
  const rand = mulberry32(seed);
  const grid = new Map();
  const at = (gx, gz) => {
    const key = gx + ',' + gz;
    let v = grid.get(key);
    if (v === undefined) {
      v = rand();
      grid.set(key, v);
    }
    return v;
  };
  const smooth = (t) => t * t * (3 - 2 * t);
  return function noise(x, z) {
    const fx = x / cellSize;
    const fz = z / cellSize;
    const gx = Math.floor(fx);
    const gz = Math.floor(fz);
    const tx = smooth(fx - gx);
    const tz = smooth(fz - gz);
    const a = at(gx, gz);
    const b = at(gx + 1, gz);
    const c = at(gx, gz + 1);
    const d = at(gx + 1, gz + 1);
    const top = a + (b - a) * tx;
    const bot = c + (d - c) * tx;
    return top + (bot - top) * tz;
  };
}

// Fractal noise: a few octaves of value noise stacked for detail.
export function makeFractalNoise(seed, baseCell) {
  const layers = [
    makeNoise2D(seed + 11, baseCell),
    makeNoise2D(seed + 47, baseCell / 2.3),
    makeNoise2D(seed + 101, baseCell / 5.1),
  ];
  const weights = [0.62, 0.26, 0.12];
  return function fractal(x, z) {
    let sum = 0;
    for (let i = 0; i < layers.length; i++) sum += layers[i](x, z) * weights[i];
    return sum;
  };
}
