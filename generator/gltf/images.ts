/**
 * The images of a world file (Trillion3D#332): each base colour image a material names, written once as an
 * RGBA8 PNG beside the glTF. Same pixels, same bytes: the encoder has no clock.
 */
import { writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { encode } from 'fast-png';

/** A square RGBA8 image, `size`² texels, top row first. */
export type Image = { size: number; rgba: Uint8Array };

/** Writes every file in `files` from `images` under `directory`; returns the bytes written. */
export async function writeImages(
  directory: string,
  files: readonly string[],
  images: ReadonlyMap<string, Image> = new Map(),
) {
  let bytes = 0;
  for (const file of files) {
    const image = images.get(file);
    if (!image) throw new Error(`a surface names the image "${file}", which the piece lacks`);
    const png = encode({ width: image.size, height: image.size, data: image.rgba, channels: 4 });
    await writeFile(resolve(directory, file), png);
    bytes += png.length;
  }
  return bytes;
}
