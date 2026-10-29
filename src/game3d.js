import * as THREE from 'three';
import { GLTFLoader } from '../vendor/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from '../vendor/addons/utils/BufferGeometryUtils.js';
import { loadHumanPackage, HumanAvatar } from './human-runtime.js';

const TAU = Math.PI * 2;
const UP = new THREE.Vector3(0, 1, 0);
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const smooth = (current, target, speed, dt) => current + (target - current) * (1 - Math.exp(-speed * dt));
const radians = (degrees) => degrees * Math.PI / 180;

function material(color, roughness = 0.75, metalness = 0.05, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
}

function box(parent, x, y, z, width, height, depth, mat, options = {}) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), mat);
  mesh.position.set(x, y, z);
  if (options.rotationY) mesh.rotation.y = options.rotationY;
  mesh.castShadow = options.castShadow ?? true;
  mesh.receiveShadow = options.receiveShadow ?? true;
  if (options.name) mesh.name = options.name;
  parent.add(mesh);
  return mesh;
}

function groundPlane(parent, x, y, z, width, depth, mat) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function beam(parent, a, b, radius, mat, sides = 8) {
  const start = new THREE.Vector3(...a);
  const end = new THREE.Vector3(...b);
  const axis = end.clone().sub(start);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, axis.length(), sides), mat);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(UP, axis.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function makeEllipseBand(parent, cx, cy, cz, rxOuter, rzOuter, rxInner, rzInner, mat, segments = 220) {
  const positions = [];
  const indices = [];
  for (let i = 0; i <= segments; i += 1) {
    const t = (i / segments) * TAU;
    const c = Math.cos(t);
    const s = Math.sin(t);
    positions.push(cx + c * rxOuter, cy, cz + s * rzOuter);
    positions.push(cx + c * rxInner, cy + 0.003, cz + s * rzInner);
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.material.side = THREE.DoubleSide;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function ellipsePath(cx, cy, cz, rx, rz, count = 160, phase = 0) {
  const points = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * TAU + phase;
    points.push(new THREE.Vector3(cx + Math.cos(angle) * rx, cy, cz + Math.sin(angle) * rz));
  }
  return points;
}

function addTubePath(parent, points, radius, mat, closed = true, tubularSegments = 240) {
  const curve = new THREE.CatmullRomCurve3(points, closed, 'centripetal', 0.1);
  const geometry = new THREE.TubeGeometry(curve, tubularSegments, radius, 6, closed);
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function makeSkyTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#31566f');
  gradient.addColorStop(0.34, '#6f93a1');
  gradient.addColorStop(0.61, '#b7b7a5');
  gradient.addColorStop(0.8, '#dfbb89');
  gradient.addColorStop(1, '#eac692');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const sun = ctx.createRadialGradient(346, 635, 10, 346, 635, 260);
  sun.addColorStop(0, 'rgba(255,231,182,.36)');
  sun.addColorStop(1, 'rgba(255,231,182,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 370, canvas.width, 520);
  for (let i = 0; i < 18; i += 1) {
    const x = (i * 89 + 47) % canvas.width;
    const y = 180 + ((i * 71) % 360);
    ctx.fillStyle = `rgba(242,240,221,${0.018 + (i % 4) * 0.006})`;
    ctx.beginPath();
    ctx.ellipse(x, y, 32 + (i % 5) * 9, 5 + (i % 3) * 2, 0, 0, TAU);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.mapping = THREE.EquirectangularReflectionMapping;
  return texture;
}

function makeWindowMaterial() {
  return new THREE.MeshStandardMaterial({
    color: '#809fa8', roughness: 0.2, metalness: 0.42,
    emissive: '#263b42', emissiveIntensity: 0.08
  });
}

function makeBuilding(parent, x, z, width, depth, height, seed, palette) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  parent.add(group);
  const baseMat = material(palette[seed % palette.length], 0.48, 0.26);
  box(group, 0, height * 0.5, 0, width, height, depth, baseMat, { castShadow: false });
  box(group, 0, height + 0.12, 0, width + 0.35, 0.24, depth + 0.35, material('#c1c4b7', 0.48, 0.17), { castShadow: false });
  const rows = Math.max(8, Math.floor(height / 2.4));
  const cols = Math.max(4, Math.floor(width / 1.65));
  const windowGeo = new THREE.BoxGeometry(width / (cols + 1) * 0.58, height / (rows + 1) * 0.52, 0.045);
  const windows = new THREE.InstancedMesh(windowGeo, makeWindowMaterial(), rows * cols);
  const dummy = new THREE.Object3D();
  let index = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const wx = -width * 0.5 + width * (col + 1) / (cols + 1);
      const wy = 1.15 + row * (height - 2.1) / Math.max(1, rows - 1);
      const frontZ = depth * 0.5 + 0.032;
      dummy.position.set(wx, wy, frontZ);
      dummy.updateMatrix();
      windows.setMatrixAt(index, dummy.matrix);
      const lit = ((row * 13 + col * 7 + seed * 3) % 11) === 0;
      windows.setColorAt(index, new THREE.Color(lit ? '#c8a66e' : (col % 3 ? '#658996' : '#4a7180')));
      index += 1;
    }
  }
  windows.count = index;
  windows.instanceMatrix.needsUpdate = true;
  if (windows.instanceColor) windows.instanceColor.needsUpdate = true;
  windows.castShadow = false;
  windows.receiveShadow = false;
  group.add(windows);
  const mullionMat = material('#d1d0c2', 0.38, 0.22);
  for (let col = 0; col <= cols; col += 1) {
    const mx = -width * 0.5 + width * col / cols;
    box(group, mx, height * 0.52, depth * 0.5 + 0.018, 0.035, height * 0.96, 0.075, mullionMat, { castShadow: false });
  }
  return group;
}

function makePalm(parent, x, z, scale = 1, seed = 0) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  parent.add(group);
  const bark = material('#846347', 0.94, 0.02);
  const leafMats = [material('#3b684f', 0.93), material('#527552', 0.95), material('#2f5948', 0.92)];
  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.05, 1.3, 0), new THREE.Vector3(0.16, 2.8, 0.02),
    new THREE.Vector3(0.12 + Math.sin(seed) * 0.2, 4.35, 0.03)
  ]);
  const trunk = new THREE.Mesh(new THREE.TubeGeometry(path, 12, 0.16, 8, false), bark);
  trunk.castShadow = true;
  group.add(trunk);
  const crown = new THREE.Vector3(0.12 + Math.sin(seed) * 0.2, 4.34, 0.03);
  for (let i = 0; i < 10; i += 1) {
    const angle = (i / 10) * TAU + seed * 0.5;
    const dir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
    const side = new THREE.Vector3(-dir.z, 0, dir.x);
    const length = 2.45 + (i % 3) * 0.22;
    const vertices = [];
    const indices = [];
    const rows = 10;
    for (let row = 0; row <= rows; row += 1) {
      const t = row / rows;
      const center = crown.clone().addScaledVector(dir, length * t);
      center.y += 0.36 * Math.sin(Math.PI * t) - 0.7 * t * t;
      const width = (0.05 + 0.34 * Math.sin(Math.PI * t)) * (1 - 0.42 * t);
      vertices.push(center.x - side.x * width * 0.5, center.y + 0.035 * Math.sin(t * 8), center.z - side.z * width * 0.5);
      vertices.push(center.x + side.x * width * 0.5, center.y - 0.035 * Math.sin(t * 8), center.z + side.z * width * 0.5);
      if (row < rows) {
        const a = row * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const leaf = new THREE.Mesh(geometry, leafMats[(i + seed) % leafMats.length]);
    leaf.material.side = THREE.DoubleSide;
    leaf.castShadow = true;
    group.add(leaf);
  }
  return group;
}

function createF1Car(parent, colorHex, index) {
  const root = new THREE.Group();
  const bodyMat = new THREE.MeshPhysicalMaterial({ color: colorHex, roughness: 0.35, metalness: 0.26, clearcoat: 0.35, clearcoatRoughness: 0.4 });
  const carbon = material('#171d20', 0.48, 0.34);
  const rubber = material('#15191a', 0.88, 0.02);
  const metal = material('#9ca09b', 0.34, 0.58);
  box(root, 0, 0.39, 0, 0.88, 0.27, 2.48, bodyMat, { castShadow: true });
  box(root, 0, 0.55, -0.17, 0.69, 0.24, 1.28, bodyMat, { castShadow: true });
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.25, 1.1, 5), bodyMat);
  nose.rotation.x = -Math.PI / 2;
  nose.position.set(0, 0.42, 1.4);
  nose.castShadow = true;
  root.add(nose);
  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(0.28, 9, 6, 0, TAU, 0, Math.PI * 0.56), material('#17242a', 0.18, 0.38, { emissive: '#283a3c', emissiveIntensity: 0.13 }));
  cockpit.scale.set(0.82, 0.6, 1.1);
  cockpit.position.set(0, 0.68, -0.15);
  root.add(cockpit);
  box(root, 0, 0.58, -1.42, 1.48, 0.075, 0.16, carbon);
  box(root, 0, 0.88, -1.52, 1.2, 0.075, 0.08, bodyMat);
  box(root, 0, 0.34, 1.78, 1.72, 0.07, 0.12, carbon);
  for (const x of [-0.55, 0.55]) {
    for (const z of [-0.82, 0.87]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.22, 14), rubber);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.36, z);
      wheel.castShadow = true;
      root.add(wheel);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.23, 12), metal);
      hub.rotation.z = Math.PI / 2;
      hub.position.copy(wheel.position);
      root.add(hub);
    }
  }
  for (const x of [-0.45, 0.45]) beam(root, [x, 0.46, -0.7], [x * 1.2, 0.53, 0.75], 0.045, carbon, 6);
  root.userData.speed = 0.023 + index * 0.0018;
  parent.add(root);
  return root;
}

function createAudience(parent) {
  const bodyGeometry = new THREE.CapsuleGeometry(0.11, 0.3, 3, 6);
  const headGeometry = new THREE.SphereGeometry(0.105, 7, 6);
  const shirtMaterial = material('#74878a', 0.89, 0.02);
  const skinMaterial = material('#d5b59a', 0.92, 0.01);
  const count = 212;
  const bodies = new THREE.InstancedMesh(bodyGeometry, shirtMaterial, count);
  const heads = new THREE.InstancedMesh(headGeometry, skinMaterial, count);
  const dummy = new THREE.Object3D();
  let index = 0;
  const colors = ['#a4a38d', '#718e91', '#b56e5d', '#d0ba92', '#546b64', '#8a7580', '#c9c7b9'];
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 27; col += 1) {
      if (index >= count) break;
      const x = -27 + col * 2.05 + ((row + col) % 3) * 0.12;
      const z = -100.5 - row * 0.77;
      const stepY = 0.44 + row * 0.46;
      dummy.position.set(x, stepY + 0.36, z);
      dummy.rotation.y = ((col % 4) - 1.5) * 0.06;
      dummy.updateMatrix();
      bodies.setMatrixAt(index, dummy.matrix);
      bodies.setColorAt(index, new THREE.Color(colors[(row * 7 + col * 3) % colors.length]));
      dummy.position.set(x, stepY + 0.72, z);
      dummy.rotation.set(0, ((col % 4) - 1.5) * 0.06, 0);
      dummy.scale.setScalar(0.86 + ((col + row) % 3) * 0.08);
      dummy.updateMatrix();
      heads.setMatrixAt(index, dummy.matrix);
      index += 1;
    }
  }
  bodies.count = heads.count = index;
  bodies.instanceMatrix.needsUpdate = heads.instanceMatrix.needsUpdate = true;
  if (bodies.instanceColor) bodies.instanceColor.needsUpdate = true;
  if (heads.instanceColor) heads.instanceColor.needsUpdate = true;
  bodies.castShadow = false;
  heads.castShadow = false;
  parent.add(bodies, heads);
}

function addTextSprite(parent, text, options = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = options.background || 'rgba(14,28,30,.86)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = options.border || 'rgba(219,198,151,.72)';
  ctx.lineWidth = 3;
  ctx.strokeRect(4, 4, canvas.width - 8, canvas.height - 8);
  ctx.fillStyle = options.color || '#eee7d3';
  ctx.font = '600 34px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 1, canvas.width - 24);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false, toneMapped: false }));
  const scale = options.scale || 3.2;
  sprite.scale.set(scale, scale * 0.25, 1);
  parent.add(sprite);
  return sprite;
}

function pickBone(avatar, name) {
  return avatar.bones.find((bone) => bone.name === `mixamorig:${name}`) || null;
}

function solveElbow(shoulder, hand, side, upperLength, lowerLength) {
  const s = new THREE.Vector3(...shoulder);
  const h = new THREE.Vector3(...hand);
  const delta = h.clone().sub(s);
  const d = Math.max(0.001, delta.length());
  const u = delta.normalize();
  const distance = clamp(d, Math.abs(upperLength - lowerLength) + 0.001, upperLength + lowerLength - 0.001);
  const along = (upperLength * upperLength - lowerLength * lowerLength + distance * distance) / (2 * distance);
  const height = Math.sqrt(Math.max(0, upperLength * upperLength - along * along));
  let perpendicular = new THREE.Vector3(1, 0, 0).addScaledVector(u, -u.x);
  if (perpendicular.lengthSq() < 0.001) perpendicular = new THREE.Vector3(0, 0, 1).addScaledVector(u, -u.z);
  perpendicular.normalize();
  if (side === 'left') perpendicular.negate();
  return s.addScaledVector(u, along).addScaledVector(perpendicular, height).toArray();
}

function aimBone(avatar, boneName, childName, target) {
  const bone = pickBone(avatar, boneName);
  const child = pickBone(avatar, childName);
  if (!bone || !child) return;
  avatar.group.updateMatrixWorld(true);
  const start = bone.getWorldPosition(new THREE.Vector3());
  const currentEnd = child.getWorldPosition(new THREE.Vector3());
  const currentDirection = currentEnd.sub(start).normalize();
  const desiredDirection = new THREE.Vector3(...target).sub(bone.getWorldPosition(new THREE.Vector3())).normalize();
  const worldDelta = new THREE.Quaternion().setFromUnitVectors(currentDirection, desiredDirection);
  const currentWorld = bone.getWorldQuaternion(new THREE.Quaternion());
  const parentWorld = bone.parent.getWorldQuaternion(new THREE.Quaternion());
  const desiredWorld = worldDelta.multiply(currentWorld);
  bone.quaternion.copy(parentWorld.invert().multiply(desiredWorld));
  avatar.group.updateMatrixWorld(true);
}

function bendHand(avatar, side, trigger = false) {
  const hand = pickBone(avatar, `${side}Hand`);
  if (hand) hand.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI));
  for (const digit of ['Index', 'Middle', 'Ring', 'Pinky']) {
    const bend = digit === 'Index' && trigger ? [0.3, 0.62, 0.42] : [0.58, 0.76, 0.52];
    for (let i = 1; i <= 3; i += 1) {
      const bone = pickBone(avatar, `${side}Hand${digit}${i}`);
      if (bone) bone.rotation.x += bend[i - 1];
    }
  }
  for (let i = 1; i <= 3; i += 1) {
    const bone = pickBone(avatar, `${side}HandThumb${i}`);
    if (bone) bone.rotation.x += [0.24, 0.48, 0.3][i - 1];
  }
}

function addPoloDetails(avatar) {
  const group = new THREE.Group();
  group.name = 'RosePoloDetails';
  const pink = material('#e8b8bb', 0.88, 0.01);
  const edge = material('#b77d85', 0.82, 0.01);
  const buttonMat = material('#efe2d2', 0.4, 0.05);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.012, 7, 28), pink);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(0, 1.47, 0.028);
  group.add(ring);
  const seam = new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.0024, 5, 28), edge);
  seam.rotation.x = Math.PI / 2;
  seam.position.set(0, 1.455, 0.028);
  group.add(seam);
  for (const sign of [-1, 1]) {
    const shape = new THREE.Shape();
    shape.moveTo(sign * 0.012, 1.49);
    shape.lineTo(sign * 0.13, 1.476);
    shape.lineTo(sign * 0.085, 1.392);
    shape.lineTo(sign * 0.025, 1.44);
    shape.closePath();
    const collar = new THREE.Mesh(new THREE.ShapeGeometry(shape, 1), new THREE.MeshStandardMaterial({ color: '#e4b5b9', roughness: 0.86, side: THREE.DoubleSide }));
    collar.position.z = 0.135;
    group.add(collar);
    beam(group, [sign * 0.13, 1.476, 0.139], [sign * 0.085, 1.392, 0.139], 0.0028, edge, 5);
  }
  box(group, 0, 1.421, 0.144, 0.034, 0.135, 0.012, pink, { castShadow: false, receiveShadow: false });
  for (let i = 0; i < 3; i += 1) {
    const button = new THREE.Mesh(new THREE.SphereGeometry(0.009, 8, 6), buttonMat);
    button.position.set(0, 1.46 - i * 0.037, 0.153);
    group.add(button);
  }
  avatar.group.add(group);
  return group;
}

function addActorShadow(parent, radiusX = 0.36, radiusZ = 0.23) {
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1, 22),
    new THREE.MeshBasicMaterial({ color: '#18221e', transparent: true, opacity: 0.24, depthWrite: false, toneMapped: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.scale.set(radiusX, radiusZ, 1);
  shadow.position.y = 0.024;
  parent.add(shadow);
  return shadow;
}

function compactStaticGeometry(root) {
  root.updateMatrixWorld(true);
  const inverseRoot = root.matrixWorld.clone().invert();
  const batches = new Map();
  const candidates = [];
  root.traverse((object) => {
    if (!object.isMesh || object.isInstancedMesh || object.isSkinnedMesh || object.children.length || !object.geometry) return;
    if (object.geometry.morphAttributes && Object.keys(object.geometry.morphAttributes).length) return;
    const source = Array.isArray(object.material) ? null : object.material;
    if (!source || source.transparent || source.opacity < 1 || source.map || source.normalMap || source.emissiveMap ||
      source.roughnessMap || source.metalnessMap || source.alphaMap || source.aoMap) return;
    candidates.push(object);
  });
  for (const object of candidates) {
    if (!object.parent) continue;
    const source = object.material;
    const geometry = object.geometry;
    const layout = Object.keys(geometry.attributes).sort().map((name) => {
      const attribute = geometry.attributes[name];
      return `${name}:${attribute.itemSize}:${attribute.normalized ? 1 : 0}`;
    }).join(',');
    const key = [source.type, source.color?.getHexString(), source.roughness, source.metalness,
      source.emissive?.getHexString(), source.emissiveIntensity, source.opacity, source.side,
      source.depthWrite, source.vertexColors, source.flatShading, source.toneMapped,
      geometry.index ? 'indexed' : 'unindexed', layout, object.castShadow, object.receiveShadow].join('|');
    if (!batches.has(key)) batches.set(key, { material: source, objects: [], geometries: [], castShadow: object.castShadow, receiveShadow: object.receiveShadow });
    const batch = batches.get(key);
    object.updateWorldMatrix(true, false);
    const transformed = geometry.clone();
    transformed.applyMatrix4(inverseRoot.clone().multiply(object.matrixWorld));
    batch.objects.push(object);
    batch.geometries.push(transformed);
  }
  for (const batch of batches.values()) {
    const merged = batch.geometries.length === 1 ? batch.geometries[0] : mergeGeometries(batch.geometries, false);
    if (!merged) {
      batch.geometries.forEach((geometry) => geometry.dispose());
      continue;
    }
    if (batch.geometries.length > 1) batch.geometries.forEach((geometry) => geometry.dispose());
    for (const object of batch.objects) {
      object.parent?.remove(object);
      object.geometry.dispose();
    }
    const mesh = new THREE.Mesh(merged, batch.material);
    mesh.name = 'BatchedStaticArchitecture';
    mesh.castShadow = batch.castShadow;
    mesh.receiveShadow = batch.receiveShadow;
    root.add(mesh);
  }
}

export class ThirdPersonWorld {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.3));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.94;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.setClearColor('#879a91', 1);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#9aabb0');
    this.scene.fog = new THREE.Fog('#9eb4bb', 150, 320);
    this.camera = new THREE.PerspectiveCamera(54, 1, 0.1, 420);
    this.camera.position.set(0, 14, 14);

    const hemisphere = new THREE.HemisphereLight('#b8d5e3', '#333a34', 1.1);
    this.scene.add(hemisphere);
    const ambient = new THREE.AmbientLight('#9eaea9', 0.1);
    this.scene.add(ambient);
    this.sun = new THREE.DirectionalLight('#ffdda9', 2.55);
    this.sun.position.set(-32, 48, 28);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -84;
    this.sun.shadow.camera.right = 84;
    this.sun.shadow.camera.top = 72;
    this.sun.shadow.camera.bottom = -72;
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 160;
    this.sun.shadow.normalBias = 0.035;
    this.sun.shadow.bias = -0.00012;
    this.scene.add(this.sun);
    this.sun.target.position.set(0, 0, -42);
    this.scene.add(this.sun.target);
    this.scene.add(new THREE.HemisphereLight('#a9c4c1', '#4c5544', 0.16));

    this.static = new THREE.Group();
    this.dynamic = new THREE.Group();
    this.actorLayer = new THREE.Group();
    this.effects = new THREE.Group();
    this.scene.add(this.static, this.dynamic, this.actorLayer, this.effects);

    this.playerRoot = new THREE.Group();
    this.actorLayer.add(this.playerRoot);
    this.playerShadow = addActorShadow(this.playerRoot, 0.46, 0.29);
    this.player = null;
    this.target = null;
    this.guards = [];
    this.roofGuard = null;
    this.roofY = 10.82;
    this.lockerPosition = new THREE.Vector3(3.15, 10.82, 13.15);
    this.roofVisionBlockers = [
      { minX: -6.8, maxX: -4.1, minZ: 10.0, maxZ: 12.8, maxY: 12.25 },
      { minX: 4.8, maxX: 6.6, minZ: 9.8, maxZ: 11.8, maxY: 11.95 },
      { minX: 2.15, maxX: 4.2, minZ: 13.55, maxZ: 14.8, maxY: 13.05 }
    ];
    this.targetDown = false;
    this.targetDownTimer = 0;
    this.targetStartX = 0.15;
    this.targetLabel = null;
    this.exitPosition = new THREE.Vector3(-0.72, 10.82, 13.35);
    this.exitPositions = {
      stairs: this.exitPosition,
      lift: new THREE.Vector3(-5.55, 10.82, 4.2)
    };
    this.rifleTexture = null;
    this.roadCars = [];
    this.effectsToExpire = [];
    this.time = 0;
    this.cameraYaw = 0.045;
    this.cameraPitch = 0.19;
    this.cameraDistance = 4.55;
    this.cameraHeight = 2.08;
    this.cameraSide = -0.83;
    this.aiming = false;
    this.zoomFov = 29;
    this.cameraPosition = new THREE.Vector3(0, 14, 13);
    this.ready = false;
    this.assetError = null;
    this.buildEnvironment();
    this.resize();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
  }

  resize() {
    const width = Math.max(1, this.canvas.clientWidth || window.innerWidth);
    const height = Math.max(1, this.canvas.clientHeight || window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.3));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  buildEnvironment() {
    const world = this.static;
    const sky = makeSkyTexture();
    this.scene.background = sky;
    this.scene.environment = sky;

    const terrain = material('#4c5c4c', 0.96, 0.01);
    const grass = material('#355c3e', 0.98, 0.01);
    const green = material('#477342', 0.96, 0.01);
    const gravel = material('#8b826b', 0.95, 0.01);
    const road = material('#242b30', 0.92, 0.02);
    const painted = material('#e8e0cd', 0.65, 0.03, { emissive: '#35342f', emissiveIntensity: 0.04 });
    const curbRed = material('#bf3d35', 0.86, 0.02);
    const curbWhite = material('#eee7d8', 0.78, 0.02);
    const barrier = material('#949a90', 0.72, 0.03);

    groundPlane(world, 0, -0.18, -73, 470, 400, terrain);
    groundPlane(world, 0, -0.12, -68, 150, 112, grass);
    makeEllipseBand(world, 0, 0.015, -68, 56, 32, 47.2, 23.2, road, 260);
    makeEllipseBand(world, 0, 0.008, -68, 59, 35, 56.1, 32.1, gravel, 260);
    groundPlane(world, 0, 0.028, -68, 88, 44, green);

    const outerLine = ellipsePath(0, 0.065, -68, 55.4, 31.45, 180);
    const innerLine = ellipsePath(0, 0.067, -68, 47.8, 23.8, 180);
    addTubePath(world, outerLine, 0.085, painted);
    addTubePath(world, innerLine, 0.085, painted);
    const dashMat = material('#d8d6ca', 0.75, 0.01);
    for (let i = 0; i < 72; i += 1) {
      const angle = (i / 72) * TAU;
      const x = Math.cos(angle) * 51.5;
      const z = -68 + Math.sin(angle) * 27.5;
      const tangentX = -Math.sin(angle) * 51.5;
      const tangentZ = Math.cos(angle) * 27.5;
      const yaw = Math.atan2(-tangentZ, tangentX);
      box(world, x, 0.08, z, 1.25, 0.035, 0.11, dashMat, { rotationY: yaw, castShadow: false, receiveShadow: true });
    }
    for (let i = 0; i < 126; i += 1) {
      const angle = (i / 126) * TAU;
      const x = Math.cos(angle) * 47.6;
      const z = -68 + Math.sin(angle) * 23.6;
      const tangentX = -Math.sin(angle) * 47.6;
      const tangentZ = Math.cos(angle) * 23.6;
      const yaw = Math.atan2(-tangentZ, tangentX);
      const mat = i % 2 ? curbWhite : curbRed;
      box(world, x, 0.1, z, 0.92, 0.16, 0.54, mat, { rotationY: yaw, castShadow: false });
    }

    // Timing stripe, pit lane, and low safety barriers.
    for (let i = -8; i < 8; i += 1) {
      box(world, i * 0.85, 0.08, -39.1, 0.82, 0.045, 0.18, i % 2 ? curbWhite : material('#232728', 0.9), { castShadow: false });
    }
    groundPlane(world, 0, 0.025, -33.1, 103, 6.2, gravel);
    groundPlane(world, 0, 0.038, -33.1, 96, 4.7, road);
    for (const x of [-51, -43, -35, 35, 43, 51]) {
      box(world, x, 0.52, -35.6, 0.2, 0.95, 1.6, barrier, { castShadow: true });
      box(world, x, 0.98, -35.6, 0.22, 0.06, 1.65, material('#d6d2c4', 0.45, 0.2));
    }
    for (let i = 0; i < 32; i += 1) {
      const x = -48 + i * 3.1;
      const mat = i % 2 ? curbRed : curbWhite;
      box(world, x, 0.17, -30.2, 2.95, 0.22, 0.48, mat, { castShadow: false });
    }

    this.buildGrandstand(world, barrier);
    this.buildVIPBalcony(world);
    this.buildRooftop(world);
    this.buildSkyline(world);
    this.buildPalms(world);
    this.buildTrackside(world);
    this.buildLightingDetails(world);
    compactStaticGeometry(world);
    this.buildCars(this.dynamic);
  }

  buildGrandstand(world, barrier) {
    const seatMaterials = [material('#596d6e', 0.82), material('#6f7870', 0.84), material('#826e5c', 0.87)];
    const stairMat = material('#343f3f', 0.88, 0.02);
    for (let row = 0; row < 8; row += 1) {
      const z = -100.5 - row * 0.78;
      const y = 0.23 + row * 0.46;
      box(world, 0, y, z, 61, 0.38, 0.64, row % 2 ? seatMaterials[0] : seatMaterials[1], { castShadow: false });
      box(world, 0, y + 0.23, z - 0.24, 62, 0.055, 0.055, seatMaterials[2], { castShadow: false });
      for (const x of [-31, 31]) box(world, x, y + 0.22, z, 0.35, 0.52, 0.8, stairMat, { castShadow: false });
    }
    for (const x of [-28, -18, -8, 2, 12, 22, 29]) {
      beam(world, [x, 0.3, -100], [x, 8.8, -106.7], 0.1, material('#677574', 0.5, 0.32), 7);
    }
    box(world, 0, 8.7, -106.5, 61, 0.22, 13, material('#8c9890', 0.48, 0.18), { castShadow: false });
    box(world, 0, 8.55, -100.4, 63, 0.18, 0.18, material('#d2cbb8', 0.54, 0.12), { castShadow: false });
    for (const x of [-32, 32]) {
      box(world, x, 4.1, -103.5, 0.28, 8.1, 0.35, barrier, { castShadow: false });
    }
    for (let i = 0; i < 7; i += 1) {
      const x = -25 + i * 8.25;
      const sign = box(world, x, 0.75, -97.6, 7.6, 1.4, 0.25, material(['#385f60', '#536b64', '#8c7256'][i % 3], 0.64, 0.06), { castShadow: false });
      if (i % 2 === 0) addTextSprite(sign, i === 0 ? 'NORTH PITS' : 'COASTAL CUP', { scale: 4.8, background: 'rgba(24,43,43,.95)' }).position.set(0, 0.04, 0.16);
    }
    createAudience(world);
  }

  buildVIPBalcony(world) {
    const concrete = material('#9a9c91', 0.8, 0.04);
    const dark = material('#273333', 0.55, 0.22);
    const glass = material('#78959a', 0.2, 0.38, { transparent: true, opacity: 0.54, side: THREE.DoubleSide });
    const brass = material('#b7a26f', 0.42, 0.35);
    const platformY = 3.25;
    box(world, 0, platformY, -29.4, 15.2, 0.34, 6.1, concrete);
    box(world, 0, platformY + 0.2, -29.4, 14.7, 0.08, 5.7, material('#665d4e', 0.75, 0.03));
    for (const x of [-6.7, 6.7]) {
      box(world, x, 1.7, -29.6, 0.34, 3.2, 0.35, material('#69736b', 0.63, 0.16));
      box(world, x, 4.05, -29.6, 0.12, 1.4, 0.12, brass);
    }
    // Glass wind baffles leave a clear center shooting lane.
    for (const x of [-6.0, -4.9, 4.9, 6.0]) {
      box(world, x, 4.15, -32.1, 0.85, 1.35, 0.08, glass, { castShadow: false });
      box(world, x, 3.45, -32.1, 0.9, 0.055, 0.13, brass, { castShadow: false });
    }
    // Put the VIP control-room glazing behind the balcony so it never occludes the target.
    box(world, 0, 5.15, -34.2, 17, 4.3, 0.42, dark);
    box(world, 0, 7.35, -33.95, 18, 0.16, 0.72, concrete);
    box(world, 0, 3.25, -33.94, 17, 0.16, 0.58, material('#7e847b', 0.71, 0.1));
    const facadeMat = makeWindowMaterial();
    for (let col = 0; col < 12; col += 1) {
      const x = -7.65 + col * 1.39;
      box(world, x, 5.3, -33.97, 1.02, 3.15, 0.035, facadeMat, { castShadow: false, receiveShadow: false });
      box(world, x + 0.55, 5.3, -33.88, 0.05, 3.3, 0.08, brass, { castShadow: false });
    }
    for (const x of [-7, -3.5, 0, 3.5, 7]) {
      box(world, x, 4.95, -33.86, 0.045, 2.7, 0.08, material('#c8c9b9', 0.58, 0.1), { castShadow: false });
    }
    const sign = box(world, -5.8, 6.8, -33.82, 4.2, 0.6, 0.08, material('#263b3a', 0.48, 0.2));
    addTextSprite(sign, 'RACE CONTROL · VIP', { scale: 3.4, background: 'rgba(24,47,44,.95)' }).position.set(0, 0, 0.08);
    for (let i = 0; i < 12; i += 1) {
      const x = -5.8 + i * 1.05;
      const lamp = new THREE.PointLight(i % 3 === 0 ? '#e2c991' : '#afc6b5', 0.3, 6, 2);
      lamp.position.set(x, 7.15, -33.45);
      world.add(lamp);
    }
  }

  buildRooftop(world) {
    const y = 10.82;
    const deck = material('#66675f', 0.88, 0.04);
    const tile = material('#777365', 0.83, 0.04);
    const darkMetal = material('#34403d', 0.55, 0.32);
    const frameMetal = material('#565d57', 0.47, 0.42);
    const glass = material('#6d8581', 0.22, 0.38, { transparent: true, opacity: 0.38, side: THREE.DoubleSide });
    box(world, 0, y - 0.16, 8.25, 15.4, 0.32, 14.6, deck);
    for (let z = 1.5; z <= 15.0; z += 1.65) {
      box(world, 0, y + 0.006, z, 15.0, 0.016, 0.024, tile, { castShadow: false });
    }
    for (let x = -7.25; x <= 7.25; x += 1.65) {
      box(world, x, y + 0.008, 8.25, 0.022, 0.018, 14.2, tile, { castShadow: false });
    }
    // A partial pit-lane canopy sits behind the operative, keeping the forward sightline open.
    box(world, 0, 14.25, 15.2, 15.3, 0.24, 6.8, darkMetal, { castShadow: false });
    box(world, 0, 14.1, 15.2, 14.8, 0.08, 6.35, material('#5d655d', 0.58, 0.22), { castShadow: false });
    for (const x of [-7.15, 7.15]) {
      beam(world, [x, y + 0.03, 14.2], [x, 14.12, 14.2], 0.12, frameMetal, 8);
      beam(world, [x, y + 0.03, 10.4], [x, 14.12, 14.2], 0.095, frameMetal, 8);
      beam(world, [x, y + 0.05, 11.5], [x, y + 1.0, 11.5], 0.055, darkMetal, 7);
    }
    for (const x of [-5.6, 0, 5.6]) {
      box(world, x, 13.98, 13.2, 0.18, 0.14, 4.4, material('#b69c65', 0.36, 0.42), { castShadow: false });
      const strip = new THREE.PointLight('#f4d6a0', 0.48, 8, 2);
      strip.position.set(x, 13.55, 12.2);
      this.scene.add(strip);
    }
    // Side and rear balustrades; the center of the front edge stays completely clear.
    for (const x of [-7.35, 7.35]) {
      for (let z = 2.0; z <= 13.5; z += 2.4) {
        beam(world, [x, y + 0.02, z], [x, y + 1.04, z], 0.035, frameMetal, 7);
      }
      beam(world, [x, y + 1.04, 2.0], [x, y + 1.04, 13.5], 0.032, frameMetal, 7);
      beam(world, [x, y + 0.5, 2.0], [x, y + 0.5, 13.5], 0.025, frameMetal, 7);
    }
    for (const x of [-7.35, -5.3, 5.3, 7.35]) beam(world, [x, y + 0.02, 2.0], [x, y + 1.04, 2.0], 0.035, frameMetal, 7);
    beam(world, [-7.35, y + 1.04, 2.0], [-5.3, y + 1.04, 2.0], 0.032, frameMetal, 7);
    beam(world, [5.3, y + 1.04, 2.0], [7.35, y + 1.04, 2.0], 0.032, frameMetal, 7);
    // Low cover and service equipment are pushed to the outside edges.
    const hvac = material('#59625d', 0.62, 0.3);
    box(world, -5.45, y + 0.72, 11.4, 2.5, 1.4, 2.4, hvac);
    for (let i = 0; i < 7; i += 1) box(world, -6.35 + i * 0.3, y + 0.73, 10.17, 0.1, 0.95, 0.055, material('#aab0a5', 0.65, 0.25));
    box(world, 5.7, y + 0.46, 10.8, 1.7, 0.88, 1.8, material('#59645f', 0.7, 0.18));
    for (let i = 0; i < 3; i += 1) box(world, 5.13 + i * 0.56, y + 0.91, 10.0, 0.36, 0.06, 0.3, material('#a5a69b', 0.6, 0.2));
    // Stairwell door and beacon.
    box(world, -0.72, y + 1.52, 15.0, 2.1, 3.05, 0.3, material('#283633', 0.62, 0.28));
    box(world, -0.72, y + 1.51, 14.82, 1.42, 2.66, 0.06, material('#45534c', 0.72, 0.1));
    box(world, 0.08, y + 1.52, 14.76, 0.06, 0.16, 0.05, material('#c9b477', 0.4, 0.35));
    const exitLight = new THREE.PointLight('#8ccd91', 1.2, 7, 2);
    exitLight.position.set(-0.72, y + 3.3, 14.1);
    this.scene.add(exitLight);
    const beacon = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.09, 0.08), new THREE.MeshBasicMaterial({ color: '#a5d395', toneMapped: false }));
    beacon.position.set(-0.72, y + 3.34, 14.55);
    world.add(beacon);
    const exitSign = box(world, -0.72, y + 3.9, 14.77, 2.2, 0.48, 0.08, material('#244436', 0.48, 0.14, { emissive: '#2f6948', emissiveIntensity: 0.34 }));
    addTextSprite(exitSign, 'SERVICE EXIT', { scale: 3.7, color: '#d8e4ce', background: 'rgba(22,55,38,.96)', border: 'rgba(151,205,145,.9)' }).position.set(0, 0, 0.06);
    const locker = new THREE.Group();
    locker.name = 'EventCrewLocker';
    locker.position.set(3.15, y, 14.05);
    world.add(locker);
    const lockerBody = material('#46544d', 0.62, 0.25);
    const lockerDoor = material('#738071', 0.68, 0.18);
    box(locker, 0, 1.07, 0, 1.82, 2.12, 0.72, lockerBody);
    for (const x of [-0.43, 0.43]) {
      box(locker, x, 1.08, -0.38, 0.78, 1.88, 0.055, lockerDoor, { castShadow: false });
      box(locker, x + 0.25, 1.1, -0.424, 0.035, 0.24, 0.035, material('#c0ad78', 0.38, 0.5), { castShadow: false });
      for (let i = 0; i < 4; i += 1) box(locker, x, 1.72 - i * 0.095, -0.421, 0.35, 0.026, 0.018, material('#4a574f', 0.7, 0.12), { castShadow: false });
    }
    const lockerSign = addTextSprite(locker, 'EVENT CREW', { scale: 1.8, color: '#e3e0c9', background: 'rgba(30,54,43,.96)', border: 'rgba(180,203,146,.9)' });
    lockerSign.position.set(0, 2.35, -0.43);
    this.lockerPosition.set(3.15, y, 12.95);
    this.exitPosition.set(-0.72, y, 13.35);
    this.exitPositions.lift.set(-5.55, y, 4.2);
    const ladderMetal = material('#56645c', 0.48, 0.42);
    beam(world, [-7.18, y + 0.12, 3.55], [-7.18, y + 2.42, 3.55], 0.045, ladderMetal, 7);
    beam(world, [-6.82, y + 0.12, 3.55], [-6.82, y + 2.42, 3.55], 0.045, ladderMetal, 7);
    for (let rung = 0; rung < 8; rung += 1) {
      const rungY = y + 0.2 + rung * 0.29;
      beam(world, [-7.18, rungY, 3.55], [-6.82, rungY, 3.55], 0.028, ladderMetal, 6);
    }
    const liftMarker = addTextSprite(world, 'MAINT. LIFT', { scale: 1.65, color: '#dbe7d3', background: 'rgba(28,58,43,.94)', border: 'rgba(139,204,145,.82)' });
    liftMarker.position.set(-6.2, y + 2.35, 3.5);
    const liftLight = new THREE.PointLight('#8ccd91', 0.65, 4, 2);
    liftLight.position.set(-5.75, y + 1.9, 3.8);
    world.add(liftLight);
    // A pair of planters frames the back of the roof; broad leaves are silhouette accents.
    this.addPlanter(world, -6.2, 13.0, 0.9);
    this.addPlanter(world, 6.2, 13.0, 0.9);
  }

  addPlanter(parent, x, z, scale = 1) {
    const pot = material('#575b53', 0.88, 0.04);
    const soil = material('#3d352b', 0.98);
    box(parent, x, 11.28, z, 1.15, 0.82, 1.1, pot);
    box(parent, x, 11.7, z, 1.05, 0.08, 0.98, soil, { castShadow: false });
    const leafMat = material('#4a6e51', 0.9);
    const leafLite = material('#66845c', 0.88);
    for (let i = 0; i < 7; i += 1) {
      const angle = i * TAU / 7;
      const end = [x + Math.cos(angle) * 0.62 * scale, 12.65 + (i % 3) * 0.18, z + Math.sin(angle) * 0.62 * scale];
      beam(parent, [x, 11.74, z], end, 0.027, leafMat, 5);
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.22, 7, 5), i % 2 ? leafMat : leafLite);
      leaf.scale.set(0.36, 1.45, 0.48);
      leaf.position.set(...end);
      leaf.rotation.z = -Math.cos(angle) * 0.38;
      leaf.rotation.x = Math.sin(angle) * 0.42;
      parent.add(leaf);
    }
  }

  buildSkyline(world) {
    const colors = ['#37545c', '#536f75', '#3c5b65', '#647b79', '#49666b', '#60766e'];
    const towers = [
      [-85, -145, 19, 15, 52], [-61, -160, 24, 16, 43], [-33, -174, 18, 15, 62],
      [-7, -166, 20, 16, 47], [20, -178, 24, 19, 68], [50, -158, 20, 18, 50], [76, -143, 18, 16, 44],
      [-103, -107, 13, 12, 31], [101, -106, 16, 13, 36], [-74, -188, 15, 14, 34], [72, -192, 18, 16, 57]
    ];
    towers.forEach(([x, z, width, depth, height], i) => makeBuilding(world, x, z, width, depth, height, i + 1, colors));
    // Low, warm haze on the city horizon.
    const haze = new THREE.Mesh(new THREE.PlaneGeometry(280, 34), new THREE.MeshBasicMaterial({ color: '#e3bd85', transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    haze.position.set(0, 16, -134);
    world.add(haze);
    const distant = material('#8c9b91', 0.92, 0.02);
    for (let i = 0; i < 18; i += 1) {
      const x = -112 + i * 13.1;
      const h = 12 + ((i * 11) % 17);
      box(world, x, h / 2, -125 - (i % 4) * 4, 9 + (i % 3) * 2, h, 8, distant, { castShadow: false });
    }
  }

  buildPalms(world) {
    const trees = [
      [-66, -43, 1.25], [66, -48, 1.1], [-72, -75, 1.2], [74, -78, 1.25],
      [-58, -117, 1.05], [63, -119, 1.15], [-39, -27, 0.84], [42, -28, 0.92],
      [-35, -42, 1.15], [35, -42, 1.12], [-93, -38, 1.05], [96, -57, 0.92],
      [-47, -136, 1.0], [45, -138, 1.08]
    ];
    trees.forEach(([x, z, scale], index) => makePalm(world, x, z, scale, index + 1));
    const planterGround = material('#536d52', 0.97);
    for (const [x, z] of [[-39, -33], [39, -31], [-63, -49], [62, -49]]) {
      const island = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2.0, 0.28, 12), planterGround);
      island.position.set(x, 0.1, z);
      world.add(island);
    }
  }

  buildTrackside(world) {
    const light = material('#b6b7aa', 0.6, 0.18);
    const dark = material('#394240', 0.78, 0.08);
    const red = material('#a45242', 0.65, 0.12);
    for (let i = 0; i < 8; i += 1) {
      const x = -47 + i * 13.4;
      const width = i % 3 === 0 ? 8.5 : 6.5;
      const height = 4.2 + (i % 2) * 0.7;
      box(world, x, height * 0.5, -25.1, width, height, 4.6, i % 2 ? dark : material('#4e5e59', 0.7, 0.08));
      box(world, x, height + 0.08, -25.1, width + 0.25, 0.16, 4.9, light);
      for (let window = 0; window < 4; window += 1) {
        box(world, x - width * 0.36 + window * width * 0.24, height * 0.57, -22.77, 1.3, 1.45, 0.06, material('#8aa0a0', 0.22, 0.3), { castShadow: false });
      }
      box(world, x, 0.25, -22.7, width * 0.86, 0.3, 0.12, red, { castShadow: false });
    }
    for (let i = 0; i < 12; i += 1) {
      const x = -55 + i * 10;
      beam(world, [x, 0.15, -31.6], [x, 1.45, -31.6], 0.035, light, 6);
      beam(world, [x, 1.45, -31.6], [x + 9.4, 1.45, -31.6], 0.028, light, 6);
    }
  }

  buildCrowd(world) {
    const bodyGeometry = new THREE.CylinderGeometry(0.11, 0.15, 0.46, 6);
    const headGeometry = new THREE.SphereGeometry(0.11, 7, 6);
    const bodyMaterial = material('#7c8980', 0.9, 0.01);
    const headMaterial = material('#ceb098', 0.92, 0.01);
    const count = 96;
    const bodies = new THREE.InstancedMesh(bodyGeometry, bodyMaterial, count);
    const heads = new THREE.InstancedMesh(headGeometry, headMaterial, count);
    const dummy = new THREE.Object3D();
    const shirtPalette = ['#8a9586', '#45636b', '#b66d5a', '#c8b795', '#56685f', '#7d6778', '#d0cdbb'];
    let index = 0;
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 24; col += 1) {
        const x = -30 + col * 2.58 + (row % 2) * 0.45;
        const z = -68 - row * 0.75 + ((col % 4) - 1.5) * 0.07;
        const y = 0.42 + ((row + col) % 2) * 0.06;
        dummy.position.set(x, y + 0.34, z);
        dummy.rotation.set(0, Math.PI + ((col % 5) - 2) * 0.08, 0);
        dummy.scale.set(1, 0.95 + (col % 3) * 0.05, 1);
        dummy.updateMatrix();
        bodies.setMatrixAt(index, dummy.matrix);
        bodies.setColorAt(index, new THREE.Color(shirtPalette[(col * 3 + row) % shirtPalette.length]));
        dummy.position.set(x, y + 0.72, z);
        dummy.scale.setScalar(0.82 + (col % 3) * 0.08);
        dummy.updateMatrix();
        heads.setMatrixAt(index, dummy.matrix);
        index += 1;
      }
    }
    bodies.count = heads.count = index;
    bodies.instanceMatrix.needsUpdate = heads.instanceMatrix.needsUpdate = true;
    if (bodies.instanceColor) bodies.instanceColor.needsUpdate = true;
    if (heads.instanceColor) heads.instanceColor.needsUpdate = true;
    bodies.castShadow = heads.castShadow = false;
    world.add(bodies, heads);
  }

  buildCars(world) {
    const colors = ['#b23d35', '#d6c6a3', '#384f59', '#879a87', '#b88b49', '#4d6265'];
    for (let i = 0; i < colors.length; i += 1) {
      const car = createF1Car(world, colors[i], i);
      car.userData.phase = (i / colors.length) * TAU;
      this.roadCars.push(car);
    }
  }

  buildLightingDetails(world) {
    const flood = material('#d4d1bd', 0.42, 0.24);
    for (const x of [-42, -22, 22, 42]) {
      beam(world, [x, 0.3, -94], [x, 13.8, -98], 0.14, flood, 7);
      beam(world, [x, 13.8, -98], [x + (x < 0 ? 4 : -4), 13.8, -98], 0.1, flood, 7);
      const lamp = new THREE.PointLight('#e7d8b3', 0.4, 16, 2);
      lamp.position.set(x + (x < 0 ? 4 : -4), 13.6, -97.5);
      world.add(lamp);
    }
    for (const x of [-35, 35]) {
      const billboard = box(world, x, 2.4, -47, 0.24, 4.8, 7.2, material('#34464a', 0.54, 0.25));
      billboard.rotation.y = x < 0 ? Math.PI / 2 : -Math.PI / 2;
      addTextSprite(billboard, x < 0 ? 'COASTAL CUP' : 'MIAMI CIRCUIT', { scale: 5.4, background: 'rgba(25,48,49,.96)' }).position.set(0, 0.01, 0.14);
    }
  }

  async initialize(onProgress = () => {}) {
    const loader = new GLTFLoader();
    try {
      onProgress('LOADING OPERATIVE');
      this.humanPackage = await loadHumanPackage('./assets/humanforge');
      const rifleTask = loader.loadAsync('./assets/weapons/sniper-rifle.glb');
      this.rifleTexture = await new THREE.TextureLoader().loadAsync('./assets/weapons/sniper-charcoal.png');
      this.rifleTexture.colorSpace = THREE.SRGBColorSpace;
      this.rifleTexture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
      const rifleGltf = await rifleTask;
      this.rifleAsset = rifleGltf.scene;
      this.prepareRifle(this.rifleAsset);
      onProgress('BUILDING OPERATIVE');
      await this.createPlayer();
      onProgress('SYNCING LIVE INTELLIGENCE');
      await this.createMissionActors();
      this.ready = true;
      return { ready: true };
    } catch (error) {
      console.error('3D asset initialization failed; fallback models are active.', error);
      this.assetError = error;
      this.createFallbackPlayer();
      this.createFallbackMissionActors();
      this.ready = true;
      return { ready: true, fallback: true, error };
    }
  }

  prepareRifle(model) {
    model.traverse((object) => {
      if (!object.isMesh) return;
      object.castShadow = true;
      object.receiveShadow = true;
      if (Array.isArray(object.material)) {
        object.material = object.material.map((source) => {
          const next = source.clone();
          next.map = this.rifleTexture;
          next.color.set('#e7e8e3');
          next.roughness = 0.46;
          next.metalness = object.name.toLowerCase().includes('scope') ? 0.48 : 0.22;
          next.needsUpdate = true;
          return next;
        });
      } else if (object.material) {
        const next = object.material.clone();
        next.map = this.rifleTexture;
        next.color.set('#e7e8e3');
        next.roughness = object.name.toLowerCase().includes('scope') ? 0.35 : 0.5;
        next.metalness = object.name.toLowerCase().includes('scope') ? 0.48 : 0.24;
        next.needsUpdate = true;
        object.material = next;
      }
    });
  }

  async makeAvatar(config, textureSize = '2k') {
    const avatar = new HumanAvatar(this.humanPackage);
    avatar.textureSize = textureSize;
    avatar.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    avatar.normalMaps = true;
    await avatar.setConfig(config);
    avatar.group.traverse((object) => {
      if (object.isMesh) {
        object.castShadow = true;
        object.receiveShadow = true;
        object.frustumCulled = false;
      }
    });
    avatar.group.getObjectByName('body')?.skeleton.pose();
    avatar.group.updateMatrixWorld(true);
    return avatar;
  }

  playerConfig() {
    return {
      gender: 1, age: 0.42, muscle: 0.66, weight: 0.5, height: 0.52,
      proportions: 0.52, cupSize: 0.5, firmness: 0.55,
      african: 0, asian: 0, caucasian: 1, detail: {},
      skin: 'middleage_caucasian_male', skinTint: '#fff4ee',
      eyes: 'brownlight', eyebrows: 'eyebrow004', eyebrowColor: '#2e2522',
      eyelashes: null, hair: null, hairColor: '#171617',
      clothes: ['male_casualsuit06', 'shoes01'], garmentColors: { outfit: '#ffffff' }
    };
  }

  npcConfig() {
    return {
      gender: 1, age: 0.56, muscle: 0.48, weight: 0.51, height: 0.5,
      proportions: 0.5, cupSize: 0.5, firmness: 0.5,
      african: 0, asian: 0, caucasian: 1, detail: {},
      skin: 'middleage_caucasian_male', skinTint: '#fff1e6',
      eyes: 'brownlight', eyebrows: 'eyebrow004', eyebrowColor: '#30231e',
      eyelashes: null, hair: 'short02', hairColor: '#302723',
      clothes: ['male_casualsuit05', 'shoes01'], garmentColors: { outfit: '#ffffff' }
    };
  }

  async createPlayer() {
    const avatar = await this.makeAvatar(this.playerConfig(), '2k');
    avatar.group.name = 'FieldOperative';
    const poloDetails = addPoloDetails(avatar);
    this.player = { avatar, poloDetails, bones: {}, legRest: new Map(), armRest: new Map(), movePhase: 0, moving: false, weaponDrawn: true, disguised: false };
    this.playerRoot.add(avatar.group);
    this.preparePlayerRifle(avatar);
    for (const name of ['LeftUpLeg', 'RightUpLeg', 'LeftLeg', 'RightLeg', 'LeftFoot', 'RightFoot']) {
      const bone = pickBone(avatar, name);
      if (bone) this.player.legRest.set(name, bone.quaternion.clone());
    }
    for (const name of ['LeftArm', 'LeftForeArm', 'LeftHand', 'RightArm', 'RightForeArm', 'RightHand',
      'LeftHandIndex1', 'LeftHandIndex2', 'LeftHandIndex3', 'LeftHandMiddle1', 'LeftHandMiddle2', 'LeftHandMiddle3',
      'LeftHandRing1', 'LeftHandRing2', 'LeftHandRing3', 'LeftHandPinky1', 'LeftHandPinky2', 'LeftHandPinky3',
      'LeftHandThumb1', 'LeftHandThumb2', 'LeftHandThumb3', 'RightHandIndex1', 'RightHandIndex2', 'RightHandIndex3',
      'RightHandMiddle1', 'RightHandMiddle2', 'RightHandMiddle3', 'RightHandRing1', 'RightHandRing2', 'RightHandRing3',
      'RightHandPinky1', 'RightHandPinky2', 'RightHandPinky3', 'RightHandThumb1', 'RightHandThumb2', 'RightHandThumb3']) {
      const bone = pickBone(avatar, name);
      if (bone) this.player.armRest.set(name, bone.quaternion.clone());
    }
    this.posePlayerArms(0.19);
    this.player.rifleBasePosition = this.player.rifleRoot.position.clone();
    this.playerRoot.position.set(-0.72, 10.82, 7.35);
    avatar.group.rotation.y = Math.PI;
  }

  preparePlayerRifle(avatar) {
    const rifleRoot = new THREE.Group();
    rifleRoot.name = 'SniperRifleSocket';
    const model = this.rifleAsset.clone(true);
    rifleRoot.add(model);
    avatar.group.add(rifleRoot);
    this.player.rifleRoot = rifleRoot;
    this.player.rifleModel = model;
  }

  posePlayerArms(pitch) {
    if (!this.player?.avatar || !this.player.rifleRoot) return;
    const avatar = this.player.avatar;
    for (const [name, rest] of this.player.armRest || []) {
      const bone = pickBone(avatar, name);
      if (bone) bone.quaternion.copy(rest);
    }
    avatar.group.updateMatrixWorld(true);
    const leftUpper = pickBone(avatar, 'LeftForeArm');
    const leftLower = pickBone(avatar, 'LeftHand');
    const rightUpper = pickBone(avatar, 'RightForeArm');
    const rightLower = pickBone(avatar, 'RightHand');
    const leftArm = pickBone(avatar, 'LeftArm');
    const rightArm = pickBone(avatar, 'RightArm');
    if (!leftUpper || !leftLower || !rightUpper || !rightLower || !leftArm || !rightArm) return;

    const rightTarget = [-0.15, 1.49, -0.05];
    const supportReach = 0.27;
    const forward = new THREE.Vector3(0, -Math.sin(pitch), Math.cos(pitch));
    const leftTarget = [
      rightTarget[0] + 0.16 + forward.x * supportReach,
      rightTarget[1] + forward.y * supportReach + 0.02,
      rightTarget[2] + forward.z * supportReach
    ];
    avatar.group.updateMatrixWorld(true);
    const rightTargetWorld = avatar.group.localToWorld(new THREE.Vector3(...rightTarget)).toArray();
    const leftTargetWorld = avatar.group.localToWorld(new THREE.Vector3(...leftTarget)).toArray();
    const leftShoulder = leftArm.getWorldPosition(new THREE.Vector3()).toArray();
    const rightShoulder = rightArm.getWorldPosition(new THREE.Vector3()).toArray();
    const leftElbow = solveElbow(leftShoulder, leftTargetWorld, 'left', leftUpper.position.length(), leftLower.position.length());
    const rightElbow = solveElbow(rightShoulder, rightTargetWorld, 'right', rightUpper.position.length(), rightLower.position.length());
    aimBone(avatar, 'LeftArm', 'LeftForeArm', leftElbow);
    aimBone(avatar, 'LeftForeArm', 'LeftHand', leftTargetWorld);
    aimBone(avatar, 'RightArm', 'RightForeArm', rightElbow);
    aimBone(avatar, 'RightForeArm', 'RightHand', rightTargetWorld);
    bendHand(avatar, 'Left');
    bendHand(avatar, 'Right', true);

    const yaw = new THREE.Quaternion().setFromAxisAngle(UP, Math.PI);
    const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), pitch);
    this.player.rifleRoot.quaternion.copy(tilt).multiply(yaw);
    // The CC0 glTF scene places the trigger 5.6 cm along its local +Z axis.
    const triggerOffset = new THREE.Vector3(0, 0.0175, 0.0556).applyQuaternion(this.player.rifleRoot.quaternion);
    this.player.rifleRoot.position.set(
      rightTarget[0] - triggerOffset.x,
      rightTarget[1] - triggerOffset.y,
      rightTarget[2] - triggerOffset.z
    );
    avatar.group.updateMatrixWorld(true);
    this.player.rifleBasePosition = this.player.rifleRoot.position.clone();
  }

  async createMissionActors() {
    const positions = [
      { role: 'target', x: 0.15, z: -29.25, tint: '#a9a291' },
      { role: 'guard', x: -4.1, z: -30.05, tint: '#5c6766' },
      { role: 'guard', x: 4.4, z: -29.7, tint: '#4b5654' },
      { role: 'roofGuard', x: 3.6, y: this.roofY, z: 4.2, tint: '#536d59' }
    ];
    const config = this.npcConfig();
    const actors = await Promise.all(positions.map(async (entry) => {
      const avatar = await this.makeAvatar(config, '1k');
      const outfit = avatar.group.getObjectByName('clothes-male_casualsuit05');
      if (outfit?.material?.color) outfit.material.color.set(entry.tint);
      const root = new THREE.Group();
      root.position.set(entry.x, entry.y ?? 3.43, entry.z);
      root.add(avatar.group);
      avatar.group.rotation.y = Math.PI;
      root.add(addActorShadow(root, 0.35, 0.22));
      this.actorLayer.add(root);
      return { ...entry, avatar, root, phase: Math.random() * TAU };
    }));
    this.target = actors.find((actor) => actor.role === 'target');
    this.guards = actors.filter((actor) => actor.role === 'guard');
    this.roofGuard = actors.find((actor) => actor.role === 'roofGuard');
    this.roofGuard.status = 'patrolling';
    this.roofGuard.heading = 0;
    this.roofGuard.patrolPath = [
      { x: 3.6, z: 4.2 }, { x: 3.6, z: 6.4 }, { x: -3.5, z: 6.4 }, { x: -3.5, z: 4.2 }
    ];
    this.roofGuard.patrolIndex = 1;
    this.roofGuard.downTimer = 0;
    this.roofGuard.hidden = false;
    this.targetLabel = addTextSprite(this.dynamic, 'MARCUS WARD', { scale: 2.0, color: '#efe2c5', background: 'rgba(44,26,23,.88)', border: 'rgba(211,165,113,.8)' });
    this.targetLabel.position.set(this.target.x, 5.7, this.target.z);
  }

  createFallbackPlayer() {
    const root = new THREE.Group();
    const skin = material('#d1a98e', 0.8);
    const shirt = material('#dfacb0', 0.8);
    const pants = material('#4f5d60', 0.9);
    const boot = material('#342d29', 0.8);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.66, 4, 8), shirt);
    torso.position.y = 1.22;
    root.add(torso);
    const legs = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.68, 4, 7), pants);
    legs.position.set(0, 0.48, 0);
    root.add(legs);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 14), skin);
    head.position.y = 1.86;
    root.add(head);
    const rifle = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 1.25), material('#262b2d', 0.42, 0.3));
    rifle.position.set(0.08, 1.43, 0.25);
    root.add(rifle);
    this.playerRoot.add(root);
    this.player = { fallback: root, fallbackRifle: rifle, fallbackShirt: shirt, legRest: new Map(), movePhase: 0, weaponDrawn: true, disguised: false };
    this.playerRoot.position.set(-0.72, 10.82, 7.35);
  }

  createFallbackMissionActors() {
    const skin = material('#cda98b', 0.86);
    const suit = material('#69726e', 0.82);
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.72, 3, 8), suit);
    body.position.y = 1.05;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.23, 12, 10), skin);
    head.position.y = 1.72;
    const makeFallback = (entry) => {
      const root = new THREE.Group();
      root.position.set(entry.x, entry.y ?? 3.43, entry.z);
      root.add(body.clone(), head.clone());
      this.actorLayer.add(root);
      return { ...entry, root, avatar: null, phase: 0 };
    };
    this.target = makeFallback({ role: 'target', x: 0.15, z: -29.25 });
    this.guards = [makeFallback({ role: 'guard', x: -4.1, z: -30.05 }), makeFallback({ role: 'guard', x: 4.4, z: -29.7 })];
    this.roofGuard = makeFallback({ role: 'roofGuard', x: 3.6, y: this.roofY, z: 4.2 });
    this.roofGuard.status = 'patrolling';
    this.roofGuard.heading = 0;
    this.roofGuard.patrolPath = [
      { x: 3.6, z: 4.2 }, { x: 3.6, z: 6.4 }, { x: -3.5, z: 6.4 }, { x: -3.5, z: 4.2 }
    ];
    this.roofGuard.patrolIndex = 1;
    this.roofGuard.downTimer = 0;
    this.roofGuard.hidden = false;
    this.targetLabel = addTextSprite(this.dynamic, 'MARCUS WARD', { scale: 2.0, color: '#efe2c5', background: 'rgba(44,26,23,.88)', border: 'rgba(211,165,113,.8)' });
    this.targetLabel.position.set(this.target.x, 5.7, this.target.z);
  }

  setAiming(value) {
    this.aiming = Boolean(value);
    if (this.aiming) this.setWeaponDrawn(true);
  }

  setWeaponDrawn(value) {
    if (!this.player) return;
    const drawn = Boolean(value);
    this.player.weaponDrawn = drawn;
    if (this.player.rifleRoot) this.player.rifleRoot.visible = drawn;
    if (this.player.fallbackRifle) this.player.fallbackRifle.visible = drawn;
    if (drawn && this.player.avatar) this.posePlayerArms(this.cameraPitch);
    else if (this.player.avatar) {
      for (const [name, rest] of this.player.armRest || []) {
        const bone = pickBone(this.player.avatar, name);
        if (bone) bone.quaternion.copy(rest);
      }
      this.player.avatar.group.updateMatrixWorld(true);
    }
  }

  async setDisguise(value, type = 'crew') {
    if (!this.player) return;
    const disguised = Boolean(value);
    const outfitId = !disguised ? 'male_casualsuit06' : type === 'security' ? 'male_casualsuit05' : 'male_worksuit01';
    this.player.disguised = disguised;
    this.player.disguiseType = disguised ? type : 'none';
    if (this.player.poloDetails) this.player.poloDetails.visible = !disguised;
    if (this.player.fallbackShirt) this.player.fallbackShirt.color.set(disguised ? (type === 'security' ? '#596b5d' : '#68785f') : '#dfacb0');
    if (this.player.avatar?.setConfig) {
      try {
        await this.player.avatar.setConfig({
          clothes: [outfitId, 'shoes01'],
          garmentColors: { outfit: '#ffffff' }
        });
        const outfit = this.player.avatar.proxies.get(`clothes:${outfitId}`)?.mesh;
        const materials = Array.isArray(outfit?.material) ? outfit.material : [outfit?.material];
        for (const material of materials) {
          if (material?.color) material.color.set(disguised && type === 'security' ? '#78846f' : '#ffffff');
        }
      } catch (error) {
        console.warn('Uniform could not be loaded; using a tinted outfit.', error);
      }
    }
  }

  orbitCamera(deltaX, deltaY) {
    this.cameraYaw += deltaX * 0.0038;
    this.cameraPitch = clamp(this.cameraPitch + deltaY * 0.0026, 0.035, 0.39);
    if (this.aiming && this.player?.avatar) {
      this.player.avatar.group.rotation.y = Math.PI - this.cameraYaw;
      this.posePlayerArms(this.cameraPitch);
    }
  }

  zoomCamera(deltaY) {
    if (this.aiming) {
      this.zoomFov = clamp(this.zoomFov + deltaY * 0.012, 14, 38);
    } else {
      this.cameraDistance = clamp(this.cameraDistance + deltaY * 0.004, 3.5, 6.2);
    }
  }

  getGuardAwareness(state) {
    const guard = this.roofGuard;
    const player = state.player;
    if (!guard || !player || guard.status !== 'patrolling' || guard.hidden) return 0;
    const dx = player.x - guard.root.position.x;
    const dz = player.z - guard.root.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance > 10.5 || distance < 0.05) return 0;
    const facing = (Math.sin(guard.heading) * dx + Math.cos(guard.heading) * dz) / distance;
    if (facing < 0.58) return 0;

    const startY = guard.root.position.y + 1.52;
    const endY = player.y + (state.crouched ? 0.88 : 1.34);
    for (let step = 1; step < 20; step += 1) {
      const t = step / 20;
      const x = guard.root.position.x + dx * t;
      const z = guard.root.position.z + dz * t;
      const y = startY + (endY - startY) * t;
      if (this.roofVisionBlockers.some((block) => x >= block.minX && x <= block.maxX && z >= block.minZ && z <= block.maxZ && y <= block.maxY)) return 0;
    }

    const rangeFactor = clamp(1 - distance / 10.5, 0, 1);
    const coneFactor = clamp((facing - 0.58) / 0.42, 0, 1);
    let rate = 28 + (state.moving ? 10 : 0) + (state.sprinting ? 24 : 0) + (state.weaponDrawn ? 24 : 0) + (state.aiming ? 27 : 0);
    if (state.crouched) rate *= 0.24;
    if (state.disguised) rate *= 0.26;
    return rate * rangeFactor * coneFactor;
  }

  getTakedownStatus(player) {
    const guard = this.roofGuard;
    if (!guard || !player || guard.status === 'subdued' || guard.hidden) return { available: false, distance: Infinity, behind: false };
    const dx = player.x - guard.root.position.x;
    const dz = player.z - guard.root.position.z;
    const distance = Math.hypot(dx, dz);
    const facing = distance > 0.001 ? (Math.sin(guard.heading) * dx + Math.cos(guard.heading) * dz) / distance : 1;
    return { available: distance <= 1.65 && facing < -0.24, distance, behind: facing < -0.24, guard };
  }

  subdueRoofGuard() {
    const guard = this.roofGuard;
    if (!guard || guard.status === 'subdued' || guard.hidden) return false;
    guard.status = 'subdued';
    guard.downTimer = 0;
    guard.root.rotation.set(0, guard.root.rotation.y, 0);
    return true;
  }

  hideRoofGuard() {
    const guard = this.roofGuard;
    if (!guard || guard.status !== 'subdued' || guard.hidden) return false;
    guard.hidden = true;
    guard.status = 'hidden';
    guard.root.visible = false;
    return true;
  }

  raiseRoofAlert(position) {
    const guard = this.roofGuard;
    if (!guard || guard.status !== 'patrolling') return;
    guard.status = 'searching';
    guard.searchTarget = { x: position.x, z: position.z };
    guard.searchTimer = 9.5;
  }

  isNearLocker() {
    const p = this.playerRoot.position;
    return Math.hypot(p.x - this.lockerPosition.x, p.z - this.lockerPosition.z) < 1.85;
  }

  getSubduedGuardDistance() {
    if (!this.roofGuard || this.roofGuard.status !== 'subdued' || this.roofGuard.hidden) return Infinity;
    const p = this.playerRoot.position;
    return Math.hypot(p.x - this.roofGuard.root.position.x, p.z - this.roofGuard.root.position.z);
  }

  updateRoofGuard(dt, state) {
    const guard = this.roofGuard;
    if (!guard || guard.hidden) return;
    if (guard.status === 'subdued') {
      guard.downTimer = Math.min(1, guard.downTimer + dt * 1.5);
      guard.root.rotation.x = -Math.min(1.18, guard.downTimer * 1.18);
      return;
    }

    let destination;
    let speed = 0.9;
    if (guard.status === 'searching') {
      destination = guard.searchTarget;
      speed = 1.75;
      guard.searchTimer -= dt;
      if (guard.searchTimer <= 0) {
        guard.status = 'patrolling';
        destination = null;
      }
    }
    if (!destination) {
      const path = guard.patrolPath;
      destination = path?.[guard.patrolIndex];
      if (!destination) return;
      const remaining = Math.hypot(destination.x - guard.root.position.x, destination.z - guard.root.position.z);
      if (remaining < 0.14) {
        guard.patrolIndex = (guard.patrolIndex + 1) % path.length;
        destination = path[guard.patrolIndex];
      }
    }

    const dx = destination.x - guard.root.position.x;
    const dz = destination.z - guard.root.position.z;
    const distance = Math.hypot(dx, dz);
    if (distance > 0.02) {
      const travel = Math.min(distance, speed * dt);
      guard.root.position.x += dx / distance * travel;
      guard.root.position.z += dz / distance * travel;
      guard.heading = Math.atan2(dx, dz);
    }
    if (guard.avatar) guard.avatar.group.rotation.y = guard.heading;
    else guard.root.rotation.y = guard.heading;
  }

  update(state, dt) {
    const delta = clamp(dt, 0, 0.05);
    this.time += delta;
    if (state.cameraYaw !== undefined) this.cameraYaw = state.cameraYaw;
    if (state.cameraPitch !== undefined && Math.abs(state.cameraPitch - this.cameraPitch) > 0.002) {
      this.cameraPitch = state.cameraPitch;
      if (this.aiming && this.player?.avatar) this.posePlayerArms(this.cameraPitch);
    }
    this.aiming = Boolean(state.aiming);
    if (state.weaponDrawn !== undefined && Boolean(state.weaponDrawn) !== Boolean(this.player?.weaponDrawn)) {
      this.setWeaponDrawn(Boolean(state.weaponDrawn));
    }
    const p = state.player || { x: -0.72, y: 10.82, z: 7.35 };
    this.playerRoot.position.set(p.x, p.y, p.z);
    if (this.player?.avatar) {
      const heading = state.heading ?? Math.PI;
      this.player.avatar.group.rotation.y = heading;
      const crouchScale = state.crouched ? 0.84 : 1;
      this.player.avatar.group.scale.y = smooth(this.player.avatar.group.scale.y, crouchScale, 9, delta);
      const moving = Math.hypot(state.velocityX || 0, state.velocityZ || 0) > 0.08;
      this.player.movePhase += delta * (state.sprinting ? 10 : 7.4);
      this.player.moving = moving;
      for (const [name, rest] of this.player.legRest) {
        const bone = pickBone(this.player.avatar, name);
        if (!bone) continue;
        const left = name.startsWith('Left');
        const phase = this.player.movePhase + (left ? 0 : Math.PI);
        let swing = moving ? Math.sin(phase) * (state.sprinting ? 0.42 : 0.26) : Math.sin(this.time * 1.15 + (left ? 0 : Math.PI)) * 0.014;
        if (name === 'LeftLeg' || name === 'RightLeg') swing += moving ? Math.max(0, Math.sin(phase + 0.5)) * 0.22 : 0;
        bone.quaternion.copy(rest).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), swing));
      }
      this.player.rifleRoot.position.copy(this.player.rifleBasePosition);
      this.player.rifleRoot.position.y += moving ? Math.sin(this.player.movePhase * 2) * 0.006 : Math.sin(this.time * 1.2) * 0.004;
      this.playerRoot.updateMatrixWorld(true);
    } else if (this.player?.fallback) {
      this.playerRoot.rotation.y = state.heading ?? Math.PI;
    }

    if (this.target && !this.targetDown) {
      const sway = Math.sin(this.time * 0.23 + 0.7) * 0.32;
      const step = Math.sin(this.time * 0.13) * 0.22;
      this.target.root.position.x = this.targetStartX + sway;
      this.target.root.position.z = -29.25 + step;
      if (this.target.avatar) this.target.avatar.group.rotation.y = Math.PI + Math.sin(this.time * 0.18) * 0.12;
      this.targetLabel?.position.set(this.target.root.position.x, 5.7, this.target.root.position.z);
      if (this.targetLabel) this.targetLabel.visible = this.aiming && !this.targetDown;
    }
    if (this.targetDown && this.target) {
      this.targetDownTimer = Math.min(1, this.targetDownTimer + delta * 1.45);
      this.target.root.rotation.x = -Math.min(1.18, this.targetDownTimer * 1.18);
      if (this.targetLabel) this.targetLabel.visible = false;
    }
    this.guards.forEach((guard, i) => {
      if (!guard.avatar) return;
      const look = this.aiming && !this.targetDown ? (i === 0 ? 0.16 : -0.16) : Math.sin(this.time * 0.32 + guard.phase) * 0.06;
      guard.avatar.group.rotation.y = Math.PI + look;
    });
    this.updateRoofGuard(delta, state);

    this.updateCars(delta);
    this.updateCamera(state, delta);
    this.updateEffects(delta);
    this.sun.position.x = -32 + Math.sin(this.time * 0.025) * 4;
  }

  updateCars(dt) {
    for (const car of this.roadCars) {
      car.userData.phase += car.userData.speed * dt;
      const t = car.userData.phase;
      const rx = 51.4, rz = 27.4;
      car.position.set(Math.cos(t) * rx, 0.12, -68 + Math.sin(t) * rz);
      const dx = -Math.sin(t) * rx;
      const dz = Math.cos(t) * rz;
      car.rotation.y = Math.atan2(-dx, -dz);
    }
  }

  updateCamera(state, dt) {
    const p = state.player || { x: -0.72, y: 10.82, z: 7.35 };
    const yaw = this.cameraYaw;
    const forward = new THREE.Vector3(Math.sin(yaw), 0, -Math.cos(yaw));
    const right = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));
    const back = forward.clone().negate();
    const aiming = this.aiming;
    const dist = aiming ? 2.75 : this.cameraDistance;
    const side = aiming ? -0.64 : this.cameraSide;
    const height = (aiming ? 1.82 : this.cameraHeight) - (state.crouched ? 0.2 : 0);
    const desired = new THREE.Vector3(p.x, p.y, p.z).addScaledVector(back, dist).addScaledVector(right, side);
    desired.y += height;
    const alpha = 1 - Math.exp(-9 * dt);
    this.cameraPosition.lerp(desired, alpha);
    this.camera.position.copy(this.cameraPosition);
    const pitch = this.cameraPitch;
    const look = new THREE.Vector3(
      Math.sin(yaw) * Math.cos(pitch),
      -Math.sin(pitch),
      -Math.cos(yaw) * Math.cos(pitch)
    );
    this.camera.lookAt(this.camera.position.clone().addScaledVector(look, 100));
    const targetFov = aiming ? this.zoomFov : 54;
    if (Math.abs(this.camera.fov - targetFov) > 0.08) {
      this.camera.fov = smooth(this.camera.fov, targetFov, 7, dt);
      this.camera.updateProjectionMatrix();
    }
  }

  fire() {
    if (!this.target || this.targetDown) return 'complete';
    const direction = this.camera.getWorldDirection(new THREE.Vector3()).normalize();
    const origin = this.camera.position.clone();
    const center = this.target.root.position.clone().add(new THREE.Vector3(0, 1.23, 0));
    const toTarget = center.clone().sub(origin);
    const along = toTarget.dot(direction);
    const closest = origin.clone().addScaledVector(direction, along);
    const radius = 0.53;
    const hit = along > 0 && closest.distanceTo(center) < radius;
    this.spawnShot(origin, direction, hit ? center : origin.clone().addScaledVector(direction, 72));
    if (hit) {
      this.targetDown = true;
      this.targetDownTimer = 0;
      return 'hit';
    }
    return 'miss';
  }

  spawnShot(origin, direction, end) {
    const start = origin.clone();
    if (this.player?.rifleRoot) {
      this.playerRoot.updateMatrixWorld(true);
      start.copy(this.player.rifleRoot.localToWorld(new THREE.Vector3(0, 0.015, -0.77)));
    }
    const points = [start, end.clone()];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: '#f1cf86', transparent: true, opacity: 0.92, linewidth: 1, depthWrite: false }));
    this.effects.add(line);
    this.effectsToExpire.push({ object: line, life: 0.16, maxLife: 0.16, kind: 'line' });
    const flash = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffdb9a', transparent: true, opacity: 0.95, toneMapped: false }));
    flash.position.copy(start);
    this.effects.add(flash);
    this.effectsToExpire.push({ object: flash, life: 0.07, maxLife: 0.07, kind: 'flash' });
    const light = new THREE.PointLight('#f3bf72', 1.7, 4, 2);
    light.position.copy(start);
    this.effects.add(light);
    this.effectsToExpire.push({ object: light, life: 0.055, maxLife: 0.055, kind: 'light' });
  }

  updateEffects(dt) {
    for (const effect of [...this.effectsToExpire]) {
      effect.life -= dt;
      if (effect.kind === 'line') effect.object.material.opacity = Math.max(0, effect.life / effect.maxLife);
      if (effect.kind === 'flash') effect.object.scale.setScalar(0.65 + (1 - effect.life / effect.maxLife) * 1.7);
      if (effect.kind === 'light') effect.object.intensity = 1.7 * Math.max(0, effect.life / effect.maxLife);
      if (effect.life <= 0) {
        this.effects.remove(effect.object);
        effect.object.geometry?.dispose?.();
        effect.object.material?.dispose?.();
        this.effectsToExpire.splice(this.effectsToExpire.indexOf(effect), 1);
      }
    }
  }

  resetMissionActors() {
    this.targetDown = false;
    this.targetDownTimer = 0;
    if (this.target) {
      this.target.root.rotation.set(0, 0, 0);
      this.target.root.position.set(0.15, 3.43, -29.25);
      this.targetStartX = 0.15;
    }
    if (this.roofGuard) {
      this.roofGuard.status = 'patrolling';
      this.roofGuard.hidden = false;
      this.roofGuard.root.visible = true;
      this.roofGuard.root.position.set(3.6, this.roofY, 4.2);
      this.roofGuard.root.rotation.set(0, 0, 0);
      this.roofGuard.heading = 0;
      this.roofGuard.patrolIndex = 1;
      this.roofGuard.downTimer = 0;
      this.roofGuard.searchTarget = null;
      this.roofGuard.searchTimer = 0;
      if (this.roofGuard.avatar) this.roofGuard.avatar.group.rotation.set(0, 0, 0);
    }
    this.setWeaponDrawn(true);
    this.setDisguise(false);
  }

  targetRange() {
    if (!this.target) return 0;
    return Math.round(this.camera.position.distanceTo(this.target.root.position.clone().add(new THREE.Vector3(0, 1.23, 0))));
  }

  getPlayerPosition() {
    return this.playerRoot.position.clone();
  }

  getNearExit() {
    const p = this.playerRoot.position;
    for (const [type, position] of Object.entries(this.exitPositions)) {
      if (Math.hypot(p.x - position.x, p.z - position.z) < 1.85) return type;
    }
    return null;
  }

  isNearExit() {
    return Boolean(this.getNearExit());
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.resizeObserver?.disconnect();
    this.renderer.dispose();
  }
}
