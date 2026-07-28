import * as THREE from 'three';
import { getComponentMeta, type ComponentCategory, type ComponentType } from '@sdq/shared';
import { SDQ_COLORS } from '../theme/tokens';
import {
  findPrimaryMesh,
  loadComponentModel,
  tintObjectWithColor,
  type GltfLoadFn,
} from './asset-loader';

export const CATEGORY_COLORS: Record<ComponentCategory, number> = {
  client: 0x60a5fa,
  edge: 0x34d399,
  traffic: 0xfbbf24,
  compute: 0xa78bfa,
  data: 0xf87171,
  messaging: 0xfb923c,
  observability: 0x94a3b8,
  security: 0xe879f9,
};

const BASE_HEIGHT = 0.4;
const LABEL_OFFSET_Y = 1.1;

export type MeshSource = 'primitive' | 'glb';

export interface ComponentInstanceObject {
  id: string;
  type: ComponentType;
  label: string;
  note?: string;
  category: ComponentCategory;
  group: THREE.Group;
  mesh: THREE.Mesh;
  labelSprite: THREE.Sprite;
  meshSource: MeshSource;
  /** Ignores stale async GLB upgrades after dispose/replace. */
  loadToken: number;
}

export interface CreateComponentInstanceOptions {
  /** Skip async GLB upgrade (tests that assert primitives). */
  skipGlb?: boolean;
  loadGltf?: GltfLoadFn;
}

function createPrimitiveMesh(category: ComponentCategory): THREE.Mesh {
  let geometry: THREE.BufferGeometry;

  switch (category) {
    case 'data':
      geometry = new THREE.CylinderGeometry(0.55, 0.55, 0.75, 24);
      break;
    case 'edge':
      geometry = new THREE.SphereGeometry(0.55, 24, 16);
      break;
    case 'traffic':
      geometry = new THREE.CylinderGeometry(0.45, 0.45, 0.9, 6);
      break;
    default:
      geometry = new THREE.BoxGeometry(1.1, 0.75, 1.1);
  }

  const material = new THREE.MeshStandardMaterial({
    color: CATEGORY_COLORS[category],
    roughness: 0.45,
    metalness: 0.15,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.y = BASE_HEIGHT;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}

function createLabelSprite(text: string): THREE.Sprite {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  if (!context) {
    const material = new THREE.SpriteMaterial({ color: 0xe2e8f0 });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(1.6, 1.6, 1);
    sprite.position.y = LABEL_OFFSET_Y;
    sprite.userData.labelText = text;
    return sprite;
  }

  const fontSize = 28;
  context.font = `600 ${fontSize}px system-ui, sans-serif`;
  const metrics = context.measureText(text);
  canvas.width = Math.ceil(metrics.width + 24);
  canvas.height = fontSize + 16;

  context.font = `600 ${fontSize}px system-ui, sans-serif`;
  context.fillStyle = SDQ_COLORS.bgElevated;
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = SDQ_COLORS.text;
  context.textBaseline = 'middle';
  context.fillText(text, 12, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
  });

  const sprite = new THREE.Sprite(material);
  const aspect = canvas.width / canvas.height;
  sprite.scale.set(1.6 * aspect, 1.6, 1);
  sprite.position.y = LABEL_OFFSET_Y;
  sprite.renderOrder = 10;
  sprite.userData.labelText = text;
  return sprite;
}

function disposeLabelSprite(sprite: THREE.Sprite): void {
  const material = sprite.material as THREE.SpriteMaterial;
  material.map?.dispose();
  material.dispose();
}

function tagPickMesh(mesh: THREE.Mesh, id: string): void {
  mesh.userData.componentId = id;
  mesh.userData.isComponent = true;
}

export async function upgradeInstanceToGlb(
  instance: ComponentInstanceObject,
  options?: { loadGltf?: GltfLoadFn },
): Promise<boolean> {
  const token = instance.loadToken;
  const model = await loadComponentModel(instance.type, {
    loadGltf: options?.loadGltf,
  });

  if (!model || token !== instance.loadToken) {
    return false;
  }

  const primary = findPrimaryMesh(model);
  if (!primary) {
    return false;
  }

  tintObjectWithColor(model, CATEGORY_COLORS[instance.category]);
  model.position.y = BASE_HEIGHT;

  instance.group.remove(instance.mesh);
  instance.mesh.geometry.dispose();
  const oldMat = instance.mesh.material;
  if (Array.isArray(oldMat)) {
    oldMat.forEach((m) => m.dispose());
  } else {
    oldMat.dispose();
  }

  tagPickMesh(primary, instance.id);
  instance.group.add(model);
  // Keep `mesh` as the primary pick target for selection/raycast helpers.
  instance.mesh = primary;
  instance.meshSource = 'glb';
  return true;
}

export function createComponentInstance(
  type: ComponentType,
  position: { x: number; y: number; z: number },
  id: string,
  options?: CreateComponentInstanceOptions,
): ComponentInstanceObject {
  const meta = getComponentMeta(type);
  const mesh = createPrimitiveMesh(meta.category);
  const labelSprite = createLabelSprite(meta.label);
  const group = new THREE.Group();

  tagPickMesh(mesh, id);

  group.add(mesh, labelSprite);
  group.position.set(position.x, position.y, position.z);

  const instance: ComponentInstanceObject = {
    id,
    type,
    label: meta.label,
    category: meta.category,
    group,
    mesh,
    labelSprite,
    meshSource: 'primitive',
    loadToken: 1,
  };

  if (!options?.skipGlb) {
    void upgradeInstanceToGlb(instance, { loadGltf: options?.loadGltf });
  }

  return instance;
}

export function getInstancePosition(instance: ComponentInstanceObject): {
  x: number;
  y: number;
  z: number;
} {
  return {
    x: instance.group.position.x,
    y: instance.group.position.y,
    z: instance.group.position.z,
  };
}

export function setInstanceXZPosition(
  instance: ComponentInstanceObject,
  x: number,
  z: number,
): void {
  instance.group.position.x = x;
  instance.group.position.z = z;
}

export function updateInstanceLabel(instance: ComponentInstanceObject, label: string): void {
  instance.label = label;
  const nextSprite = createLabelSprite(label);
  instance.group.remove(instance.labelSprite);
  disposeLabelSprite(instance.labelSprite);
  instance.labelSprite = nextSprite;
  instance.group.add(nextSprite);
}

export function setInstanceNote(instance: ComponentInstanceObject, note: string): void {
  instance.note = note;
}

export function setInstanceSelected(
  instance: ComponentInstanceObject,
  selected: boolean,
): void {
  const material = instance.mesh.material;
  const materials = Array.isArray(material) ? material : [material];
  for (const mat of materials) {
    if (!(mat instanceof THREE.MeshStandardMaterial)) {
      continue;
    }
    if (selected) {
      mat.emissive.setHex(0xffffff);
      mat.emissiveIntensity = 0.35;
    } else {
      mat.emissive.setHex(0x000000);
      mat.emissiveIntensity = 0;
    }
  }
}
