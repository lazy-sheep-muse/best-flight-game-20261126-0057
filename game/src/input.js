// Keyboard input: one shared state object, edge-triggered "pressed" flags
// for menu keys, held flags for the flight controls.

export function createInput() {
  const held = new Set();
  const pressed = new Set();

  // Keys the game cares about (also blocks page scroll on arrows/space).
  const GAME_KEYS = new Set([
    'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
    'KeyA', 'KeyD', 'KeyW', 'KeyS',
    'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight',
    'KeyR', 'Enter', 'Space', 'KeyM',
  ]);

  function onKeyDown(e) {
    if (!GAME_KEYS.has(e.code)) return;
    e.preventDefault();
    if (!e.repeat) pressed.add(e.code);
    held.add(e.code);
  }

  function onKeyUp(e) {
    held.delete(e.code);
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  return {
    // Flight controls (held).
    rollLeft: () => held.has('ArrowLeft') || held.has('KeyA'),
    rollRight: () => held.has('ArrowRight') || held.has('KeyD'),
    pitchUp: () => held.has('ArrowUp'),
    pitchDown: () => held.has('ArrowDown'),
    throttleUp: () => held.has('KeyW') || held.has('ShiftLeft') || held.has('ShiftRight'),
    throttleDown: () => held.has('KeyS') || held.has('ControlLeft') || held.has('ControlRight'),
    // Edge-triggered keys: true once per physical press, then consumed.
    wasPressed(code) {
      if (pressed.has(code)) {
        pressed.delete(code);
        return true;
      }
      return false;
    },
    // Drop the edge queue (used when changing game state).
    clearPressed() {
      pressed.clear();
    },
    // Mouse click anywhere counts as "start" on the title screen.
    clickStart: false,
  };
}
