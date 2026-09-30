/** Original, licensed glTF source documents; geometry and texture bytes are not converted. */
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import manifest from '../../assets/buildings/manifest.json' with { type: 'json' };

export const BUILDING_ASSETS = manifest;
export const ASSET_ROOT = resolve(import.meta.dirname, '../../assets/buildings');

export type Gltf = {
  asset: { version: string; generator?: string };
  scene: number;
  scenes: { nodes: number[] }[];
  nodes: {
    mesh?: number;
    name?: string;
    translation?: number[];
    scale?: number[];
    rotation?: number[];
  }[];
  meshes: {
    name?: string;
    primitives: {
      attributes: Record<string, number>;
      indices: number;
      material: number;
      mode?: number;
    }[];
  }[];
  accessors: {
    bufferView: number;
    count: number;
    type: string;
    componentType: number;
    byteOffset?: number;
    min?: number[];
    max?: number[];
  }[];
  bufferViews: { buffer: number; byteOffset?: number; byteLength: number; byteStride?: number }[];
  buffers: { uri?: string; byteLength: number }[];
  images?: { uri: string; name?: string; mimeType?: string }[];
  samplers?: object[];
  textures?: { source: number; sampler?: number; name?: string }[];
  materials: {
    name?: string;
    doubleSided?: boolean;
    pbrMetallicRoughness: {
      baseColorTexture?: { index: number; extensions?: object };
      [key: string]: unknown;
    };
  }[];
  extensionsUsed?: string[];
};

export async function assetSource(asset: (typeof manifest)[number]) {
  const bytes = await readFile(resolve(ASSET_ROOT, asset.file));
  if (!asset.file.endsWith('.glb'))
    return { gltf: JSON.parse(bytes.toString()) as Gltf, binary: undefined };
  if (bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2)
    throw new Error('Expected glTF 2 GLB');
  const jsonLength = bytes.readUInt32LE(12),
    binaryOffset = 20 + jsonLength;
  if (bytes.readUInt32LE(16) !== 0x4e4f534a || bytes.readUInt32LE(binaryOffset + 4) !== 0x004e4942)
    throw new Error('Expected JSON and BIN chunks');
  return {
    gltf: JSON.parse(bytes.subarray(20, binaryOffset).toString()) as Gltf,
    binary: bytes.subarray(binaryOffset + 8),
  };
}
