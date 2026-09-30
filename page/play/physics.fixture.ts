import type { Engine, PlayWorld } from './types.ts';
import type { Built } from './models.ts';

/** Public-contract test double. Browser tests separately exercise the actual engine worker. */
class Vector {
  x: number;
  y: number;
  z: number;
  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  set(x: number, y: number, z: number) {
    Object.assign(this, { x, y, z });
    return this;
  }
  sub(v: Vector) {
    return this.set(this.x - v.x, this.y - v.y, this.z - v.z);
  }
  length() {
    return Math.hypot(this.x, this.y, this.z);
  }
  normalize() {
    const l = this.length() || 1;
    return this.set(this.x / l, this.y / l, this.z / l);
  }
}
export function physicsFixture() {
  const node = () => {
    let physical: object | null = null;
    return {
      position: new Vector(),
      quaternion: {
        x: 0,
        y: 0,
        z: 0,
        w: 1,
        set(x: number, y: number, z: number, w: number) {
          Object.assign(this, { x, y, z, w });
        },
      },
      add() {},
      remove() {},
      visible: true,
      get physics() {
        return physical;
      },
      set physics(value: object | null) {
        physical = value
          ? { ...value, velocity: new Vector(), asleep: false, applyImpulse() {} }
          : null;
      },
    };
  };
  const requests: {
    options: unknown;
    resolve: (hit: unknown) => void;
    reject: (error: unknown) => void;
  }[] = [];
  const drives: unknown[] = [];
  const vehicle = { speed: 0, drive: (input: unknown) => drives.push({ ...(input as object) }) };
  const engine = {
    geometry: { box() {} },
    material: { meshStandard() {} },
    object: { mesh: node },
    math: {
      vector3: (x: number, y: number, z: number) => new Vector(x, y, z),
      ray: (origin: Vector, direction: Vector) => ({ origin, direction }),
    },
    vehicle: { car: () => vehicle },
  } as unknown as Engine;
  const world = {
    scene: node(),
    physics: { add() {}, remove() {} },
    raycast: (_ray: unknown, options: unknown) =>
      new Promise((resolve, reject) => requests.push({ options, resolve, reject })),
  } as unknown as PlayWorld;
  const built = { root: node(), wheels: [], lamps: [], propeller: null } as unknown as Built;
  return { world, engine, built, requests, drives };
}
export const flushQueries = () => new Promise<void>((resolve) => setImmediate(resolve));
