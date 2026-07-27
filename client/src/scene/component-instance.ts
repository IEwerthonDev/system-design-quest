import * as THREE from 'three';
import { getComponentMeta, type ComponentCategory, type ComponentType } from '@sdq/shared';

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

export interface ComponentInstanceObject {
  id: string;
  type: ComponentType;
  label: string;
  note?: string;
  category: ComponentCategory;
  group: THREE.Group;
  mesh: THREE.Mesh;
  labelSprite: THREE.Sprite;
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
  context.fillStyle = 'rgba(15, 20, 25, 0.85)';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#e2e8f0';
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

export function createComponentInstance(
  type: ComponentType,
  position: { x: number; y: number; z: number },
  id: string,
): ComponentInstanceObject {
  const meta = getComponentMeta(type);
  const mesh = createPrimitiveMesh(meta.category);
  const labelSprite = createLabelSprite(meta.label);
  const group = new THREE.Group();

  mesh.userData.componentId = id;
  mesh.userData.isComponent = true;

  group.add(mesh, labelSprite);
  group.position.set(position.x, position.y, position.z);

  return {
    id,
    type,
    label: meta.label,
    category: meta.category,
    group,
    mesh,
    labelSprite,
  };
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
  const material = instance.mesh.material as THREE.MeshStandardMaterial;
  if (selected) {
    material.emissive.setHex(0xffffff);
    material.emissiveIntensity = 0.35;
  } else {
    material.emissive.setHex(0x000000);
    material.emissiveIntensity = 0;
  }
}
