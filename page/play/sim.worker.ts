/**
 * The simulation worker's shell (`runtime/openworldSim.js`): it advances bounded traffic and pedestrians,
 * steps the simulation at a fixed 60 Hz and hands each snapshot back to the page as a
 * transferable buffer. Two buffers go back and forth; when the page still holds both, the step's
 * snapshot is skipped rather than waited for. Everything it steps lives in `sim/`.
 */
import { STEP, type FromWorker, type ToWorker } from './protocol.ts';
import { createSim, step, type Sim } from './sim/core.ts';
import { writeSnapshot } from './sim/snapshot.ts';

const scope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<ToWorker>) => void) | null;
  postMessage(message: FromWorker, transfer?: Transferable[]): void;
};

let sim: Sim | null = null;
const buffers: ArrayBuffer[] = [];
let last = 0;
let owed = 0;

function start(message: Extract<ToWorker, { type: 'start' }>) {
  sim = createSim(message.world, message.limits);
  buffers.push(...message.buffers);
  last = performance.now();
  scope.postMessage({ type: 'ready' });
  tick();
}

/** Steps as many fixed steps as the time since the last tick holds (four at most), then posts. */
function tick() {
  if (!sim) return;
  const now = performance.now();
  owed = Math.min(owed + (now - last) / 1000, 4 * STEP);
  last = now;
  let stepped = false;
  while (owed >= STEP) {
    step(sim, STEP);
    owed -= STEP;
    stepped = true;
  }
  const buffer = stepped ? buffers.pop() : undefined;
  if (buffer) {
    writeSnapshot(sim, new Float32Array(buffer));
    scope.postMessage({ type: 'snapshot', buffer }, [buffer]);
  }
  setTimeout(tick, Math.max(1, (STEP - owed) * 1000));
}

scope.onmessage = (event) => {
  const message = event.data;
  try {
    if (message.type === 'start') start(message);
    else if (message.type === 'buffer') buffers.push(message.buffer);
    else if (sim && message.type === 'focus') sim.focus = message;
  } catch (error) {
    scope.postMessage({ type: 'error', message: String(error) });
  }
};
