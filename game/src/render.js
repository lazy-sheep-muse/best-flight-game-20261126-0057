// Renderer: a hand-rolled perspective projector over the heightfield,
// a sunset sky, the chase-view plane sprite, rings, runways and the HUD.
// Canvas 2D only, no libraries. The frame is 1280x480 by design.

import { CANVAS_W, CANVAS_H, COLORS } from './config.js';

const FOCAL = 640; // projection focal length in pixels

// ---- camera math -------------------------------------------------------

// Build an orthonormal camera basis from a look direction.
function cameraBasis(dir) {
  const up = { x: 0, y: 1, z: 0 };
  // right = dir x up
  let rx = dir.z * up.y - dir.y * up.z;
  let ry = dir.x * up.z - dir.z * up.x;
  let rz = dir.y * up.x - dir.x * up.y;
  let rl = Math.hypot(rx, ry, rz) || 1;
  rx /= rl; ry /= rl; rz /= rl;
  // true up = dir x right (right-handed: right, up, -dir is not used here;
  // we want up so that projecting with (right, up, dir) is right-handed)
  const ux = dir.y * rz - dir.z * ry;
  const uy = dir.z * rx - dir.x * rz;
  const uz = dir.x * ry - dir.y * rx;
  return { r: { x: rx, y: ry, z: rz }, u: { x: ux, y: uy, z: uz } };
}

// Rotate a vector around an axis by a small angle (used to bank the camera).
function rollVector(v, axis, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const dot = v.x * axis.x + v.y * axis.y + v.z * axis.z;
  return {
    x: v.x * c + (axis.y * v.z - axis.z * v.y) * s + axis.x * dot * (1 - c),
    y: v.y * c + (axis.z * v.x - axis.x * v.z) * s + axis.y * dot * (1 - c),
    z: v.z * c + (axis.x * v.y - v.y * v.x) * s + axis.z * dot * (1 - c),
  };
}

export function makeCamera(plane, roll) {
  const fx = Math.sin(plane.heading);
  const fz = Math.cos(plane.heading);
  // Chase camera: behind the plane, a little above it, looking ahead.
  const cam = {
    x: plane.x - fx * 15,
    y: plane.y + 4.2,
    z: plane.z - fz * 15,
  };
  const look = {
    x: plane.x + fx * 26 - cam.x,
    y: plane.y + Math.sin(plane.pitch) * 26 + 1.5 - cam.y,
    z: plane.z + fz * 26 - cam.z,
  };
  const ll = Math.hypot(look.x, look.y, look.z) || 1;
  const dir = { x: look.x / ll, y: look.y / ll, z: look.z / ll };
  const basis = cameraBasis(dir);
  // Bank the whole view a touch with the plane so turns feel alive.
  const u = rollVector(basis.u, dir, roll * 0.35);
  const r = rollVector(basis.r, dir, roll * 0.35);
  return { pos: cam, dir, r, u };
}

function project(cam, p) {
  const dx = p.x - cam.pos.x;
  const dy = p.y - cam.pos.y;
  const dz = p.z - cam.pos.z;
  const zc = dx * cam.dir.x + dy * cam.dir.y + dz * cam.dir.z;
  if (zc < 1.5) return null;
  const xc = dx * cam.r.x + dy * cam.r.y + dz * cam.r.z;
  const yc = dx * cam.u.x + dy * cam.u.y + dz * cam.u.z;
  const s = FOCAL / zc;
  return { x: CANVAS_W / 2 + xc * s, y: CANVAS_H / 2 - yc * s, z: zc, s };
}

// Colours are carried as [r, g, b] arrays so lerp and shade compose.
function hexRgb(hex) {
  const p = parseInt(hex.slice(1), 16);
  return [(p >> 16) & 255, (p >> 8) & 255, p & 255];
}

function css(rgb) {
  return `rgb(${rgb[0] | 0},${rgb[1] | 0},${rgb[2] | 0})`;
}

function lerpColor(a, b, t) {
  const ca = hexRgb(a);
  const cb = hexRgb(b);
  return [
    ca[0] + (cb[0] - ca[0]) * t,
    ca[1] + (cb[1] - ca[1]) * t,
    ca[2] + (cb[2] - ca[2]) * t,
  ];
}

function shade(rgb, f) {
  return css([
    Math.min(255, Math.max(0, rgb[0] * f)),
    Math.min(255, Math.max(0, rgb[1] * f)),
    Math.min(255, Math.max(0, rgb[2] * f)),
  ]);
}

// Terrain colour by height, with sunset warmth on west-facing slopes.
function terrainColor(h, slope, sunFace) {
  let base;
  if (h < 1.2) base = hexRgb(COLORS.seaDeep);
  else if (h < 3.5) base = hexRgb(COLORS.sand);
  else if (h < 55) base = lerpColor(COLORS.grassDark, COLORS.grass, Math.min(1, (h - 3.5) / 30));
  else if (h < 110) base = lerpColor(COLORS.grass, COLORS.rock, Math.min(1, (h - 55) / 40));
  else if (h < 150) base = hexRgb(COLORS.rockHigh);
  else base = hexRgb(COLORS.snow);
  const light = 0.72 + slope * 0.28 + sunFace * 0.35;
  return shade(base, light);
}

// ---- sky, sun, sea -----------------------------------------------------

function drawSky(ctx, cam, time) {
  const g = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  g.addColorStop(0, COLORS.skyTop);
  g.addColorStop(0.45, COLORS.skyMid);
  g.addColorStop(0.72, COLORS.skyLow);
  g.addColorStop(1, '#7a4a5e');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // The setting sun, low over the western sea (left of the course).
  const sunX = CANVAS_W * 0.22;
  const sunY = CANVAS_H * 0.52;
  const glow = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 150);
  glow.addColorStop(0, 'rgba(255,220,120,0.95)');
  glow.addColorStop(0.25, 'rgba(255,180,90,0.55)');
  glow.addColorStop(1, 'rgba(255,150,80,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - 160, sunY - 160, 320, 320);
  ctx.fillStyle = COLORS.sunCore;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 26, 0, Math.PI * 2);
  ctx.fill();

  // A few slow clouds, warm-lit from below.
  ctx.fillStyle = 'rgba(255,190,140,0.28)';
  for (let i = 0; i < 5; i++) {
    const cx = ((i * 317 + 90) % 1280);
    const cy = 52 + (i % 3) * 26;
    const drift = ((time * 3 + i * 200) % 1400) - 60;
    const x = (cx + drift) % 1340;
    ctx.beginPath();
    ctx.ellipse(x, cy, 90 + (i % 2) * 40, 9 + (i % 3) * 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---- terrain mesh ------------------------------------------------------

// The heightfield as a strip of quads ahead of the camera, far to near.
// Rows grow farther apart with distance so near ground stays detailed.
function drawTerrain(ctx, cam, world) {
  const ROWS = 22;
  const COLS = 18;
  const HALF_W = 340;
  const dists = [];
  let d = 10;
  for (let i = 0; i <= ROWS; i++) {
    dists.push(d);
    d += 8 + i * 3.2;
  }
  // Grid vertices in world space, with heights sampled once.
  const verts = [];
  const fx = cam.dir.x;
  const fz = cam.dir.z;
  const rx = cam.r.x;
  const rz = cam.r.z;
  for (let i = 0; i <= ROWS; i++) {
    const row = [];
    for (let j = 0; j <= COLS; j++) {
      const lat = -HALF_W + (2 * HALF_W * j) / COLS;
      const wx = cam.pos.x + fx * dists[i] + rx * lat;
      const wz = cam.pos.z + fz * dists[i] + rz * lat;
      const h = world.height(wx, wz);
      row.push({ x: wx, y: h, z: wz });
    }
    verts.push(row);
  }
  // Project all vertices once.
  const proj = verts.map((row) => row.map((v) => project(cam, v)));
  // Paint far rows first.
  for (let i = ROWS - 1; i >= 0; i--) {
    for (let j = 0; j < COLS; j++) {
      const a = proj[i][j];
      const b = proj[i][j + 1];
      const c = proj[i + 1][j + 1];
      const e = proj[i + 1][j];
      if (!a || !b || !c || !e) continue;
      const hAvg = (verts[i][j].y + verts[i][j + 1].y + verts[i + 1][j + 1].y + verts[i + 1][j].y) / 4;
      // Slope from the height drop across the quad, for shading.
      const slope = Math.min(1, Math.abs(verts[i + 1][j].y - verts[i][j].y) / 14);
      // Sun faces west: quads west of the camera catch the light.
      const midX = (verts[i][j].x + verts[i + 1][j + 1].x) / 2;
      const sunFace = Math.max(0, 1 - Math.abs(midX - (cam.pos.x - 260)) / 700);
      if (hAvg < 1.2) {
        // Water: deep blue with a warm sun-glint lane to the west.
        const glint = Math.max(0, 1 - Math.abs(midX - (cam.pos.x - 190)) / 420)
          * Math.max(0, 1 - dists[i] / 900);
        ctx.fillStyle = css(lerpColor(COLORS.seaDeep, COLORS.seaSun, glint * 0.85));
      } else {
        ctx.fillStyle = terrainColor(hAvg, slope, sunFace);
      }
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineTo(c.x, c.y);
      ctx.lineTo(e.x, e.y);
      ctx.closePath();
      ctx.fill();
      // Stroke with the same colour so no background seam shows between quads.
      ctx.lineWidth = 0.75;
      ctx.strokeStyle = ctx.fillStyle;
      ctx.stroke();
    }
  }
}

// ---- runway ------------------------------------------------------------

function drawRunway(ctx, cam, runway, label) {
  const halfL = runway.length / 2;
  const halfW = runway.width / 2;
  // The strip is drawn as a chain of short quads so the part behind the
  // camera is skipped instead of dropping the whole runway.
  ctx.fillStyle = COLORS.runway;
  const STEP = 20;
  for (let t = -halfL; t < halfL; t += STEP) {
    const corners = [
      { x: runway.x - halfW, y: runway.elevation + 0.4, z: runway.z + t },
      { x: runway.x + halfW, y: runway.elevation + 0.4, z: runway.z + t },
      { x: runway.x + halfW, y: runway.elevation + 0.4, z: runway.z + Math.min(halfL, t + STEP) },
      { x: runway.x - halfW, y: runway.elevation + 0.4, z: runway.z + Math.min(halfL, t + STEP) },
    ].map((p) => project(cam, p));
    if (corners.some((p) => !p)) continue;
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < 4; i++) ctx.lineTo(corners[i].x, corners[i].y);
    ctx.closePath();
    ctx.fill();
  }
  // Centreline dashes.
  ctx.strokeStyle = COLORS.runwayMark;
  ctx.lineWidth = 2;
  for (let t = -halfL + 20; t < halfL - 10; t += 40) {
    const p1 = project(cam, { x: runway.x, y: runway.elevation + 0.6, z: runway.z + t });
    const p2 = project(cam, { x: runway.x, y: runway.elevation + 0.6, z: runway.z + t + 20 });
    if (!p1 || !p2) continue;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
  }
  // Edge lights, warm amber.
  ctx.fillStyle = '#ffb347';
  for (let t = -halfL + 10; t <= halfL; t += 40) {
    for (const side of [-halfW, halfW]) {
      const p = project(cam, { x: runway.x + side, y: runway.elevation + 0.8, z: runway.z + t });
      if (!p) continue;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1.2, 2.4 * p.s / 640), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  // Name board at the far threshold.
  const lp = project(cam, { x: runway.x, y: runway.elevation + 14, z: runway.z + halfL });
  if (lp && lp.z < 900) {
    ctx.font = `bold ${Math.max(11, Math.round(16 * lp.s / 640))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,233,168,0.95)';
    ctx.fillText(label, lp.x, lp.y);
  }
}

// ---- target rings ------------------------------------------------------

function drawRing(ctx, cam, ring, isNext, time) {
  const c = project(cam, { x: ring.x, y: ring.y, z: ring.z });
  if (!c) return;
  const r = ring.radius * c.s;
  if (r < 2) return;
  // The ring faces the course; seen at an angle it squashes a little.
  const squash = 0.92;
  const pulse = isNext ? 1 + 0.12 * Math.sin(time * 5) : 1;
  const rr = r * pulse;
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.scale(1, squash);
  ctx.lineWidth = Math.max(2, rr * 0.09);
  ctx.strokeStyle = ring.passed ? 'rgba(120,220,140,0.85)'
    : isNext ? COLORS.ringNext : COLORS.ring;
  ctx.shadowColor = ctx.strokeStyle;
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(0, 0, rr, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.lineWidth = Math.max(1, rr * 0.03);
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(0, 0, rr * 0.88, 0, Math.PI * 2);
  ctx.stroke();
  if (isNext) {
    ctx.fillStyle = COLORS.ringNext;
    ctx.font = `bold ${Math.max(12, Math.round(rr * 0.42))}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(ring.index + 1), 0, 0);
  }
  ctx.restore();
}

// ---- the plane, chase view ---------------------------------------------
// Drawn as a rear three-quarter sprite at screen centre, banking with
// the roll, nose pointing away from the viewer. All canvas paths.

export function drawPlane(ctx, roll, pitch, throttle, time, crashed, yOffset = 0) {
  const cx = CANVAS_W / 2;
  const cy = CANVAS_H * 0.56 + pitch * 90 + yOffset;
  const scale = 1;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-roll * 0.85);
  ctx.scale(scale, scale);
  if (crashed) ctx.globalAlpha = 0.85;

  // Prop blur: faint spinning blades ahead of the nose (top of the sprite).
  const propA = 0.10 + throttle * 0.14;
  ctx.strokeStyle = `rgba(240,240,240,${propA + 0.15})`;
  ctx.lineWidth = 2;
  const blade = time * 40;
  for (let k = 0; k < 2; k++) {
    const a = blade + k * Math.PI;
    ctx.beginPath();
    ctx.moveTo(0, -58);
    ctx.lineTo(Math.cos(a) * 24, -58 + Math.sin(a) * 44);
    ctx.stroke();
  }

  // Wings: broad, light, with red tips.
  ctx.fillStyle = COLORS.planeWing;
  ctx.beginPath();
  ctx.moveTo(-118, -6);
  ctx.quadraticCurveTo(-70, -26, -14, -14);
  ctx.lineTo(14, -14);
  ctx.quadraticCurveTo(70, -26, 118, -6);
  ctx.quadraticCurveTo(70, 4, 14, 2);
  ctx.lineTo(-14, 2);
  ctx.quadraticCurveTo(-70, 4, -118, -6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = COLORS.planeBody;
  ctx.fillRect(-118, -8, 10, 6);
  ctx.fillRect(108, -8, 10, 6);

  // Fuselage: tapered body seen from behind, orange with a cream stripe.
  const body = ctx.createLinearGradient(0, -30, 0, 34);
  body.addColorStop(0, '#f06a3a');
  body.addColorStop(0.55, COLORS.planeBody);
  body.addColorStop(1, '#a32e14');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-16, -46);
  ctx.quadraticCurveTo(-22, -10, -19, 30);
  ctx.quadraticCurveTo(0, 40, 19, 30);
  ctx.quadraticCurveTo(22, -10, 16, -46);
  ctx.quadraticCurveTo(0, -54, -16, -46);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f7f3e2';
  ctx.fillRect(-19, -18, 38, 7);

  // Tail fin and stabiliser.
  ctx.fillStyle = COLORS.planeTrim;
  ctx.beginPath();
  ctx.moveTo(-4, -44);
  ctx.lineTo(0, -78);
  ctx.lineTo(6, -44);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = COLORS.planeWing;
  ctx.beginPath();
  ctx.moveTo(-44, 22);
  ctx.lineTo(44, 22);
  ctx.lineTo(38, 30);
  ctx.lineTo(-38, 30);
  ctx.closePath();
  ctx.fill();

  // Engine exhaust glow and nav lights.
  if (throttle > 0.05 && !crashed) {
    ctx.fillStyle = `rgba(255,170,60,${0.25 + throttle * 0.4})`;
    ctx.beginPath();
    ctx.ellipse(0, 38, 7, 4 + throttle * 5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#ff4d4d';
  ctx.beginPath(); ctx.arc(-118, -6, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#39d353';
  ctx.beginPath(); ctx.arc(118, -6, 3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

// ---- HUD ----------------------------------------------------------------

function hudText(ctx, x, y, label, value, unit) {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(label, x, y);
  ctx.fillStyle = COLORS.hud;
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText(value, x, y + 32);
  if (unit) {
    ctx.fillStyle = COLORS.hudDim;
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(unit, x + ctx.measureText(value).width + 10, y + 32);
  }
}

function drawBar(ctx, x, y, w, h, frac, color, label) {
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
  ctx.strokeStyle = 'rgba(255,233,168,0.7)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w, h);
  ctx.fillStyle = COLORS.hud;
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(label, x, y - 6);
}

export function drawHUD(ctx, state) {
  const p = state.plane;
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 4;
  // Top-left instrument block.
  hudText(ctx, 22, 30, 'ALTITUDE', String(Math.round(p.y * 3.28)), 'FT');
  hudText(ctx, 178, 30, 'SPEED', String(Math.round(p.speed * 1.94)), 'KT');
  const hdg = ((Math.round((p.heading * 180) / Math.PI) % 360) + 360) % 360;
  hudText(ctx, 330, 30, 'HEADING', String(hdg).padStart(3, '0'), '°');

  // Compass strip, top centre.
  const stripY = 26;
  ctx.fillStyle = 'rgba(0,0,0,0.4)';
  ctx.fillRect(CANVAS_W / 2 - 150, stripY - 14, 300, 26);
  ctx.fillStyle = COLORS.hud;
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  for (let off = -60; off <= 60; off += 15) {
    const deg = ((hdg + off) % 360 + 360) % 360;
    const x = CANVAS_W / 2 + off * 2.4;
    const isCard = deg % 90 === 0;
    ctx.fillText(isCard ? ['N', 'E', 'S', 'W'][Math.round(deg / 90) % 4] : String(deg), x, stripY + 4);
  }
  ctx.fillStyle = COLORS.ring;
  ctx.beginPath();
  ctx.moveTo(CANVAS_W / 2, stripY + 12);
  ctx.lineTo(CANVAS_W / 2 - 5, stripY + 4);
  ctx.lineTo(CANVAS_W / 2 + 5, stripY + 4);
  ctx.closePath();
  ctx.fill();

  // Top-right: rings, score, fuel.
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('RINGS', CANVAS_W - 22, 30);
  ctx.fillStyle = COLORS.hud;
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText(`${state.ringsPassed} / ${state.world.rings.length}`, CANVAS_W - 22, 62);
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText('SCORE', CANVAS_W - 22, 92);
  ctx.fillStyle = COLORS.hud;
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText(String(state.score), CANVAS_W - 22, 124);

  drawBar(ctx, CANVAS_W - 222, 158, 200, 12,
    state.plane.fuel / 100, state.plane.fuel < 20 ? '#ff5a3c' : '#ffb347', 'FUEL');
  drawBar(ctx, CANVAS_W - 222, 196, 200, 12,
    1 - state.plane.damage / 100, state.plane.damage > 60 ? '#ff5a3c' : '#7dd87d', 'AIRFRAME');

  // Bottom-left: throttle bar + stall / low-fuel warnings.
  drawBar(ctx, 22, CANVAS_H - 34, 200, 12, state.plane.throttle, '#7df9ff', 'THROTTLE');
  if (state.stalled) {
    ctx.fillStyle = '#ff5a3c';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('STALL — NOSE DOWN, ADD POWER', 250, CANVAS_H - 20);
  } else if (state.plane.fuel < 20 && state.plane.fuel > 0) {
    ctx.fillStyle = '#ffb347';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('LOW FUEL — LAND SOON', 250, CANVAS_H - 20);
  }

  // Centre message line (not over the end screens).
  if (state.message && state.messageT > 0 && state.phase === 'flying') {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    const w = ctx.measureText(state.message).width + 36;
    ctx.fillRect(CANVAS_W / 2 - w / 2, 84, w, 34);
    ctx.fillStyle = COLORS.hud;
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.message, CANVAS_W / 2, 108);
  }

  // Flight-path marker: a small circle where the nose points.
  // Hidden on the end screens, where the plane sprite has moved.
  if (state.phase === 'flying' || state.phase === 'title') {
    ctx.strokeStyle = 'rgba(255,233,168,0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(CANVAS_W / 2, CANVAS_H * 0.56 + p.pitch * 90, 7, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

// ---- title and end screens ----------------------------------------------

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(12,14,38,0.72)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = 'rgba(255,215,94,0.8)';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
}

export function drawTitle(ctx, state) {
  ctx.save();
  ctx.textAlign = 'center';
  panel(ctx, CANVAS_W / 2 - 330, 36, 660, 220);
  ctx.fillStyle = COLORS.ring;
  ctx.font = 'bold 44px sans-serif';
  ctx.fillText('SUNSET RIDGE COURIER', CANVAS_W / 2, 90);
  ctx.fillStyle = COLORS.hud;
  ctx.font = '20px sans-serif';
  ctx.fillText('Fly the mail run up the coast at golden hour.', CANVAS_W / 2, 124);
  ctx.fillText('Thread all six glowing rings, then land at Sunset Bay.', CANVAS_W / 2, 152);
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '16px sans-serif';
  ctx.fillText('← → / A D  bank      ↑ ↓  pitch      W / S  throttle      R  restart', CANVAS_W / 2, 190);
  ctx.fillText('Watch your speed: bank hard and you will sink; fly too slow and you will stall.', CANVAS_W / 2, 216);
  ctx.fillText('Fuel is limited — a hard landing hurts the airframe.', CANVAS_W / 2, 240);
  ctx.fillStyle = COLORS.ringNext;
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('PRESS ENTER OR CLICK TO FLY', CANVAS_W / 2, 440);
  ctx.restore();
}

export function drawEnd(ctx, state) {
  ctx.save();
  ctx.textAlign = 'center';
  const landed = state.phase === 'landed';
  panel(ctx, CANVAS_W / 2 - 300, 84, 600, 240);
  ctx.fillStyle = landed ? '#7dd87d' : '#ff5a3c';
  ctx.font = 'bold 40px sans-serif';
  ctx.fillText(landed ? 'DELIVERED — SAFE LANDING' : state.endTitle, CANVAS_W / 2, 140);
  ctx.fillStyle = COLORS.hud;
  ctx.font = '20px sans-serif';
  ctx.fillText(state.endLine, CANVAS_W / 2, 176);
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText(`SCORE  ${state.score}      RINGS  ${state.ringsPassed} / ${state.world.rings.length}`, CANVAS_W / 2, 220);
  ctx.fillStyle = COLORS.hudDim;
  ctx.font = '16px sans-serif';
  ctx.fillText(`Fuel left ${Math.max(0, Math.round(state.plane.fuel))}%    Airframe ${Math.max(0, Math.round(100 - state.plane.damage))}%`, CANVAS_W / 2, 252);
  ctx.fillStyle = COLORS.ringNext;
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('PRESS R TO FLY AGAIN', CANVAS_W / 2, 292);
  ctx.restore();
}

// ---- smoke for a crash ---------------------------------------------------

export function drawSmoke(ctx, cam, plane, time) {
  const p = project(cam, { x: plane.x, y: plane.y + 6, z: plane.z });
  if (!p) return;
  for (let i = 0; i < 7; i++) {
    const age = ((time * 0.6 + i * 0.35) % 1.8);
    const r = 8 + age * 26;
    const a = Math.max(0, 0.55 - age * 0.28);
    ctx.fillStyle = `rgba(40,36,34,${a})`;
    ctx.beginPath();
    ctx.arc(p.x + Math.sin(i * 2.4) * 14, p.y - age * 46, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ---- frame entry ---------------------------------------------------------

export function renderFrame(ctx, state, time) {
  const plane = state.plane;
  const cam = makeCamera(plane, plane.roll);
  drawSky(ctx, cam, time);
  drawTerrain(ctx, cam, state.world);
  drawRunway(ctx, cam, state.world.startRunway, state.world.startRunway.name);
  drawRunway(ctx, cam, state.world.destRunway, state.world.destRunway.name);
  const next = state.world.rings.find((r) => !r.passed);
  for (const ring of state.world.rings) {
    drawRing(ctx, cam, ring, ring === next, time);
  }
  if (state.phase === 'crashed') drawSmoke(ctx, cam, plane, time);
  if (state.phase !== 'crashed') {
    // On the landing screen the plane drops below the score panel so the
    // aircraft stays in frame instead of hiding behind it.
    const yOffset = state.phase === 'landed' ? 95 : 0;
    drawPlane(ctx, plane.roll, plane.pitch, plane.throttle, time, false, yOffset);
  }
  if (state.phase === 'title') drawTitle(ctx, state);
  if (state.phase === 'landed' || state.phase === 'crashed') drawEnd(ctx, state);
  if (state.phase !== 'title') drawHUD(ctx, state);
}
