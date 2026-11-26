// Sunset Ridge Courier — main loop, flight model and game states.
// A small prop plane flies the mail run up a sunset coast: thread six
// glowing rings, then put it down gently on the runway at Sunset Bay.

import { CANVAS_W, CANVAS_H, PHYSICS, SCORE } from './config.js';
import { createWorld } from './world.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { renderFrame } from './render.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') || 1);
const shot = params.get('shot');

const world = createWorld(seed);
const input = createInput();
const audio = createAudio();

function freshPlane() {
  const r = world.startRunway;
  return {
    x: r.x,
    y: r.elevation + 1.6,
    z: r.z - 100,
    heading: 0,
    pitch: 0,
    roll: 0,
    speed: 0,
    throttle: 0,
    fuel: 100,
    damage: 0,
    airborne: false,
    takeoffGrace: 0, // seconds after lift-off during which the ground check is skipped
    vspeed: 0,
  };
}

const state = {
  world,
  plane: freshPlane(),
  phase: 'title', // title | flying | landed | crashed
  score: 0,
  ringsPassed: 0,
  stalled: false,
  message: '',
  messageT: 0,
  endTitle: '',
  endLine: '',
  frozen: false,
  animTime: 0,
  time: 0,
};

function reset() {
  for (const ring of world.rings) ring.passed = false;
  state.plane = freshPlane();
  state.score = 0;
  state.ringsPassed = 0;
  state.stalled = false;
  state.message = '';
  state.messageT = 0;
  state.phase = 'title';
  state.frozen = false;
  input.clearPressed();
  setStatus('Sunset Ridge Courier. Press Enter to fly.');
}

function setStatus(text) {
  if (statusEl) statusEl.textContent = text;
}

function showMessage(text, seconds = 2.6) {
  state.message = text;
  state.messageT = seconds;
}

// ---- flight model -------------------------------------------------------

function stepFlight(dt) {
  const p = state.plane;
  const bank = Math.abs(p.roll);

  // Throttle.
  if (input.throttleUp()) p.throttle = Math.min(1, p.throttle + dt * 0.7);
  if (input.throttleDown()) p.throttle = Math.max(0, p.throttle - dt * 0.9);

  // Roll and pitch inputs (mushy when stalled).
  const control = state.stalled ? 0.45 : 1;
  if (input.rollLeft()) p.roll = Math.max(-PHYSICS.maxBank, p.roll - PHYSICS.bankRate * control * dt);
  else if (input.rollRight()) p.roll = Math.min(PHYSICS.maxBank, p.roll + PHYSICS.bankRate * control * dt);
  else p.roll *= Math.max(0, 1 - dt * 2.2); // wings level themselves
  if (input.pitchUp()) p.pitch = Math.min(PHYSICS.maxPitch, p.pitch + PHYSICS.pitchRate * control * dt);
  else if (input.pitchDown()) p.pitch = Math.max(-PHYSICS.maxPitch, p.pitch - PHYSICS.pitchRate * control * dt);
  else p.pitch *= Math.max(0, 1 - dt * 1.6);

  // Speed: engine pushes toward a throttle target, drag pulls back.
  const target = p.throttle * PHYSICS.maxSpeed;
  const engineOut = p.fuel <= 0;
  const accel = engineOut ? 0 : (target - p.speed) * 0.35;
  p.speed += (accel - PHYSICS.drag * p.speed * Math.abs(p.speed) * 0.02) * dt;
  // A hard bank costs speed and altitude — the discipline of the game.
  p.speed -= bank * bank * 6 * dt;
  if (p.speed < 0) p.speed = 0;

  // Stall: below stall speed the nose drops and the plane sinks.
  state.stalled = p.airborne && p.speed < PHYSICS.stallSpeed;
  if (state.stalled) {
    p.pitch = Math.max(-0.35, p.pitch - PHYSICS.gravitySink * 0.12 * dt);
  }

  // Heading follows the bank.
  p.heading += Math.sin(p.roll) * PHYSICS.turnRate * (0.4 + p.speed / PHYSICS.maxSpeed) * dt;

  // Vertical speed: pitch and throttle lift, stall and steep banks sink.
  let vs = Math.sin(p.pitch) * PHYSICS.climbRate * (0.5 + p.speed / PHYSICS.cruiseSpeed);
  vs -= bank * bank * PHYSICS.sinkRate * 0.55;
  if (state.stalled) vs -= PHYSICS.gravitySink;
  if (!p.airborne) vs = 0;
  p.vspeed = vs;

  // Move.
  const fx = Math.sin(p.heading);
  const fz = Math.cos(p.heading);
  p.x += fx * p.speed * dt;
  p.z += fz * p.speed * dt;
  p.y += vs * dt;

  // Takeoff: rolling fast enough on the runway lifts off.
  if (!p.airborne) {
    const onGround = world.onRunway(p.x, p.z, world.startRunway)
      || world.onRunway(p.x, p.z, world.destRunway);
    const groundY = world.height(p.x, p.z) + 1.6;
    if (onGround && p.speed >= PHYSICS.takeoffSpeed && p.pitch > 0.05) {
      p.airborne = true;
      p.takeoffGrace = 0.4; // clear of the runway before the ground check runs
      showMessage('AIRBORNE — GEAR UP, FLY THE RINGS');
      setStatus('Airborne. Fly through the glowing rings.');
    } else {
      p.y = groundY;
    }
  }

  // Fuel burn, heavier at high throttle.
  const burn = PHYSICS.fuelIdleBurn + (PHYSICS.fuelBurn - PHYSICS.fuelIdleBurn) * p.throttle;
  p.fuel = Math.max(0, p.fuel - burn * dt);
  if (p.fuel <= 0 && !engineOut) {
    showMessage('FUEL EMPTY — GLIDE TO A RUNWAY', 4);
    setStatus('Fuel empty. Glide to a runway.');
  }

  // Rings: fly through the centre of the next ring.
  const next = world.rings.find((r) => !r.passed);
  if (next) {
    const dx = p.x - next.x;
    const dy = p.y - next.y;
    const dz = p.z - next.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    if (dist < next.radius + 6) {
      next.passed = true;
      state.ringsPassed++;
      const bonus = p.speed > 45 ? SCORE.ringTimeBonus : 0;
      state.score += SCORE.ring + bonus;
      audio.ringChime();
      showMessage(`RING ${next.index + 1} / ${world.rings.length}  +${SCORE.ring + bonus}`);
      setStatus(`Ring ${next.index + 1} of ${world.rings.length}.`);
    }
  }

  // Ground contact: landing or crash. Skipped briefly after lift-off so
  // the take-off frame itself (y == ground + 1.6) never counts as a landing.
  if (p.takeoffGrace > 0) p.takeoffGrace -= dt;
  const ground = world.height(p.x, p.z);
  if (p.airborne && p.takeoffGrace <= 0 && p.y <= ground + 1.6) {
    p.y = ground + 1.6;
    const runway = world.onRunway(p.x, p.z, world.startRunway) ? world.startRunway
      : world.onRunway(p.x, p.z, world.destRunway) ? world.destRunway : null;
    // A runway landing only counts on the prepared strip itself: if the
    // ground under the wheels is well above the runway elevation, this is
    // a hillside, not a runway, and it ends the flight.
    const onStrip = runway && Math.abs(ground - runway.elevation) < 5;
    const aligned = onStrip && Math.abs(p.heading - runway.heading) < 0.35;
    const gentle = Math.abs(p.vspeed) < 4.5 && p.speed < 62;
    if (onStrip && aligned && gentle && p.speed > 18) {
      land(runway);
    } else if (onStrip && aligned && Math.abs(p.vspeed) < 8 && p.speed < 70) {
      // Hard landing on a runway: damage, bounce back up, keep flying.
      p.damage += SCORE.damageHardLanding;
      p.airborne = false;
      p.speed *= 0.45;
      p.vspeed = 0;
      audio.thud();
      showMessage('HARD LANDING — AIRFRAME DAMAGED', 3);
      if (p.damage >= 100) crash('The airframe gave out.');
    } else {
      crash(ground > 25 ? 'You flew into the ridge.' : 'You hit the ground.');
    }
  }

  // Damage from a stall into the sea is still a crash; water counts as ground.
  if (p.damage >= 100 && state.phase === 'flying') {
    crash('The airframe gave out.');
  }

  // Engine sound follows throttle and speed.
  audio.setEngine(p.throttle, p.speed / PHYSICS.maxSpeed, p.airborne || p.speed > 2);
}

function land(runway) {
  const p = state.plane;
  p.airborne = false;
  p.speed *= 0.35;
  p.pitch = 0;
  p.roll = 0;
  state.phase = 'landed';
  const soft = Math.abs(p.vspeed) < 2;
  state.score += SCORE.landing + (soft ? SCORE.softLandingBonus : 0);
  state.endTitle = 'DELIVERED — SAFE LANDING';
  state.endLine = runway === world.destRunway
    ? `All ${state.ringsPassed} rings threaded. The mail is on the ground at Sunset Bay.`
    : 'You put it down back at Ridge Field.';
  audio.thud();
  setStatus(`Landed. Score ${state.score}. Press R to fly again.`);
}

function crash(reason) {
  const p = state.plane;
  state.phase = 'crashed';
  p.damage = 100;
  p.speed = 0;
  state.endTitle = 'CRASHED';
  state.endLine = reason + ' Try again — press R.';
  p.throttle = 0;
  audio.crashSound();
  audio.setEngine(0, 0, false);
  setStatus(`Crashed. ${reason} Press R to fly again.`);
}

// ---- frame loop ---------------------------------------------------------

function resize() {
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
}

let last = performance.now();

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  state.time += dt;

  if (input.wasPressed('KeyM')) {
    const muted = audio.toggleMute();
    showMessage(muted ? 'SOUND OFF' : 'SOUND ON', 1.2);
  }

  if (state.phase === 'title') {
    if (input.wasPressed('Enter') || input.wasPressed('Space') || input.clickStart) {
      input.clickStart = false;
      audio.unlock();
      state.phase = 'flying';
      showMessage('FULL THROTTLE — HOLD W TO CLIMB OUT', 3);
      setStatus('Flying. Hold W for throttle, Up to climb.');
    }
  } else if (state.phase === 'flying') {
    if (!state.frozen) stepFlight(dt);
  } else if (input.wasPressed('KeyR')) {
    reset();
  }

  if (input.wasPressed('KeyR') && state.phase === 'flying') reset();

  if (state.messageT > 0) state.messageT -= dt;

  const animT = state.frozen ? state.animTime : state.time;
  renderFrame(ctx, state, animT);
  requestAnimationFrame(frame);
}

canvas.addEventListener('pointerdown', () => {
  input.clickStart = true;
  audio.unlock();
});

resize();
window.addEventListener('resize', resize);

if (shot) {
  applyShot(state, shot, seed);
  audio.unlock();
  setStatus(`Sunset Ridge Courier — shot ${shot}.`);
} else {
  setStatus('Sunset Ridge Courier. Press Enter to fly.');
}

requestAnimationFrame(frame);

// Exposed for automated play-testing: the page's own state, read-only.
window.__game = {
  state: () => ({
    phase: state.phase,
    score: state.score,
    ringsPassed: state.ringsPassed,
    speed: state.plane.speed,
    altitude: state.plane.y,
    heading: state.plane.heading,
    fuel: state.plane.fuel,
    damage: state.plane.damage,
  }),
};
