import { firstHit } from './controller.js';
import { BUS_EVENTS } from '../contracts.js';

// Which device, if any, the player may interact with (vision §3.1): within INTERACT_RANGE on the
// ground plane, facing it, nothing solid in between, and the quest in one of the device's states.
// Emits `ui:prompt` only when the focused device changes, never per frame.
export const INTERACT_RANGE = 2.5;
const FACING_DOT = 0.5; // within ±60° of the player's heading

export function createInteractions({ anchors, colliders, bus, quest }) {
  let focus = null;
  const list = Object.values(anchors);

  function evaluate(pos, heading) {
    const fx = -Math.sin(heading);
    const fz = -Math.cos(heading);
    let best = null;
    let bestD = Infinity;
    for (const a of list) {
      if (!a.requiredQuest.includes(quest.state)) continue;
      const dx = a.position.x - pos.x;
      const dz = a.position.z - pos.z;
      const d = Math.hypot(dx, dz);
      if (d >= INTERACT_RANGE || d >= bestD) continue;
      if (d > 0.05 && (dx * fx + dz * fz) / d < FACING_DOT) continue;
      if (firstHit(colliders, pos.x, pos.z, a.position.x, a.position.z, { ignore: a.id }) !== Infinity) continue;
      best = a;
      bestD = d;
    }
    return best;
  }

  function setFocus(next) {
    if (next === focus) return;
    focus = next;
    bus.emit('ui:prompt', focus ? { id: focus.id, label: focus.label, key: 'E' } : null);
  }

  return {
    get focus() { return focus; },
    evaluate,
    update(pos, heading) { setFocus(evaluate(pos, heading)); },
    clear() { setFocus(null); },
    // Advance the quest if this device's action is valid now, then ask the UI to open its terminal.
    interact() {
      if (!focus) return false;
      const { id, action } = focus;
      if (action && quest.can(action, 'interactable')) quest.send(action, 'interactable');
      bus.emit(BUS_EVENTS.OPEN_TERMINAL, { id });
      return true;
    },
  };
}
