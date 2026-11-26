// Staged scenes for screenshots: ?shot=start|play|lowpass|landing&seed=N
// Each shot freezes the game in one composed, deterministic state so a
// screenshot always catches the same moment. Nothing here is random.

export function applyShot(state, shot, seed) {
  const world = state.world;
  const p = state.plane;
  const runway = world.startRunway;
  const dest = world.destRunway;

  if (shot === 'start') {
    // Parked on the home runway at dusk, title screen up.
    p.x = runway.x;
    p.y = runway.elevation + 1.6;
    p.z = runway.z - 60;
    p.heading = 0;
    p.pitch = 0;
    p.roll = 0;
    p.speed = 0;
    p.throttle = 0;
    state.phase = 'title';
    state.frozen = true;
    state.animTime = 3.2;
    return;
  }

  if (shot === 'play') {
    // Mid-course, threading ring 3, coast and the destination runway ahead.
    // The plane flies slightly left and below the ring centre so the ring
    // and its number stay visible around the aircraft.
    const ring = world.rings[2];
    p.x = ring.x - 30;
    p.y = ring.y + 2;
    p.z = ring.z - 130;
    p.heading = 0.10;
    p.pitch = -0.02;
    p.roll = 0.18;
    p.speed = 56;
    p.throttle = 0.72;
    p.fuel = 78;
    world.rings[0].passed = true;
    world.rings[1].passed = true;
    state.ringsPassed = 2;
    state.score = 500;
    state.phase = 'flying';
    state.frozen = true;
    state.animTime = 5.5;
    state.message = 'RING 2 / 6  +250';
    state.messageT = 99;
    return;
  }

  if (shot === 'lowpass') {
    // Low pass down the destination runway, gear down, throttle up.
    p.x = dest.x + 8;
    p.y = dest.elevation + 26;
    p.z = dest.z - 320;
    p.heading = 0;
    p.pitch = -0.04;
    p.roll = -0.06;
    p.speed = 62;
    p.throttle = 0.85;
    p.fuel = 41;
    world.rings.forEach((r) => { r.passed = true; });
    state.ringsPassed = 6;
    state.score = 1500;
    state.phase = 'flying';
    state.frozen = true;
    state.animTime = 7.1;
    state.message = 'ALL RINGS CLEAR — LAND AT SUNSET BAY';
    state.messageT = 99;
    return;
  }

  if (shot === 'landing') {
    // Parked on the destination runway, delivery complete, score screen up.
    p.x = dest.x;
    p.y = dest.elevation + 1.6;
    p.z = dest.z + 40;
    p.heading = 0;
    p.pitch = 0;
    p.roll = 0;
    p.speed = 0;
    p.throttle = 0;
    p.fuel = 34;
    world.rings.forEach((r) => { r.passed = true; });
    state.ringsPassed = 6;
    state.score = 1500 + 1000 + 500;
    state.phase = 'landed';
    state.endTitle = 'DELIVERED — SAFE LANDING';
    state.endLine = 'All six rings threaded. The mail is on the ground at Sunset Bay.';
    state.frozen = true;
    state.animTime = 9.4;
    return;
  }

// Unknown shot: leave the game alone.
  void seed;
}
