import type { Play } from './play.ts';

/** Routes and recovery are player actions, kept separate from diagnostic settings. */
export function createTraversalPanel(play: Play, setTime: (night: boolean | null) => void) {
  const panel = document.createElement('div');
  panel.style.cssText =
    'position:fixed;left:12px;top:12px;z-index:10;display:flex;gap:6px;font:14px system-ui';
  const routes = document.createElement('select');
  routes.ariaLabel = 'Island route';
  for (const route of play.routes) {
    const option = document.createElement('option');
    option.value = route.id;
    option.textContent = route.name;
    routes.append(option);
  }
  const button = (name: string, action: () => void) => {
    const node = document.createElement('button');
    node.type = 'button';
    node.textContent = name;
    node.onclick = action;
    return node;
  };
  const start = button('Replay route', () => {
    const route = play.routes.find((r) => r.id === routes.value);
    if (!route) return;
    setTime(route.night);
    play.replayRoute(route.id);
  });
  start.disabled = !play.routes.length;
  const stop = button('Explore', () => {
    play.stopReplay();
    setTime(null);
  });
  const recover = button('Return to land', () => {
    play.returnToGround();
    setTime(null);
  });
  panel.append(routes, start, stop, recover);
  document.body.append(panel);
  return {
    dispose() {
      play.stopReplay();
      setTime(null);
      panel.remove();
    },
  };
}
