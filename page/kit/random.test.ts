import assert from 'node:assert/strict';
import test from 'node:test';
import { hash, mulberry32, noise1 } from './random.ts';

// The first values each generator gave before it moved into this module, read on the code the
// scenes were laid out with: a change here moves pebbles, clouds, traffic or the temple's stones.
const five = (next: () => number) => Array.from({ length: 5 }, next);
const indices = [0, 1, 2, 3, 4];

test('the open world keeps its sequence', () => {
  assert.deepEqual(
    five(mulberry32(332)),
    [
      0.7368519869633019, 0.427600473864004, 0.39559578825719655, 0.38008124101907015,
      0.29980341834016144,
    ],
  );
});

test('the sky keeps its hash and its noise', () => {
  assert.deepEqual(
    indices.map((i) => hash(9, i)),
    [
      0.43538738205097616, 0.666214189492166, 0.021088937763124704, 0.14823711104691029,
      0.5386811678763479,
    ],
  );
  assert.deepEqual(
    [0, 0.5, 1.25, 2.75, 4.1].map((x) => noise1(5, x)),
    [
      -0.2746611814945936, -0.49168447009287775, -0.7264938205626095, -0.3273838946042815,
      -0.3574482711963355,
    ],
  );
});
