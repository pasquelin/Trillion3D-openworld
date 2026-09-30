/** Original licensed triangles in metres for gameplay's existing streamed collision sidecars. */
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import type { Instance, PropMesh } from '../plan/contract.ts';
import { solidColliders, type SolidColliders } from '../build/colliders.ts';
import { scaleOf } from '../../page/play/collision.ts';
import { SURFACES } from '../props/surfaces.ts';
import { ASSET_ROOT, BUILDING_ASSETS, assetSource, type Gltf } from './source.ts';

function accessor(gltf: Gltf, buffers: readonly Uint8Array[], index: number) {
  const a = gltf.accessors[index],
    view = gltf.bufferViews[a.bufferView],
    components = a.type === 'VEC3' ? 3 : a.type === 'SCALAR' ? 1 : 0,
    bytes = a.componentType === 5123 ? 2 : 4;
  if (!components || ![5123, 5125, 5126].includes(a.componentType))
    throw new Error('Unsupported vetted building collision accessor');
  const buffer = buffers[view.buffer],
    data = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength),
    offset = (view.byteOffset ?? 0) + (a.byteOffset ?? 0),
    stride = view.byteStride ?? components * bytes;
  return Array.from({ length: a.count * components }, (_, i) => {
    const at = offset + Math.floor(i / components) * stride + (i % components) * bytes;
    return a.componentType === 5126
      ? data.getFloat32(at, true)
      : a.componentType === 5125
        ? data.getUint32(at, true)
        : data.getUint16(at, true);
  });
}

/** Original indexed geometry; never written back into or substituted for the render glTF. */
export async function buildingCollisionMeshes(): Promise<PropMesh[]> {
  return Promise.all(
    BUILDING_ASSETS.map(async (asset) => {
      const { gltf, binary } = await assetSource(asset),
        buffers = binary
          ? [binary]
          : await Promise.all(
              gltf.buffers.map((b) => readFile(resolve(ASSET_ROOT, dirname(asset.file), b.uri!))),
            );
      if (
        gltf.nodes.length !== 1 ||
        gltf.nodes[0].mesh !== 0 ||
        gltf.meshes.length !== 1 ||
        JSON.stringify(gltf.nodes[0].translation ?? [0, 0, 0]) !== '[0,0,0]' ||
        JSON.stringify(gltf.nodes[0].rotation ?? [0, 0, 0, 1]) !== '[0,0,0,1]' ||
        JSON.stringify(gltf.nodes[0].scale ?? [1, 1, 1]) !== '[1,1,1]'
      )
        throw new Error(`Unsupported vetted building node transform: ${asset.id}`);
      const parts = gltf.meshes[0].primitives.map((p) => {
        if (
          (p.mode ?? 4) !== 4 ||
          gltf.accessors[p.attributes.POSITION].componentType !== 5126 ||
          gltf.accessors[p.attributes.POSITION].type !== 'VEC3' ||
          gltf.accessors[p.indices].type !== 'SCALAR' ||
          ![5123, 5125].includes(gltf.accessors[p.indices].componentType)
        )
          throw new Error(`Unsupported vetted building triangle format: ${asset.id}`);
        return {
          surface: SURFACES.concrete,
          positions: Float32Array.from(
            accessor(gltf, buffers, p.attributes.POSITION),
            (n) => n * asset.metresPerSourceUnit,
          ),
          indices: Uint32Array.from(accessor(gltf, buffers, p.indices)),
        };
      });
      return { id: asset.id, parts };
    }),
  );
}

/** Merge the same two original meshes and two foundations into cook and source-probe physics. */
export async function withBuildingColliders(
  base: SolidColliders,
  foundations: readonly PropMesh[],
  instances: readonly Instance[],
): Promise<SolidColliders> {
  const foundation = solidColliders(foundations, instances),
    shapes = new Map([...base.shapes, ...foundation.shapes]),
    assets = await buildingCollisionMeshes();
  for (const mesh of assets) {
    const positions: number[] = [],
      indices: number[] = [];
    for (const part of mesh.parts) {
      const offset = positions.length / 3;
      positions.push(...part.positions);
      indices.push(...part.indices.map((i) => i + offset));
    }
    shapes.set(mesh.id, {
      positions: Float32Array.from(positions),
      indices: Uint32Array.from(indices),
    });
  }
  const ids = new Set(assets.map((a) => a.id)),
    placed = instances
      .filter((i) => ids.has(i.prop))
      .map(({ prop, position, yaw, scale }) => ({ prop, position, yaw, scale: scaleOf(scale) }));
  return { shapes, placed: [...base.placed, ...foundation.placed, ...placed] };
}
