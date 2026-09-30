/** Append the two vetted, single-mesh glTF sources to the existing generated source document. */
import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Instance } from '../plan/contract.ts';
import { ASSET_ROOT, BUILDING_ASSETS, assetSource, type Gltf } from './source.ts';

export async function appendBuildings(directory: string, placements: readonly Instance[]) {
  const path = resolve(directory, 'world.gltf'),
    target = JSON.parse(await readFile(path, 'utf8')) as Gltf;
  for (const asset of BUILDING_ASSETS) {
    const { gltf: source, binary } = await assetSource(asset);
    // A narrow assembly contract, not a general glTF converter: fail if upstream shape changes.
    if (source.nodes.length !== 1 || source.nodes[0].mesh !== 0 || source.meshes.length !== 1)
      throw new Error(`Unsupported vetted asset shape: ${asset.id}`);
    if (source.nodes[0].translation || source.nodes[0].scale || source.nodes[0].rotation)
      throw new Error(`Expected the vetted identity node transform: ${asset.id}`);
    const counts = {
      buffer: target.buffers.length,
      view: target.bufferViews.length,
      accessor: target.accessors.length,
      material: target.materials.length,
      mesh: target.meshes.length,
      image: target.images?.length ?? 0,
      texture: target.textures?.length ?? 0,
      sampler: target.samplers?.length ?? 0,
    };
    for (const [i, buffer] of source.buffers.entries()) {
      const uri = `${asset.id}-${i}.bin`;
      if (binary) await writeFile(resolve(directory, uri), binary);
      else
        await copyFile(resolve(ASSET_ROOT, asset.file, '..', buffer.uri!), resolve(directory, uri));
      target.buffers.push({ ...buffer, uri });
    }
    for (const [i, image] of (source.images ?? []).entries()) {
      const uri = `${asset.id}-${i}.png`;
      await copyFile(resolve(ASSET_ROOT, asset.file, '..', image.uri), resolve(directory, uri));
      (target.images ??= []).push({ ...image, uri });
    }
    (target.samplers ??= []).push(...(source.samplers ?? []));
    (target.textures ??= []).push(
      ...(source.textures ?? []).map((t) => ({
        ...t,
        source: t.source + counts.image,
        ...(t.sampler === undefined ? {} : { sampler: t.sampler + counts.sampler }),
      })),
    );
    target.materials.push(
      ...source.materials.map((m) => ({
        ...m,
        name: `${asset.id}/${m.name}`,
        pbrMetallicRoughness: {
          ...m.pbrMetallicRoughness,
          ...(m.pbrMetallicRoughness.baseColorTexture
            ? {
                baseColorTexture: {
                  ...m.pbrMetallicRoughness.baseColorTexture,
                  index: m.pbrMetallicRoughness.baseColorTexture.index + counts.texture,
                },
              }
            : {}),
        },
      })),
    );
    target.bufferViews.push(
      ...source.bufferViews.map((v) => ({ ...v, buffer: v.buffer + counts.buffer })),
    );
    target.accessors.push(
      ...source.accessors.map((a) => ({ ...a, bufferView: a.bufferView + counts.view })),
    );
    target.meshes.push(
      ...source.meshes.map((m) => ({
        ...m,
        name: asset.id,
        primitives: m.primitives.map((p) => ({
          ...p,
          indices: p.indices + counts.accessor,
          material: p.material + counts.material,
          attributes: Object.fromEntries(
            Object.entries(p.attributes).map(([key, value]) => [key, value + counts.accessor]),
          ),
        })),
      })),
    );
    for (const placement of placements.filter((p) => p.prop === asset.id)) {
      const scale = asset.metresPerSourceUnit;
      target.scenes[target.scene].nodes.push(target.nodes.length);
      target.nodes.push({
        name: placement.name,
        mesh: counts.mesh,
        translation: [...placement.position],
        scale: [scale, scale, scale],
        rotation: [0, Math.sin(placement.yaw / 2), 0, Math.cos(placement.yaw / 2)],
      });
    }
    target.extensionsUsed = [
      ...new Set([...(target.extensionsUsed ?? []), ...(source.extensionsUsed ?? [])]),
    ];
  }
  await writeFile(path, JSON.stringify(target));
}
