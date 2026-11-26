// Sunset Ridge Courier — shared tuning constants.
// Canvas is designed for the 1280x480 screenshot frame.
export const CANVAS_W = 1280;
export const CANVAS_H = 480;

// Flight model (arcade, but with discipline: speed, bank and pitch trade off).
export const PHYSICS = {
  maxSpeed: 78,          // m/s at full throttle, level flight
  cruiseSpeed: 52,       // m/s the plane settles at with ~70% throttle
  stallSpeed: 26,        // m/s — below this the nose drops and controls go mushy
  accel: 14,             // m/s^2 the engine adds at full throttle
  drag: 0.055,           // quadratic-ish drag coefficient
  climbRate: 9.5,        // m/s climb at cruise pitch-up
  sinkRate: 12,          // m/s sink at full pitch-down
  bankRate: 1.9,         // rad/s the roll input drives
  maxBank: 1.05,         // rad — bank past this bleeds speed and altitude fast
  turnRate: 0.55,        // rad/s of heading change at full bank
  pitchRate: 0.85,       // rad/s the pitch input drives
  maxPitch: 0.5,         // rad
  gravitySink: 6,        // m/s^2 extra sink while stalled
  fuelBurn: 0.55,        // % of tank per second at full throttle
  fuelIdleBurn: 0.08,    // % of tank per second at idle
  takeoffSpeed: 30,      // m/s needed to lift off the runway
};

// Scoring.
export const SCORE = {
  ring: 250,
  ringTimeBonus: 100,    // bonus for a clean fast ring pass
  landing: 1000,
  softLandingBonus: 500, // vertical speed under 2 m/s on touchdown
  damageHardLanding: 35, // damage from a hard touchdown
  damageCrash: 100,
};

// Sunset palette — the whole look of the game lives here.
export const COLORS = {
  skyTop: '#2b2a63',
  skyMid: '#c65d7b',
  skyLow: '#f6a45c',
  sunCore: '#fff3c4',
  sunGlow: '#ffcf6e',
  seaDeep: '#1d3a5f',
  seaSun: '#e8965a',
  sand: '#d9b380',
  grass: '#5d7a3a',
  grassDark: '#48632e',
  rock: '#7a6a63',
  rockHigh: '#8d7f78',
  snow: '#e8e2d8',
  runway: '#3a3f4a',
  runwayMark: '#f5f0dc',
  ring: '#ffd75e',
  ringNext: '#7df9ff',
  hud: '#ffe9a8',
  hudDim: '#c9b98a',
  planeBody: '#e8542f',
  planeWing: '#f2f0e4',
  planeTrim: '#1f2a44',
};
