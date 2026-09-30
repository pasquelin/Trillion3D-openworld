import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { test } from 'node:test';
import { cookKey } from '../../scripts/cook-key.ts';

test('models, atlases, licenses, metadata and fixture logic invalidate the published cook key', async () => {
  await mkdir(resolve(import.meta.dirname, '../../dist'), { recursive: true });
  const directory = await mkdtemp(resolve(import.meta.dirname, '../../dist/key-test-'));
  try {
    execFileSync('git', ['init', '--quiet', directory]);
    await mkdir(resolve(directory, 'assets/buildings'), { recursive: true });
    await mkdir(resolve(directory, 'scripts'));
    const files = [
      'assets/buildings/model.glb',
      'assets/buildings/atlas.png',
      'assets/buildings/LICENSE.txt',
      'assets/buildings/manifest.json',
      'scripts/workload.ts',
    ];
    for (const file of files) await writeFile(resolve(directory, file), 'original');
    let key = cookKey(directory);
    for (const file of files) {
      await writeFile(resolve(directory, file), 'changed');
      const changed = cookKey(directory);
      assert.notEqual(changed, key, file);
      key = changed;
    }
    assert.equal(cookKey(directory), key);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
