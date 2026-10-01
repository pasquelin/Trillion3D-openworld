import type { WorldRuntimeData } from '../../generator/plan/contract.ts';
import type { createPlayer } from './player.ts';
import { safeReturn } from './boundary.ts';
import { cameraReplay } from './replay.ts';
import type { PlayWorld } from './types.ts';

export function traversalControls(
  world: PlayWorld,
  data: WorldRuntimeData,
  player: ReturnType<typeof createPlayer>,
  night: (on: boolean) => void,
) {
  const boundary = safeReturn(data.size, player.position());
  const replay = cameraReplay(world, night);
  return {
    replay,
    observe() {
      const at = player.position(),
        floor = player.floor;
      const grounded =
        player.mode === 'foot'
          ? world.controls.onGround
          : player.mode === 'car'
            ? !player.loading && floor !== null && at[1] - floor < 2
            : (player.flight?.onGround ?? false);
      boundary.observe(at, floor, grounded);
    },
    api: {
      get routes() {
        return data.traversal?.routes ?? [];
      },
      replayRoute(id: string) {
        const route = data.traversal?.routes.find((r) => r.id === id);
        if (route) replay.start(route);
      },
      stopReplay: () => replay.stop(),
      get replayState() {
        return replay.state;
      },
      get returnReason() {
        return boundary.reason;
      },
      returnToGround() {
        replay.stop();
        const safe = boundary.returnToGround();
        if (safe) player.returnToGround(safe);
      },
    },
    dispose() {
      replay.dispose();
      boundary.dispose();
    },
  };
}
