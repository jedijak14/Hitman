import * as THREE from './vendor/three.module.js';
import { GLTFLoader } from './vendor/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from './vendor/addons/utils/SkeletonUtils.js';
import { mergeGeometries } from './vendor/addons/utils/BufferGeometryUtils.js';

const UNIT = 0.01;
const SCALE = (value) => value * UNIT;
const SHADOW_GEOMETRY = new THREE.CircleGeometry(0.34, 18);
const CROWD_SHADOW_GEOMETRY = new THREE.CircleGeometry(0.24, 16);
const ACTOR_HEIGHT = 1.86;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const point = (x, y, height = 0) => new THREE.Vector3(SCALE(x), height, SCALE(y));

const ROLE_STYLE = {
  guest: { suit: ['#7b817f', '#536a7d', '#7c5e56', '#597466', '#90785c'], skin: '#fff2e2', gear: 'guest' },
  executive: { suit: ['#202d3b', '#303740', '#343c48'], skin: '#fff0dd', gear: 'executive' },
  security: { suit: ['#18242b', '#202a30'], skin: '#fff2e2', gear: 'security' },
  technician: { suit: ['#855a3c', '#786044'], skin: '#fff0df', gear: 'technician' },
  'event-staff': { suit: ['#244a4a', '#1e5157'], skin: '#fff1df', gear: 'staff' }
};

function standard(color, roughness = 0.78, metalness = 0.02, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
}
function basic(color, opacity = 1, extra = {}) {
  return new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, ...extra });
}

function addMesh(group, geometry, material, x, y, z, rx = 0, ry = 0, rz = 0) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  group.add(mesh);
  return mesh;
}

function makeBox(group, x, z, width, depth, height, color, y = height / 2, material = null, options = {}) {
  const geometry = new THREE.BoxGeometry(Math.max(0.001, width), Math.max(0.001, height), Math.max(0.001, depth));
  const mesh = new THREE.Mesh(geometry, material || standard(color, options.roughness ?? 0.72, options.metalness ?? 0.02));
  mesh.position.set(x, y, z);
  if (options.rotationY) mesh.rotation.y = options.rotationY;
  if (options.castShadow) mesh.castShadow = true;
  if (options.receiveShadow) mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function makePlane(group, x, z, width, depth, color, y = 0.015, material = null) {
  const geometry = new THREE.PlaneGeometry(width, depth);
  const mesh = new THREE.Mesh(geometry, material || standard(color, 0.94));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function mergeMeshes(group) {
  const batches = new Map();
  const separate = [];
  group.updateMatrixWorld(true);
  for (const child of [...group.children]) {
    if (!child.isMesh || child.userData.keepSeparate || Array.isArray(child.material)) {
      separate.push(child);
      continue;
    }
    child.updateMatrix();
    const material = child.material;
    const color = material.color?.getHexString?.() || '';
    const emissive = material.emissive?.getHexString?.() || '';
    const key = [material.type, color, material.roughness, material.metalness, material.opacity, material.transparent, material.depthWrite, material.side, emissive, material.emissiveIntensity, material.map?.uuid || ''].join('|');
    if (!batches.has(key)) batches.set(key, { material, geometries: [], castShadow: false, receiveShadow: false });
    const batch = batches.get(key);
    const geometry = child.geometry.clone();
    geometry.applyMatrix4(child.matrix);
    batch.geometries.push(geometry);
    batch.castShadow ||= child.castShadow;
    batch.receiveShadow ||= child.receiveShadow;
    group.remove(child);
    child.geometry.dispose();
  }
  for (const batch of batches.values()) {
    if (batch.geometries.length === 0) continue;
    const merged = batch.geometries.length === 1 ? batch.geometries[0] : mergeGeometries(batch.geometries, false);
    if (!merged) {
      batch.geometries.forEach((geometry) => {
        const mesh = new THREE.Mesh(geometry, batch.material);
        mesh.castShadow = batch.castShadow;
        mesh.receiveShadow = batch.receiveShadow;
        group.add(mesh);
      });
      continue;
    }
    if (batch.geometries.length > 1) batch.geometries.forEach((geometry) => geometry.dispose());
    const mesh = new THREE.Mesh(merged, batch.material);
    mesh.castShadow = batch.castShadow;
    mesh.receiveShadow = batch.receiveShadow;
    group.add(mesh);
  }
  separate.forEach((child) => group.add(child));
  return group;
}

function makeWedgeGeometry(range, fov) {
  const segments = 20;
  const half = fov / 2;
  const vertices = [0, 0.001, 0];
  const indices = [];
  for (let i = 0; i <= segments; i += 1) {
    const angle = -half + (fov * i) / segments;
    vertices.push(Math.cos(angle) * range, 0.001, Math.sin(angle) * range);
    if (i > 0) {
      const current = i;
      indices.push(0, current, current + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function buildBadge(gear, material, x, y, z, width = 0.16, height = 0.12) {
  makeBox(gear, x, z, width, 0.022, height, '#ffffff', y, material);
  makeBox(gear, x, z + 0.014, width * 0.46, 0.007, height * 0.12, '#d3b46a', y + height * 0.17, null);
}

function cylinderBetween(group, start, end, radius, material, radialSegments = 8) {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const delta = new THREE.Vector3().subVectors(b, a);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, delta.length(), radialSegments), material);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  group.add(mesh);
  return mesh;
}

function disposeGroupContents(group, disposeAll = false) {
  for (const child of [...group.children]) {
    group.remove(child);
    child.traverse?.((node) => {
      if (node.geometry && (disposeAll || node.userData.ownedGeometry)) node.geometry.dispose();
      if (node.material && (disposeAll || node.userData.ownedMaterial)) {
        if (Array.isArray(node.material)) node.material.forEach((material) => material.dispose());
        else node.material.dispose();
      }
    });
  }
}

export function createSilentCoast3D(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.0));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = false;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#7d9692');
  scene.fog = new THREE.Fog('#7d9692', 17, 46);
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 13, 10);

  const hemi = new THREE.HemisphereLight('#eef2ed', '#516058', 1.55);
  scene.add(hemi);
  const fill = new THREE.AmbientLight('#d4d9d5', 0.18);
  scene.add(fill);
  const keyLight = new THREE.DirectionalLight('#fff4dc', 2.0);
  keyLight.position.set(-8, 16, 10);
  keyLight.castShadow = false;
  scene.add(keyLight);
  const environment = new THREE.Group();
  const environmentLights = new THREE.Group();
  const staticProps = new THREE.Group();
  const actorShadowGroup = new THREE.Group();
  const actorShadowMesh = new THREE.InstancedMesh(SHADOW_GEOMETRY, basic('#101313', 0.22, { depthWrite: false }), 80);
  actorShadowMesh.count = 0;
  actorShadowMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  actorShadowMesh.frustumCulled = false;
  actorShadowGroup.add(actorShadowMesh);
  const crowdShadowGroup = new THREE.Group();
  const crowdShadowMesh = new THREE.InstancedMesh(CROWD_SHADOW_GEOMETRY, basic('#101513', 0.17, { depthWrite: false }), 1120);
  crowdShadowMesh.count = 0;
  crowdShadowMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  crowdShadowMesh.frustumCulled = false;
  crowdShadowGroup.add(crowdShadowMesh);
  const actorGroup = new THREE.Group();
  const crowdGroup = new THREE.Group();
  const helperGroup = new THREE.Group();
  const fxGroup = new THREE.Group();
  scene.add(environment, environmentLights, staticProps, actorShadowGroup, crowdShadowGroup, crowdGroup, actorGroup, helperGroup, fxGroup);

  const modelLoader = new GLTFLoader();
  const templates = new Map();
  const actors = new Map();
  const crowdVisuals = [];
  let crowdVisualIndicesKey = '';
  const propVisuals = new Map();
  const actorsLastSeen = new Map();
  let propHaloMesh = null;
  const helpers = { searches: [], sounds: [], cones: new Map(), bodyMarkers: new Map(), coins: [] };
  const coinGeometry = new THREE.CylinderGeometry(0.055, 0.055, 0.009, 14);
  const coinMaterial = standard('#d5b366', 0.26, 0.62, { emissive: new THREE.Color('#6e5120'), emissiveIntensity: 0.08 });
  const dummy = new THREE.Object3D();
  const raycaster = new THREE.Raycaster();
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const ndc = new THREE.Vector2();
  let environmentKey = '';
  let environmentTheme = null;
  let actorSerial = 0;
  let cameraYaw = 0;
  let cameraZoom = 1;
  let cameraDistance = 10.0;
  let dragPointer = null;
  let disposed = false;

  function resize(width, height, pixelRatio = 1) {
    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));
    renderer.setPixelRatio(Math.min(pixelRatio || window.devicePixelRatio || 1, 1.0));
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  function clearEnvironment() {
    disposeGroupContents(environment, true);
    disposeGroupContents(environmentLights, true);
    disposeGroupContents(staticProps, true);
    propHaloMesh = null;
    propVisuals.clear();
  }

  function buildEnvironment(state) {
    clearEnvironment();
    const themeName = state.theme || 'coast';
    const palette = {
      coast: { ground: '#71837a', green: '#436d54', paving: '#b6b5ab', stone: '#b5b2a8', interior: '#b8b6ad', wall: '#575c58', trim: '#e0d7c3', water: '#2b7e8e', accent: '#56a7a2', carpet: '#3c6263', sign: '#bd493f' },
      villa: { ground: '#65775a', green: '#3d6848', paving: '#b3a181', stone: '#c9b898', interior: '#bba384', wall: '#6d5642', trim: '#e4cca0', water: '#327887', accent: '#a96a48', carpet: '#795542', sign: '#aa443a' },
      night: { ground: '#313b3b', green: '#28443b', paving: '#55595a', stone: '#686665', interior: '#454347', wall: '#20262b', trim: '#928e81', water: '#193849', accent: '#8961c2', carpet: '#353449', sign: '#ce414f' }
    }[themeName] || {};
    environmentTheme = palette;
    environmentKey = themeName;

    const waterMaterial = standard(palette.water, 0.19, 0.26, { emissive: new THREE.Color(palette.accent), emissiveIntensity: 0.12 });
    const lawnMaterial = standard(palette.ground, 0.98);
    const grassMaterial = standard(palette.green, 0.98);
    const pavingMaterial = standard(palette.paving, 0.92);
    const interiorMaterial = standard(palette.interior, 0.9);
    const stoneMaterial = standard(palette.stone, 0.82);
    const wallMaterial = standard(palette.wall, 0.88);
    const trimMaterial = standard(palette.trim, 0.58, 0.08);
    const carpetMaterial = standard(palette.carpet, 0.99);

    makePlane(environment, 11, 7, 22, 14, palette.ground, -0.045, lawnMaterial);
    makePlane(environment, 2.275, 5, 4.55, 6.6, palette.paving, -0.018, pavingMaterial);
    makePlane(environment, 17.85, 7.6, 4.6, 6.7, palette.paving, -0.018, pavingMaterial);
    makePlane(environment, 11, 10.45, 22, 3.9, palette.stone, -0.014, stoneMaterial);
    makePlane(environment, 18.55, 13.25, 6.9, 1.5, palette.water, -0.025, waterMaterial);
    if (themeName === 'villa') makePlane(environment, 18.25, 3.075, 3.97, 2.25, palette.paving, -0.012, pavingMaterial);
    else makePlane(environment, 18.25, 3.075, 3.97, 2.25, palette.water, -0.012, waterMaterial);
    makePlane(environment, 10.1, 4.95, 10.8, 7, palette.interior, 0.002, interiorMaterial);
    makePlane(environment, 8.5, 4.95, 2.05, 5.8, palette.wall, 0.012, carpetMaterial);
    makePlane(environment, 11.2, 4.2, 3.0, 1.55, palette.accent, 0.025, standard(palette.accent, 0.48));

    // Broad building shell. The cutaway walls keep the rooms readable from the elevated 3D camera.
    const walls = state.walls || [];
    walls.forEach((wall, index) => {
      const outer = index < 5;
      // Cutaway walls stay below torso height so the venue remains readable without hiding people.
      const h = outer ? 0.72 : 0.48;
      const material = outer ? wallMaterial : stoneMaterial;
      const box = makeBox(environment, SCALE(wall.x + wall.w / 2), SCALE(wall.y + wall.h / 2), SCALE(wall.w), SCALE(wall.h), h, palette.wall, h / 2, material);
      box.castShadow = false;
    });
    // Cap walls with a slim contrasting stone rail.
    walls.forEach((wall, index) => {
      const h = index < 5 ? 0.72 : 0.48;
      makeBox(environment, SCALE(wall.x + wall.w / 2), SCALE(wall.y + wall.h / 2), SCALE(wall.w), SCALE(wall.h), 0.065, palette.trim, h + 0.032, trimMaterial);
    });

    // Terrace paths, pool coping, and the marina edge.
    const coping = standard(palette.trim, 0.45, 0.06);
    if (themeName !== 'villa') {
      makeBox(environment, 18.25, 1.91, 4.18, 0.15, 0.17, palette.trim, 0.085, coping);
      makeBox(environment, 18.25, 4.22, 4.18, 0.15, 0.17, palette.trim, 0.085, coping);
      makeBox(environment, 16.16, 3.06, 0.15, 2.45, 0.17, palette.trim, 0.085, coping);
      makeBox(environment, 20.34, 3.06, 0.15, 2.45, 0.17, palette.trim, 0.085, coping);
    }
    for (let i = 0; i < 14; i += 1) {
      makeBox(environment, 15.45 + i * 0.5, 12.53, 0.026, 0.035, 0.42, palette.trim, 0.22, standard(palette.trim, 0.42, 0.32));
    }

    // The venue's formal hall, stage, service counters, and archive/server wing.
    makeBox(environment, 11.22, 4.12, 2.42, 0.075, 0.35, palette.trim, 0.18, trimMaterial);
    makeBox(environment, 11.22, 4.62, 2.24, 0.05, 0.045, palette.accent, 0.39, standard(palette.accent, 0.32, 0.16, { emissive: new THREE.Color(palette.accent), emissiveIntensity: 0.18 }));
    makeBox(environment, 8.62, 6.8, 1.5, 0.4, 0.92, palette.wall, 0.46, wallMaterial);
    makeBox(environment, 14.22, 2.55, 1.0, 0.34, 0.9, palette.wall, 0.45, wallMaterial);
    for (let i = 0; i < 4; i += 1) {
      makeBox(environment, 13.64 + i * 0.35, 3.05, 0.26, 0.34, 0.86, '#313a40', 0.43, standard('#26343c', 0.52, 0.3));
      makeBox(environment, 13.64 + i * 0.35, 2.875, 0.22, 0.01, 0.27, i % 2 ? '#78b6c4' : '#9a75d0', 0.43, standard(i % 2 ? '#78b6c4' : '#9a75d0', 0.32, 0.12, { emissive: new THREE.Color(i % 2 ? '#256a72' : '#483270'), emissiveIntensity: 0.25 }));
    }
    // Dining tables and chairs arranged in the reception hall.
    for (const [x, z] of [[9.0, 3.0], [10.45, 3.0], [9.0, 5.65], [10.45, 5.65], [11.85, 6.0], [12.35, 3.0]]) {
      addMesh(environment, new THREE.CylinderGeometry(0.28, 0.3, 0.08, 18), trimMaterial, x, 0.77, z);
      addMesh(environment, new THREE.CylinderGeometry(0.045, 0.05, 0.72, 8), wallMaterial, x, 0.38, z);
      for (let c = 0; c < 4; c += 1) {
        const a = c * Math.PI / 2 + Math.PI / 4;
        const cx = x + Math.cos(a) * 0.43;
        const cz = z + Math.sin(a) * 0.43;
        makeBox(environment, cx, cz, 0.28, 0.27, 0.08, palette.wall, 0.44, wallMaterial, { rotationY: -a });
        makeBox(environment, cx + Math.cos(a) * 0.11, cz + Math.sin(a) * 0.11, 0.045, 0.045, 0.4, palette.wall, 0.22, wallMaterial);
      }
    }
    // Rooftop/patio lounge furniture and sun loungers.
    for (const [x, z, angle] of [[16.8, 6.1, 0.1], [18.7, 6.1, -0.1], [16.9, 8.2, 0], [18.9, 8.2, 0]]) {
      makeBox(environment, x, z, 1.1, 0.48, 0.12, '#d3c8b2', 0.33, standard('#d3c8b2', 0.82), { rotationY: angle });
      makeBox(environment, x, z - 0.2, 1.1, 0.1, 0.54, palette.trim, 0.31, trimMaterial, { rotationY: angle });
    }
    // Park landscaping and tall palms around the public walkway.
    const addPalm = (x, z, scale = 1) => {
      const trunk = addMesh(environment, new THREE.CylinderGeometry(0.11 * scale, 0.18 * scale, 2.0 * scale, 9), standard('#70543a', 0.96), x, 1.0 * scale, z);
      trunk.rotation.z = -0.08;
      addMesh(environment, new THREE.CylinderGeometry(0.28 * scale, 0.36 * scale, 0.12 * scale, 12), standard('#706d58', 0.95), x, 0.07 * scale, z);
      for (let i = 0; i < 7; i += 1) {
        const leaf = addMesh(environment, new THREE.ConeGeometry(0.12 * scale, 1.18 * scale, 6), standard('#42664e', 0.96), x, 1.92 * scale, z, 0, 0, Math.PI / 2.7);
        leaf.rotation.y = i * Math.PI / 3.5;
        leaf.rotation.z = (i % 2 ? 1 : -1) * 0.68;
      }
    };
    [[0.42, 1.1, 0.9], [0.38, 8.1, 1], [4.0, 1.0, 0.8], [15.9, 5.0, 0.78], [20.6, 6.0, 0.95], [20.65, 10.0, 0.8]].forEach((p) => addPalm(...p));
    for (const [x, z] of [[2.5, 2.2], [2.1, 7.55], [16.0, 10.85], [19.7, 10.75]]) {
      addMesh(environment, new THREE.CylinderGeometry(0.42, 0.5, 0.16, 14), standard('#717b63', 0.95), x, 0.08, z);
      addMesh(environment, new THREE.CylinderGeometry(0.36, 0.45, 0.11, 14), standard(palette.green, 0.98), x, 0.2, z);
      for (let i = 0; i < 4; i += 1) {
        addMesh(environment, new THREE.SphereGeometry(0.24, 8, 7), standard(['#477450', '#597853', '#6d8759'][i % 3], 0.96), x + Math.cos(i * 1.57) * 0.15, 0.38, z + Math.sin(i * 1.57) * 0.15);
      }
    }
    // Luminous bollards make the marina route and extraction point readable at night.
    for (let i = 0; i < 13; i += 1) {
      const x = 15.72 + i * 0.48;
      makeBox(environment, x, 12.25, 0.12, 0.12, 0.45, '#282f31', 0.225, standard('#273137', 0.45, 0.36));
      addMesh(environment, new THREE.SphereGeometry(0.07, 8, 6), standard(palette.accent, 0.28, 0.06, { emissive: new THREE.Color(palette.accent), emissiveIntensity: 0.8 }), x, 0.48, 12.25);
    }

    buildStaticProps(state.props || [], palette);
    buildStaticPropHalos();
    mergeStaticPropMeshes();
    addVessel(palette);
    mergeMeshes(environment);
    addSceneLights(themeName, palette);
    mergeMeshes(environmentLights);
  }

  function addSceneLights(themeName, palette) {
    for (const [x, z, color] of [[8.25, 3.1, palette.accent], [11.2, 4.1, palette.trim], [14.35, 3.0, palette.accent], [9.1, 6.6, palette.trim]]) {
      const housing = addMesh(environmentLights, new THREE.SphereGeometry(0.07, 7, 5), standard(color, 0.35, 0.05, { emissive: new THREE.Color(color), emissiveIntensity: 0.75 }), x, 2.42, z);
      housing.castShadow = false;
    }
    if (themeName === 'night') {
      hemi.intensity = 0.8;
      fill.intensity = 0.16;
      keyLight.intensity = 0.62;
      scene.fog.color.set('#1c272c');
      scene.background.set('#202d34');
    } else {
      hemi.intensity = 1.65;
      fill.intensity = 0.2;
      keyLight.intensity = 1.65;
      scene.fog.color.set(themeName === 'villa' ? '#839180' : '#7d9692');
      scene.background.set(themeName === 'villa' ? '#859982' : '#7d9692');
    }
  }

  function addVessel(palette) {
    const hull = standard('#1c343b', 0.32, 0.45);
    const deck = standard('#c9bea3', 0.68, 0.08);
    const darkGlass = standard('#243b44', 0.2, 0.35, { emissive: new THREE.Color('#14232b'), emissiveIntensity: 0.18 });
    makeBox(environment, 18.68, 13.1, 2.25, 0.75, 0.18, '#1c343b', 0.15, hull);
    makeBox(environment, 18.68, 13.1, 1.92, 0.59, 0.08, '#c9bea3', 0.29, deck);
    makeBox(environment, 18.64, 13.02, 0.82, 0.45, 0.46, '#e5e1d7', 0.56, standard('#ded9cc', 0.4));
    makeBox(environment, 18.64, 12.78, 0.56, 0.018, 0.22, '#243b44', 0.62, darkGlass);
    makeBox(environment, 18.18, 13.12, 0.28, 0.32, 0.18, palette.accent, 0.42, standard(palette.accent, 0.35, 0.18));
    makeBox(environment, 19.13, 13.12, 0.28, 0.32, 0.18, palette.accent, 0.42, standard(palette.accent, 0.35, 0.18));
    for (const x of [17.65, 18.08, 19.25, 19.68]) {
      const rail = addMesh(environment, new THREE.CylinderGeometry(0.016, 0.016, 0.26, 6), standard('#e4e2d9', 0.32, 0.32), x, 0.47, 13.1);
      rail.rotation.z = 0.06;
    }
  }

  function buildStaticProps(props, palette) {
    const brass = standard('#c0a261', 0.34, 0.52);
    const screen = standard('#3b9aa6', 0.24, 0.15, { emissive: new THREE.Color('#1f7180'), emissiveIntensity: 0.48 });
    const darkMetal = standard('#262e31', 0.44, 0.36);
    const wood = standard('#665242', 0.7, 0.06);
    const trimMaterial = standard(palette.trim, 0.58, 0.08);
    for (const prop of props) {
      const x = SCALE(prop.x);
      const z = SCALE(prop.y);
      const group = new THREE.Group();
      group.position.set(x, 0, z);
      staticProps.add(group);
      let indicator = null;
      switch (prop.type) {
        case 'outfit': {
          makeBox(group, 0, 0, 0.74, 0.54, 1.55, '#555d5a', 0.775, standard('#4e5956', 0.62, 0.08));
          makeBox(group, 0, -0.285, 0.76, 0.035, 1.55, '#282e30', 0.775, darkMetal);
          makeBox(group, 0.22, -0.312, 0.12, 0.018, 0.19, palette.accent, 1.22, screen);
          makeBox(group, 0, 0.276, 0.62, 0.04, 0.07, palette.trim, 1.58, brass);
          for (let i = 0; i < 3; i += 1) makeBox(group, -0.21 + i * 0.21, -0.315, 0.12, 0.024, 0.18, ['#1d5152', '#6e4d39', '#1f2d39'][i], 1.03, standard(['#1d5152', '#6e4d39', '#1f2d39'][i], 0.66));
          break;
        }
        case 'intel':
        case 'radio':
        case 'soundboard':
        case 'sabotage':
        case 'prototype': {
          const w = prop.type === 'soundboard' ? 0.93 : prop.type === 'sabotage' ? 1.05 : 0.76;
          makeBox(group, 0, 0, w, 0.5, 0.84, '#403a34', 0.42, wood);
          makeBox(group, 0, -0.04, w * 0.86, 0.028, 0.39, '#242f32', 0.91, darkMetal);
          makeBox(group, 0, -0.06, w * 0.62, 0.018, 0.24, palette.accent, 0.99, screen);
          makeBox(group, 0, -0.23, w * 0.34, 0.026, 0.06, palette.trim, 1.03, brass);
          for (let i = 0; i < 4; i += 1) {
            addMesh(group, new THREE.CylinderGeometry(0.038, 0.038, 0.025, 8), standard(i === 0 ? '#bf4542' : '#c7b992', 0.48, 0.24), -w * 0.34 + i * 0.15, 0.98, -0.12);
          }
          if (prop.type === 'sabotage') {
            const capsule = addMesh(group, new THREE.CylinderGeometry(0.13, 0.16, 0.28, 10), standard('#b4a378', 0.3, 0.4, { emissive: new THREE.Color('#726442'), emissiveIntensity: 0.18 }), 0.28, 1.25, 0.06);
            capsule.rotation.z = 0.18;
            makeBox(group, 0.1, 0.08, 0.48, 0.05, 0.14, palette.sign, 1.12, standard(palette.sign, 0.42, 0.08));
          }
          if (prop.type === 'soundboard') {
            for (let i = 0; i < 5; i += 1) makeBox(group, -0.3 + i * 0.15, -0.2, 0.027, 0.19, 0.015, i % 2 ? '#c69065' : '#88a8a4', 1.04, standard(i % 2 ? '#c69065' : '#88a8a4', 0.35));
          }
          break;
        }
        case 'poison':
        case 'tray':
        case 'sink':
        case 'blend': {
          makeBox(group, 0, 0, prop.type === 'blend' ? 1.0 : 0.72, 0.52, 0.88, wood, 0.44, standard(prop.type === 'blend' ? '#5b4436' : '#615346', 0.63, 0.06));
          makeBox(group, 0, 0, prop.type === 'blend' ? 1.05 : 0.78, 0.57, 0.055, palette.trim, 0.91, trimMaterial);
          if (prop.type === 'sink') {
            makeBox(group, 0, 0, 0.38, 0.26, 0.06, '#7e9594', 0.96, standard('#849a98', 0.26, 0.46));
            addMesh(group, new THREE.CylinderGeometry(0.018, 0.018, 0.23, 8), brass, 0.18, 1.05, -0.08);
          } else if (prop.type === 'poison' || prop.type === 'tray') {
            for (let i = 0; i < 3; i += 1) {
              addMesh(group, new THREE.CylinderGeometry(0.045, 0.052, 0.16, 9), standard(prop.type === 'poison' ? '#49735f' : '#dedbd1', 0.26, 0.08), -0.18 + i * 0.18, 1.04, 0.03);
              addMesh(group, new THREE.CylinderGeometry(0.025, 0.025, 0.04, 8), brass, -0.18 + i * 0.18, 1.14, 0.03);
            }
          } else {
            for (let i = 0; i < 4; i += 1) addMesh(group, new THREE.CylinderGeometry(0.04, 0.05, 0.11, 8), standard('#d4ddd9', 0.3, 0.12), -0.29 + i * 0.18, 1.02, 0.01);
          }
          break;
        }
        case 'fuse':
        case 'power-strip':
        case 'fire-alarm': {
          makeBox(group, 0, 0, 0.46, 0.16, prop.type === 'power-strip' ? 0.17 : 0.52, '#343b3c', prop.type === 'power-strip' ? 0.09 : 1.06, darkMetal);
          for (let i = 0; i < 3; i += 1) makeBox(group, -0.12 + i * 0.12, -0.087, 0.045, 0.014, 0.06, prop.type === 'fire-alarm' ? '#c64841' : '#63a9a4', prop.type === 'power-strip' ? 0.13 : 1.13, standard(prop.type === 'fire-alarm' ? '#c64841' : '#63a9a4', 0.42, 0.12));
          addMesh(group, new THREE.SphereGeometry(0.045, 8, 6), standard(prop.type === 'fire-alarm' ? '#f14d42' : '#e8c768', 0.24, 0.05, { emissive: new THREE.Color(prop.type === 'fire-alarm' ? '#8e1717' : '#8a7132'), emissiveIntensity: 0.3 }), 0.12, prop.type === 'power-strip' ? 0.18 : 1.3, -0.1);
          break;
        }
        case 'hide':
        case 'crate': {
          const height = prop.type === 'hide' ? 1.35 : 0.72;
          makeBox(group, 0, 0, 0.82, 0.68, height, prop.type === 'hide' ? '#484641' : '#65553d', height / 2, standard(prop.type === 'hide' ? '#484641' : '#65553d', 0.84));
          makeBox(group, 0, -0.353, 0.79, 0.035, height * 0.86, palette.trim, height / 2, trimMaterial);
          makeBox(group, 0.27, -0.38, 0.12, 0.018, 0.11, '#a9493f', 0.65, standard('#a9493f', 0.7));
          break;
        }
        case 'exit': {
          makeBox(group, 0, 0, 0.8, 0.5, 0.12, '#273c40', 0.06, standard('#273c40', 0.36, 0.38));
          addMesh(group, new THREE.CylinderGeometry(0.1, 0.14, 0.3, 10), brass, 0.25, 0.21, 0.12);
          addMesh(group, new THREE.CylinderGeometry(0.08, 0.12, 0.28, 10), brass, -0.24, 0.2, -0.12);
          makeBox(group, 0, 0.19, 0.32, 0.08, 0.72, '#f0e7d0', 0.36, standard('#e7dfcd', 0.42, 0.12));
          addMesh(group, new THREE.SphereGeometry(0.105, 10, 8), standard('#77d59b', 0.24, 0.04, { emissive: new THREE.Color('#3b985d'), emissiveIntensity: 0.9 }), 0, 0.79, 0.19);
          indicator = addMesh(group, new THREE.TorusGeometry(0.58, 0.027, 6, 48), standard('#7bd79e', 0.25, 0.03, { side: THREE.DoubleSide, emissive: new THREE.Color('#378854'), emissiveIntensity: 0.22 }), 0, 0.04, 0);
          indicator.rotation.x = -Math.PI / 2;
          break;
        }
        default: {
          makeBox(group, 0, 0, 0.64, 0.42, 0.55, '#514a40', 0.275, wood);
        }
      }
      const haloIndex = propVisuals.size;
      if (indicator) indicator.userData.keepSeparate = true;
      mergeMeshes(group);
      propVisuals.set(prop.id, { group, haloIndex, indicator, type: prop.type, x, z });
    }
  }

  function buildStaticPropHalos() {
    const entries = [...propVisuals.values()];
    if (!entries.length) return;
    propHaloMesh = new THREE.InstancedMesh(
      new THREE.RingGeometry(0.43, 0.48, 32),
      basic('#ffffff', 0.7, { depthWrite: false, side: THREE.DoubleSide }),
      entries.length
    );
    propHaloMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    propHaloMesh.frustumCulled = false;
    entries.forEach((visual, index) => {
      dummy.position.set(visual.x, 0.025, visual.z);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      propHaloMesh.setMatrixAt(index, dummy.matrix);
      propHaloMesh.setColorAt(index, new THREE.Color(environmentTheme.accent).multiplyScalar(0.1));
      visual.haloIndex = index;
    });
    propHaloMesh.instanceMatrix.needsUpdate = true;
    if (propHaloMesh.instanceColor) propHaloMesh.instanceColor.needsUpdate = true;
    staticProps.add(propHaloMesh);
  }

  function mergeStaticPropMeshes() {
    const batches = new Map();
    const redundantMaterials = new Set();
    staticProps.updateMatrixWorld(true);
    for (const visual of propVisuals.values()) {
      const group = visual.group;
      group.updateWorldMatrix(true, true);
      for (const child of [...group.children]) {
        if (!child.isMesh) {
          group.remove(child);
          continue;
        }
        if (child.userData.keepSeparate || Array.isArray(child.material)) {
          const world = child.matrixWorld.clone();
          group.remove(child);
          staticProps.add(child);
          world.decompose(child.position, child.quaternion, child.scale);
          child.updateMatrix();
          continue;
        }
        const material = child.material;
        const key = [material.type, material.color?.getHexString?.() || '', material.roughness, material.metalness, material.opacity, material.transparent, material.depthWrite, material.side, material.emissive?.getHexString?.() || '', material.emissiveIntensity, material.map?.uuid || ''].join('|');
        if (!batches.has(key)) batches.set(key, { material, geometries: [], castShadow: false, receiveShadow: false });
        const batch = batches.get(key);
        if (batch.material !== material) redundantMaterials.add(material);
        const geometry = child.geometry.clone();
        geometry.applyMatrix4(child.matrixWorld);
        batch.geometries.push(geometry);
        batch.castShadow ||= child.castShadow;
        batch.receiveShadow ||= child.receiveShadow;
        group.remove(child);
        child.geometry.dispose();
      }
      staticProps.remove(group);
      visual.group = null;
    }
    for (const batch of batches.values()) {
      const merged = batch.geometries.length === 1 ? batch.geometries[0] : mergeGeometries(batch.geometries, false);
      if (!merged) {
        batch.geometries.forEach((geometry) => {
          const mesh = new THREE.Mesh(geometry, batch.material);
          mesh.castShadow = batch.castShadow;
          mesh.receiveShadow = batch.receiveShadow;
          staticProps.add(mesh);
        });
        continue;
      }
      if (batch.geometries.length > 1) batch.geometries.forEach((geometry) => geometry.dispose());
      const mesh = new THREE.Mesh(merged, batch.material);
      mesh.castShadow = batch.castShadow;
      mesh.receiveShadow = batch.receiveShadow;
      staticProps.add(mesh);
    }
    redundantMaterials.forEach((material) => material.dispose());
  }

  function updatePropState(state) {
    const mission = state.mission;
    const events = mission?.worldEvents || {};
    for (const prop of (state.props || [])) {
      const visual = propVisuals.get(prop.id);
      if (!visual) continue;
      let active = false;
      if (prop.type === 'sabotage') active = Boolean(mission?.sabotage);
      else if (prop.type === 'poison' || prop.type === 'tray') active = Boolean(mission?.poisonedTray || mission?.hasPoison);
      else if (prop.type === 'sink') active = Boolean(events.sinkOverflow);
      else if (prop.type === 'fuse') active = Boolean(events.fuseFault || events.lightsOut);
      else if (prop.type === 'power-strip') active = Boolean(events.powerFault);
      else if (prop.type === 'fire-alarm') active = Boolean(events.fireAlarm);
      else if (prop.type === 'soundboard') active = Boolean(events.lightsOut || mission?.activeEffectTimer > 0);
      else if (prop.type === 'exit') active = Boolean(mission?.targets?.primary && mission?.targets?.secondary);
      const pulse = 0.17 + 0.12 * (0.5 + 0.5 * Math.sin(performance.now() * 0.004 + prop.x));
      if (propHaloMesh && Number.isInteger(visual.haloIndex)) {
        const haloColor = new THREE.Color(active ? (prop.type === 'exit' ? '#7ed39a' : '#ed6c54') : environmentTheme.accent);
        haloColor.multiplyScalar(active ? pulse + 0.32 : 0.1);
        propHaloMesh.setColorAt(visual.haloIndex, haloColor);
      }
      if (visual.indicator?.material) {
        visual.indicator.material.emissiveIntensity = active ? 1.0 : 0.2;
      }
    }
    if (propHaloMesh?.instanceColor) propHaloMesh.instanceColor.needsUpdate = true;
    const night = environmentKey === 'night';
    if (events.lightsOut) {
      keyLight.intensity = night ? 0.16 : 0.3;
      hemi.intensity = night ? 0.22 : 0.38;
      fill.intensity = 0.04;
    } else {
      keyLight.intensity = night ? 0.54 : 1.55;
      hemi.intensity = night ? 0.7 : 1.22;
      fill.intensity = night ? 0.12 : 0.16;
    }
  }

  function makeFallbackHuman(role, outfitIndex = 0) {
    const root = new THREE.Group();
    const config = ROLE_STYLE[role] || ROLE_STYLE.guest;
    const colors = config.suit;
    const suit = standard(colors[outfitIndex % colors.length], 0.88);
    const shirt = standard('#d4d0c4', 0.88);
    const skin = standard('#bd9678', 0.92);
    const shoe = standard('#272c2d', 0.82);
    addMesh(root, new THREE.CapsuleGeometry(0.19, 0.55, 4, 8), suit, 0, 0.83, 0);
    addMesh(root, new THREE.SphereGeometry(0.15, 12, 10), skin, 0, 1.49, 0);
    for (const side of [-1, 1]) {
      const arm = addMesh(root, new THREE.CapsuleGeometry(0.055, 0.42, 3, 6), suit, side * 0.22, 0.99, 0);
      arm.rotation.z = side * 0.1;
      const leg = addMesh(root, new THREE.CapsuleGeometry(0.07, 0.4, 3, 6), suit, side * 0.095, 0.32, 0);
      leg.rotation.z = side * -0.03;
      addMesh(root, new THREE.BoxGeometry(0.14, 0.085, 0.26), shoe, side * 0.095, 0.075, 0.065);
    }
    addMesh(root, new THREE.BoxGeometry(0.08, 0.32, 0.025), standard('#772f38', 0.82), 0, 1.06, 0.22);
    if (role === 'technician') {
      addMesh(root, new THREE.CylinderGeometry(0.18, 0.19, 0.08, 12), standard('#d39b2e', 0.5), 0, 1.66, 0);
      addMesh(root, new THREE.CylinderGeometry(0.22, 0.22, 0.03, 12), standard('#d39b2e', 0.5), 0, 1.61, 0);
    }
    return mergeMeshes(root);
  }

  function configureMaterials(model, actor) {
    const role = actor.role || 'guest';
    const config = ROLE_STYLE[role] || ROLE_STYLE.guest;
    let suitIndex = 0;
    const idHash = String(actor.id || 'guest').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
    if (role === 'guest') suitIndex = idHash % config.suit.length;
    else suitIndex = idHash % config.suit.length;
    const suitColor = config.suit[suitIndex];
    const skinTints = ['#fff7ee', '#f5e6d5', '#e8d0bb', '#f3e1cf'];
    const skinTint = skinTints[idHash % skinTints.length];
    const ownedMaterials = [];
    model.traverse((node) => {
      if (!node.isMesh) return;
      node.castShadow = true;
      node.receiveShadow = true;
      const cloneMaterial = (material) => {
        const copy = material.clone();
        ownedMaterials.push(copy);
        const name = (material.name || '').toLowerCase();
        if (name.includes('casualsuit') || name.includes('suit')) copy.color.set(suitColor);
        else if (name.includes('shoes')) copy.color.set(role === 'technician' ? '#3d342e' : role === 'security' ? '#252a2c' : '#564437');
        else if (name.includes('human') || name.includes('body') || name.includes('skin')) copy.color.set(skinTint);
        copy.needsUpdate = true;
        return copy;
      };
      node.material = Array.isArray(node.material) ? node.material.map(cloneMaterial) : cloneMaterial(node.material);
    });
    const headBone = [];
    model.traverse((node) => { if (node.isBone && /head/i.test(node.name)) headBone.push(node); });
    if (headBone.length) {
      const hairColors = ['#282321', '#44352d', '#625044', '#292f32', '#806541'];
      const hairColor = hairColors[idHash % hairColors.length];
      const hairMaterial = standard(hairColor, 0.84, 0.02);
      ownedMaterials.push(hairMaterial);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.112, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.62), hairMaterial);
      cap.position.set(0, 0.105, 0);
      cap.scale.set(0.96 + (idHash % 3) * 0.035, 1, 0.95 + (idHash % 2) * 0.05);
      cap.castShadow = true;
      headBone[0].add(cap);
    }
    return ownedMaterials;
  }

  function makeGear(role, id) {
    const gear = new THREE.Group();
    const dark = standard('#20282b', 0.42, 0.24);
    const metal = standard('#c1a261', 0.32, 0.45);
    const badge = standard(role === 'security' ? '#d2b364' : '#f1eee3', 0.36, 0.32);
    const white = standard('#eee9dc', 0.7, 0.05);
    const red = standard('#a53735', 0.53, 0.1);
    const highVis = standard('#c58932', 0.66, 0.04);
    const reflective = standard('#d2c8a6', 0.33, 0.18, { emissive: new THREE.Color('#6b634c'), emissiveIntensity: 0.08 });
    const gearType = (ROLE_STYLE[role] || ROLE_STYLE.guest).gear;

    // A fitted belt and a small holster establish the security/maintenance silhouettes.
    if (role === 'security' || role === 'technician') {
      const belt = addMesh(gear, new THREE.CylinderGeometry(0.22, 0.22, 0.065, 16, 1, true), dark, 0, 0.91, 0);
      belt.scale.set(1.42, 1, 0.9);
      makeBox(gear, 0.29, 0.24, 0.1, 0.07, 0.16, '#262b2d', 0.89, dark);
      makeBox(gear, -0.27, 0.19, 0.12, 0.09, 0.19, '#353b3b', 0.89, dark);
    }
    if (gearType === 'staff') {
      cylinderBetween(gear, [-0.1, 1.68, 0.19], [0.14, 1.17, 0.29], 0.012, dark);
      cylinderBetween(gear, [0.1, 1.68, 0.19], [-0.14, 1.17, 0.29], 0.012, dark);
      buildBadge(gear, white, 0.15, 1.18, 0.31, 0.18, 0.13);
      makeBox(gear, 0, 1.67, 0.08, 0.035, 0.09, '#d1b262', 1.67, metal);
    }
    if (gearType === 'executive') {
      const tie = addMesh(gear, new THREE.BoxGeometry(0.075, 0.39, 0.022), standard(id.includes('primary') ? '#74353a' : '#344d5b', 0.72), 0, 1.3, 0.292);
      tie.rotation.z = 0.025;
      addMesh(gear, new THREE.BoxGeometry(0.18, 0.075, 0.025), white, -0.22, 1.49, 0.27);
      buildBadge(gear, metal, 0.24, 1.13, 0.305, 0.12, 0.1);
    }
    if (gearType === 'security') {
      buildBadge(gear, badge, 0.21, 1.27, 0.3, 0.16, 0.16);
      makeBox(gear, 0.26, 0.16, 0.14, 0.09, 0.19, '#272f33', 1.51, dark);
      addMesh(gear, new THREE.SphereGeometry(0.035, 8, 6), red, 0.13, 1.78, 0.09);
      addMesh(gear, new THREE.SphereGeometry(0.045, 8, 6), dark, 0.27, 1.63, 0.12);
      cylinderBetween(gear, [0.25, 1.64, 0.13], [0.23, 1.46, 0.22], 0.009, dark, 6);
      makeBox(gear, -0.43, 0.02, 0.15, 0.11, 0.13, '#5b3333', 1.37, red);
    }
    if (gearType === 'technician') {
      const panel = standard('#936632', 0.82, 0.03);
      makeBox(gear, 0, 0.29, 0.54, 0.08, 0.63, '#926337', 1.24, panel);
      makeBox(gear, 0, -0.27, 0.54, 0.08, 0.63, '#926337', 1.24, panel);
      makeBox(gear, 0, 0.34, 0.52, 0.085, 0.045, '#e3cb83', 1.34, reflective);
      makeBox(gear, 0, 0.34, 0.52, 0.085, 0.045, '#e3cb83', 1.09, reflective);
      makeBox(gear, 0, -0.315, 0.52, 0.085, 0.045, '#e3cb83', 1.34, reflective);
      makeBox(gear, 0, -0.315, 0.52, 0.085, 0.045, '#e3cb83', 1.09, reflective);
      makeBox(gear, -0.21, 0.26, 0.09, 0.05, 0.19, '#433c32', 0.93, dark);
      buildBadge(gear, white, 0.18, 1.18, 0.36, 0.13, 0.1);
      addMesh(gear, new THREE.CylinderGeometry(0.14, 0.16, 0.09, 14), highVis, 0, 1.91, 0);
      addMesh(gear, new THREE.CylinderGeometry(0.2, 0.2, 0.028, 16), highVis, 0, 1.86, 0);
      makeBox(gear, 0.27, 0.21, 0.1, 0.09, 0.18, '#3f4742', 0.91, dark);
    }
    if (gearType === 'guest') {
      const pocket = addMesh(gear, new THREE.BoxGeometry(0.14, 0.065, 0.022), standard('#c0a879', 0.58), -0.23, 1.48, 0.28);
      pocket.rotation.z = -0.04;
      if (idHashFrom(id) % 3 === 0) buildBadge(gear, white, 0.22, 1.2, 0.29, 0.11, 0.08);
    }
    return mergeMeshes(gear);
  }

  function idHashFrom(id) {
    return String(id || '').split('').reduce((sum, char) => sum + char.charCodeAt(0), 0);
  }

  function actorIdentity(data) {
    return data.isPlayer ? 'player' : String(data.id || `actor-${actorSerial++}`);
  }

  function shouldUseDetailedModel(data, state, currentlyDetailed = false) {
    if (data.isPlayer || data.target) return true;
    const focus = state.camera || state.player || { x: 1080, y: 610 };
    const threshold = currentlyDetailed ? 760 : 700;
    return Math.hypot((data.x || 0) - focus.x, (data.y || 0) - focus.y) < threshold;
  }

  function createActor(data) {
    const root = new THREE.Group();
    const pose = new THREE.Group();
    root.add(pose);
    const facing = new THREE.Group();
    pose.add(facing);
    const modelHolder = new THREE.Group();
    facing.add(modelHolder);
    const gearHolder = new THREE.Group();
    facing.add(gearHolder);
    const fallback = makeFallbackHuman(data.role, idHashFrom(data.id) % 4);
    modelHolder.add(fallback);
    const actor = {
      id: actorIdentity(data), root, pose, facing, modelHolder, gearHolder,
      model: null, fallback, mixer: null, actions: {}, action: '', ownedMaterials: [],
      gear: null, marker: null, weapon: null, data: { ...data, role: data.role || 'guest' }, moved: false, lastX: data.x, lastY: data.y,
      expires: 0, isPlayer: Boolean(data.isPlayer)
    };
    actorGroup.add(root);
    actor.gear = makeGear(data.role || 'guest', actor.id);
    gearHolder.add(actor.gear);
    actor.marker = addMesh(root, new THREE.SphereGeometry(0.08, 12, 8), standard('#ffffff', 0.25, 0.1, { emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.8 }), 0, 2.08, 0);
    actor.marker.visible = false;
    actor.weapon = new THREE.Group();
    const weaponMat = standard('#22282b', 0.34, 0.48);
    makeBox(actor.weapon, 0.28, 0.21, 0.22, 0.055, 0.085, '#22282b', 1.05, weaponMat);
    makeBox(actor.weapon, 0.28, 0.21, 0.065, 0.07, 0.16, '#252b2d', 0.95, weaponMat);
    mergeMeshes(actor.weapon);
    actor.weapon.visible = false;
    facing.add(actor.weapon);
    actor.root.visible = false;
    actors.set(actor.id, actor);
    return actor;
  }

  function upgradeActor(actor, template) {
    if (actor.model) {
      actor.modelHolder.remove(actor.model);
      actor.model.traverse((node) => { if (node.isMesh && node.material) (Array.isArray(node.material) ? node.material : [node.material]).forEach((material) => material.dispose()); });
    } else if (actor.fallback) {
      actor.modelHolder.remove(actor.fallback);
      actor.fallback.traverse((node) => { node.geometry?.dispose(); node.material?.dispose(); });
      actor.fallback = null;
    }
    const model = SkeletonUtils.clone(template.scene);
    const bounds = new THREE.Box3().setFromObject(model);
    const height = Math.max(0.1, bounds.max.y - bounds.min.y);
    const scale = ACTOR_HEIGHT / height;
    model.scale.setScalar(scale);
    model.position.set(0, -bounds.min.y * scale, 0);
    actor.modelHolder.add(model);
    actor.model = model;
    actor.ownedMaterials = configureMaterials(model, actor.data || { id: actor.id, role: 'guest' });
    actor.mixer = new THREE.AnimationMixer(model);
    actor.actions = {};
    for (const clip of template.animations) {
      const name = clip.name.toLowerCase();
      const key = name.includes('idle') ? 'idle' : name.includes('run') ? 'run' : name.includes('walk') ? 'walk' : name.includes('wave') ? 'wave' : name;
      if (!actor.actions[key]) actor.actions[key] = actor.mixer.clipAction(clip);
    }
    actor.pose.rotation.set(0, 0, 0);
    actor.facing.rotation.y = Math.PI / 2;
    actor.fallback = null;
    playAction(actor, 'idle', 0);
  }

  function downgradeActor(actor) {
    if (!actor.model) return;
    actor.mixer?.stopAllAction();
    actor.modelHolder.remove(actor.model);
    actor.ownedMaterials.forEach((material) => material.dispose());
    actor.model = null;
    actor.mixer = null;
    actor.actions = {};
    actor.action = '';
    actor.fallback = makeFallbackHuman(actor.data?.role || 'guest', idHashFrom(actor.id) % 4);
    actor.modelHolder.add(actor.fallback);
  }

  function playAction(actor, name, fade = 0.16) {
    if (!actor.mixer || !actor.actions[name] || actor.action === name) return;
    const next = actor.actions[name];
    next.reset().fadeIn(fade).play();
    if (actor.action && actor.actions[actor.action]) actor.actions[actor.action].fadeOut(fade);
    actor.action = name;
  }

  function createCrowdVisuals(template, renderIndices) {
    const indicesKey = renderIndices.join(',');
    if (crowdVisuals.length && indicesKey === crowdVisualIndicesKey) return;
    for (const visual of crowdVisuals) {
      crowdGroup.remove(visual.root);
      visual.mixer.stopAllAction();
      visual.ownedMaterials.forEach((material) => material.dispose());
    }
    crowdVisuals.length = 0;
    crowdVisualIndicesKey = indicesKey;
    for (const index of renderIndices) {
      const root = new THREE.Group();
      const facing = new THREE.Group();
      root.add(facing);
      const model = SkeletonUtils.clone(template.scene);
      const bounds = new THREE.Box3().setFromObject(model);
      const sourceHeight = Math.max(0.1, bounds.max.y - bounds.min.y);
      const modelScale = ACTOR_HEIGHT / sourceHeight;
      const heightVariation = 0.92 + ((index * 13) % 7) * 0.025;
      model.scale.set(modelScale * 0.78, modelScale * heightVariation, modelScale * 0.78);
      model.position.set(0, -bounds.min.y * modelScale * heightVariation, 0);
      facing.add(model);
      const ownedMaterials = configureMaterials(model, { id: `crowd-${index}`, role: 'guest' });
      const mixer = new THREE.AnimationMixer(model);
      const actions = {};
      for (const clip of template.animations) {
        const name = clip.name.toLowerCase();
        const key = name.includes('idle') ? 'idle' : name.includes('run') ? 'run' : name.includes('walk') ? 'walk' : name;
        if (!actions[key]) actions[key] = mixer.clipAction(clip);
      }
      const visual = { index, root, facing, model, mixer, actions, action: '', ownedMaterials };
      crowdGroup.add(root);
      playAction(visual, 'idle', 0);
      crowdVisuals.push(visual);
    }
  }

  function loadModels() {
    return modelLoader.loadAsync('./assets/characters/suited.glb').then((gltf) => {
      templates.set('suited', gltf);
      return { loaded: true, animations: gltf.animations.map((clip) => clip.name) };
    }).catch((error) => {
      console.error('Could not load the bundled 3D human model; using the built-in 3D stand-in.', error);
      return { loaded: false, error };
    });
  }

  function syncActors(state, dt) {
    const seen = new Set();
    const now = performance.now() / 1000;
    const entries = [...(state.npcs || []).map((npc) => ({ ...npc, isPlayer: false })), ...(state.player ? [{ ...state.player, id: 'player', role: state.player.disguise || 'guest', isPlayer: true }] : [])];
    for (const data of entries) {
      const id = actorIdentity(data);
      seen.add(id);
      let actor = actors.get(id);
      if (!actor) actor = createActor({ ...data, id });
      const role = data.isPlayer ? (data.disguise || 'guest') : (data.role || 'guest');
      const roleChanged = actor.data && actor.data.role !== role;
      actor.data = { ...data, role };
      if (roleChanged) {
        if (actor.model) {
          actor.ownedMaterials.forEach((material) => material.dispose());
          actor.ownedMaterials = configureMaterials(actor.model, actor.data);
        } else if (actor.fallback) {
          actor.modelHolder.remove(actor.fallback);
          actor.fallback.traverse((node) => { node.geometry?.dispose(); node.material?.dispose(); });
          actor.fallback = makeFallbackHuman(role, idHashFrom(id) % 4);
          actor.modelHolder.add(actor.fallback);
        }
        if (actor.gear) {
          disposeGroupContents(actor.gearHolder, true);
          actor.gear = makeGear(role, id);
          actor.gearHolder.add(actor.gear);
        }
      }
      const detailed = templates.has('suited') && shouldUseDetailedModel(actor.data, state, Boolean(actor.model));
      if (detailed && !actor.model) upgradeActor(actor, templates.get('suited'));
      else if (!detailed && actor.model) downgradeActor(actor);
      actor.root.visible = !data.hidden;
      actor.root.scale.setScalar(0.94 + (idHashFrom(id) % 7) * 0.02);
      actor.root.position.set(SCALE(data.x || 0), 0, SCALE(data.y || 0));
      actor.pose.rotation.z = data.dead || data.down ? Math.PI / 2 : 0;
      actor.pose.scale.y = data.crouched && !data.dead && !data.down ? 0.78 : 1;
      const movedX = (data.x || 0) - actor.lastX;
      const movedY = (data.y || 0) - actor.lastY;
      const speedPixels = Math.hypot(movedX, movedY) / Math.max(0.001, dt);
      actor.moved = speedPixels > 3 && !data.dead && !data.down;
      actor.lastX = data.x || 0;
      actor.lastY = data.y || 0;
      const face = data.isPlayer ? Math.atan2(data.faceY || 0, data.faceX || 1) : Number.isFinite(data.facing) ? data.facing : 0;
      actor.facing.rotation.y = Math.PI / 2 - face;
      if (actor.mixer && !data.dead && !data.down) {
        const action = actor.moved ? (speedPixels > 145 ? 'run' : 'walk') : 'idle';
        const actionChanged = actor.action !== action;
        playAction(actor, action, 0.2);
        if (actionChanged && actor.actions[action]) {
          const clipDuration = actor.actions[action].getClip().duration;
          actor.actions[action].time = clipDuration > 0 ? (idHashFrom(id) * 0.037) % clipDuration : 0;
        }
        const referenceSpeed = action === 'run' ? 205 : 128;
        actor.mixer.timeScale = clamp(speedPixels / referenceSpeed, 0.32, 1.22);
        actor.mixer.update(dt);
      }
      actor.marker.visible = Boolean(data.enforcer && !data.dead && !data.down && !data.hidden);
      actor.marker.material.color.set(data.alarmed ? '#ef584f' : '#e8e3d8');
      actor.marker.material.emissive.set(data.alarmed ? '#7a1515' : '#ffffff');
      actor.marker.position.y = 2.02 + Math.sin(now * 3 + id.length) * 0.045;
      actor.weapon.visible = Boolean((data.weapon?.drawn || (data.isPlayer && data.weaponVisibleTimer > 0)) && !data.dead && !data.down);
      actor.expires = now;
      actorsLastSeen.set(id, now);
    }
    for (const [id, actor] of actors) {
      if (seen.has(id)) continue;
      if (now - (actorsLastSeen.get(id) || now) < 2.5) continue;
      actorGroup.remove(actor.root);
      if (actor.mixer) actor.mixer.stopAllAction();
      actor.ownedMaterials.forEach((material) => material.dispose());
      actor.gear?.traverse((node) => { if (node.geometry) node.geometry.dispose(); if (node.material) (Array.isArray(node.material) ? node.material : [node.material]).forEach((material) => material.dispose()); });
      actors.delete(id);
      actorsLastSeen.delete(id);
    }
    let index = 0;
    for (const actor of actors.values()) {
      const castsShadow = actor.root.visible && !actor.data.dead && !actor.data.down;
      dummy.position.set(actor.root.position.x, 0.012, actor.root.position.z);
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.set(castsShadow ? 1.05 : 0, castsShadow ? 0.72 : 0, castsShadow ? 1 : 0);
      dummy.updateMatrix();
      actorShadowMesh.setMatrixAt(index, dummy.matrix);
      index += 1;
    }
    actorShadowMesh.count = index;
    actorShadowMesh.instanceMatrix.needsUpdate = true;
  }

  function updateCrowd(state, dt) {
    const crowd = state.crowd;
    if (!crowd || !templates.has('suited') || !crowd.renderIndices?.length) {
      crowdGroup.visible = false;
      crowdShadowGroup.visible = false;
      crowdShadowMesh.count = 0;
      crowdVisuals.forEach((visual) => { visual.root.visible = false; });
      return;
    }
    createCrowdVisuals(templates.get('suited'), crowd.renderIndices);
    crowdGroup.visible = true;
    crowdShadowGroup.visible = true;
    let renderIndex = 0;
    for (const visual of crowdVisuals) {
      const index = visual.index;
      if (crowd.promoted?.[index]) {
        visual.root.visible = false;
        continue;
      }
      const x = crowd.x[index];
      const z = crowd.y[index];
      const dx = crowd.destinationX[index] - x;
      const dz = crowd.destinationY[index] - z;
      const isMoving = Math.hypot(dx, dz) > 5;
      const action = isMoving ? 'walk' : 'idle';
      visual.root.visible = true;
      visual.root.position.set(SCALE(x), 0, SCALE(z));
      visual.facing.rotation.y = Math.PI / 2 - Math.atan2(dz, dx);
      const actionChanged = visual.action !== action;
      playAction(visual, action, 0.22);
      if (actionChanged && visual.actions[action]) {
        const clipDuration = visual.actions[action].getClip().duration;
        visual.actions[action].time = clipDuration > 0 ? (index * 0.173) % clipDuration : 0;
      }
      visual.mixer.timeScale = isMoving ? clamp(crowd.speed[index] / 72, 0.68, 1.28) : 1;
      visual.mixer.update(dt);
      dummy.position.set(SCALE(x), 0.009, SCALE(z));
      dummy.rotation.set(-Math.PI / 2, 0, 0);
      dummy.scale.set(0.96, 0.58, 1);
      dummy.updateMatrix();
      crowdShadowMesh.setMatrixAt(renderIndex, dummy.matrix);
      renderIndex += 1;
    }
    crowdShadowMesh.count = renderIndex;
    crowdShadowMesh.instanceMatrix.needsUpdate = true;
  }

  function updateCamera(state, width, height) {
    const focus = state.camera || state.player || { x: 1080, y: 610 };
    const zoom = clamp(state.view?.zoom || 1, 0.6, 1.2);
    const targetDistance = 10.0 / zoom / cameraZoom;
    cameraDistance += (targetDistance - cameraDistance) * 0.08;
    const pitch = state.mode === 'menu' ? 0.76 : 0.71;
    const target = point(focus.x, focus.y, state.mode === 'menu' ? 0.55 : 0.68);
    const horizontal = Math.cos(pitch) * cameraDistance;
    const vertical = Math.sin(pitch) * cameraDistance;
    camera.position.set(
      target.x + Math.sin(cameraYaw) * horizontal,
      target.y + vertical,
      target.z + Math.cos(cameraYaw) * horizontal
    );
    camera.lookAt(target);
    camera.updateMatrixWorld();
  }

  function updateCones(state) {
    const active = new Set();
    for (const npc of (state.npcs || [])) {
      if (npc.hidden || npc.dead || npc.down || (!npc.isGuard && !npc.target && npc.category !== 'guard')) continue;
      const key = npc.id;
      active.add(key);
      let visual = helpers.cones.get(key);
      if (!visual) {
        const range = Math.max(0.55, SCALE(npc.visionRange || 170));
        const geometry = makeWedgeGeometry(range, npc.fov || 1.3);
        const material = new THREE.MeshBasicMaterial({ color: npc.alarmed ? '#ed594f' : npc.isGuard || npc.category === 'guard' ? '#e3bd6e' : '#d76555', transparent: true, opacity: 0.08, depthWrite: false, side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = 0.028;
        helperGroup.add(mesh);
        visual = { mesh, geometry, material, range: npc.visionRange, fov: npc.fov };
        helpers.cones.set(key, visual);
      }
      const angle = Number.isFinite(npc.facing) ? npc.facing : 0;
      visual.mesh.position.set(SCALE(npc.x), 0.028, SCALE(npc.y));
      visual.mesh.rotation.y = -angle;
      visual.material.color.set(npc.alarmed ? '#ec574d' : (npc.isGuard || npc.category === 'guard') ? '#e0bd71' : '#d76355');
      visual.material.opacity = npc.suspicion > 0.22 ? 0.115 : 0.065;
    }
    for (const [key, visual] of helpers.cones) {
      if (active.has(key)) continue;
      helperGroup.remove(visual.mesh);
      visual.geometry.dispose();
      visual.material.dispose();
      helpers.cones.delete(key);
    }
  }

  function updateSearchRings(state) {
    const searches = state.mission?.searches || [];
    while (helpers.searches.length < searches.length) {
      const mesh = new THREE.Mesh(new THREE.RingGeometry(0.965, 1, 56), new THREE.MeshBasicMaterial({ color: '#ef665b', transparent: true, opacity: 0.26, depthWrite: false, side: THREE.DoubleSide }));
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = 0.036;
      helperGroup.add(mesh);
      helpers.searches.push(mesh);
    }
    while (helpers.searches.length > searches.length) {
      const mesh = helpers.searches.pop();
      helperGroup.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    searches.forEach((search, index) => {
      const mesh = helpers.searches[index];
      mesh.position.set(SCALE(search.x), 0.036, SCALE(search.y));
      mesh.scale.setScalar(Math.max(0.1, SCALE(search.radius)));
      mesh.material.opacity = 0.2 + 0.08 * (0.5 + 0.5 * Math.sin(performance.now() * 0.004 + index));
    });
  }

  function updateSoundRings(state) {
    const events = (state.mission?.noiseEvents || []).filter((event) => event.maxLife && event.life > 0 && ['coin', 'water', 'fuse', 'soundboard', 'fire-alarm', 'gunshot', 'guard-shot', 'drag', 'impact', 'takedown', 'radio'].includes(event.kind)).slice(-12);
    while (helpers.sounds.length < events.length) {
      const mesh = new THREE.Mesh(new THREE.RingGeometry(0.97, 1, 48), new THREE.MeshBasicMaterial({ color: '#f0d095', transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }));
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.y = 0.042;
      helperGroup.add(mesh);
      helpers.sounds.push(mesh);
    }
    while (helpers.sounds.length > events.length) {
      const mesh = helpers.sounds.pop();
      helperGroup.remove(mesh);
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
    const colors = { coin: '#d7b970', water: '#85d2dc', fuse: '#f0c876', soundboard: '#b19be6', 'fire-alarm': '#ee5b54', gunshot: '#f08062', 'guard-shot': '#ed7163', takedown: '#d8d0bb', drag: '#d88f79', impact: '#e5a080', radio: '#8ac2c0' };
    events.forEach((event, index) => {
      const mesh = helpers.sounds[index];
      const progress = clamp(event.age / Math.max(0.12, event.maxLife * 0.72), 0.03, 1);
      mesh.position.set(SCALE(event.x), 0.042 + index * 0.0005, SCALE(event.y));
      mesh.scale.setScalar(Math.max(0.05, SCALE(event.radius * progress)));
      mesh.material.color.set(colors[event.kind] || '#f0d095');
      mesh.material.opacity = 0.2 * (1 - event.age / event.maxLife);
    });
  }

  function updateTargetMarkers(state) {
    const marked = new Set();
    for (const npc of (state.npcs || [])) {
      if (!npc.target || npc.hidden) continue;
      marked.add(npc.id);
      let marker = helpers.bodyMarkers.get(npc.id);
      if (!marker) {
        const group = new THREE.Group();
        const ring = addMesh(group, new THREE.TorusGeometry(0.24, 0.023, 6, 28), basic('#e44d46', 0.82, { side: THREE.DoubleSide }), 0, 0.03, 0);
        ring.rotation.x = -Math.PI / 2;
        const diamond = addMesh(group, new THREE.OctahedronGeometry(0.095, 0), basic('#e5534d', 0.86), 0, 1.96, 0);
        group.position.set(SCALE(npc.x), 0, SCALE(npc.y));
        actorGroup.add(group);
        marker = { group, ring, diamond };
        helpers.bodyMarkers.set(npc.id, marker);
      }
      marker.group.visible = !npc.dead && !npc.down;
      marker.group.position.set(SCALE(npc.x), 0, SCALE(npc.y));
      marker.diamond.position.y = 1.95 + Math.sin(performance.now() * 0.003 + npc.x) * 0.04;
      const intel = Boolean(state.mission?.intelFound);
      marker.ring.material.opacity = intel ? 0.9 : 0.38;
      marker.diamond.visible = intel;
    }
    for (const [id, marker] of helpers.bodyMarkers) {
      if (marked.has(id)) continue;
      actorGroup.remove(marker.group);
      marker.ring.geometry.dispose();
      marker.ring.material.dispose();
      marker.diamond.geometry.dispose();
      marker.diamond.material.dispose();
      helpers.bodyMarkers.delete(id);
    }
  }

  function updateCoins(state) {
    const coins = state.mission?.coinsOnGround || [];
    while (helpers.coins.length < coins.length) {
      const coin = new THREE.Mesh(coinGeometry, coinMaterial);
      coin.position.y = 0.035;
      helperGroup.add(coin);
      helpers.coins.push(coin);
    }
    while (helpers.coins.length > coins.length) {
      const coin = helpers.coins.pop();
      helperGroup.remove(coin);
    }
    coins.forEach((item, index) => {
      const coin = helpers.coins[index];
      coin.position.x = SCALE(item.x);
      coin.position.z = SCALE(item.y);
      coin.position.y = 0.035 + Math.sin(performance.now() * 0.004 + index) * 0.009;
      coin.rotation.y = performance.now() * 0.001 + index;
      coin.visible = item.life > 0;
    });
  }

  function updateEffects(state) {
    disposeGroupContents(fxGroup, true);
    const effects = state.mission?.effects || [];
    for (const effect of effects) {
      if (!['shot', 'guardShot'].includes(effect.type)) continue;
      const opacity = clamp(effect.life / Math.max(0.01, effect.max), 0, 1);
      const material = new THREE.LineBasicMaterial({ color: effect.type === 'guardShot' ? '#ff7062' : '#ffe2a1', transparent: true, opacity, linewidth: 2 });
      const geometry = new THREE.BufferGeometry().setFromPoints([
        point(effect.x1, effect.y1, 1.1), point(effect.x2, effect.y2, 1.1)
      ]);
      const line = new THREE.Line(geometry, material);
      fxGroup.add(line);
    }
    if (state.player?.dragging) {
      const geometry = new THREE.RingGeometry(0.98, 1, 48);
      const material = new THREE.MeshBasicMaterial({ color: '#e17865', transparent: true, opacity: 0.36, depthWrite: false, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(geometry, material);
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(SCALE(state.player.x), 0.047, SCALE(state.player.y));
      ring.scale.setScalar(0.95);
      fxGroup.add(ring);
    }
    if (state.mission?.worldEvents?.fireAlarm) {
      const pulse = addMesh(fxGroup, new THREE.SphereGeometry(0.1, 10, 8), standard('#ef504c', 0.25, 0.04, { emissive: new THREE.Color('#ff3327'), emissiveIntensity: 1.1 }), 8.16, 1.95, 2.44);
      pulse.scale.setScalar(0.6 + 0.45 * (0.5 + 0.5 * Math.sin(performance.now() * 0.012)));
    }
  }

  function update(state, dt) {
    if (state.theme !== environmentKey) buildEnvironment(state);
    updatePropState(state);
    updateCamera(state, state.view?.width || canvas.clientWidth, state.view?.height || canvas.clientHeight);
    syncActors(state, dt);
    updateCrowd(state, dt);
    updateCones(state);
    updateSearchRings(state);
    updateSoundRings(state);
    updateTargetMarkers(state);
    updateCoins(state);
    updateEffects(state);
    const now = performance.now() * 0.001;
    if (environmentTheme) {
      const water = environment.children.find((child) => child.material?.emissive && child.geometry?.type === 'PlaneGeometry');
      if (water) water.material.emissiveIntensity = 0.08 + 0.045 * (0.5 + 0.5 * Math.sin(now * 1.1));
    }
    if (state.mission?.alarm) keyLight.color.set('#ffb19a');
    else keyLight.color.set('#fff4dc');
  }

  function render(state, dt = 1 / 60) {
    if (disposed) return;
    const safeDt = clamp(dt || 1 / 60, 0.001, 0.06);
    update(state, safeDt);
    renderer.render(scene, camera);
  }

  function screenToWorld(x, y) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    ndc.set((x / rect.width) * 2 - 1, -(y / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.ray.intersectPlane(groundPlane, new THREE.Vector3());
    if (!hit) return null;
    return { x: hit.x / UNIT, y: hit.z / UNIT };
  }

  function mapMovement(horizontal, vertical) {
    const cosine = Math.cos(cameraYaw);
    const sine = Math.sin(cameraYaw);
    return { x: horizontal * cosine + vertical * sine, y: -horizontal * sine + vertical * cosine };
  }

  canvas.addEventListener('pointerdown', (event) => {
    if (event.button !== 2 && event.button !== 1) return;
    dragPointer = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    canvas.setPointerCapture?.(event.pointerId);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!dragPointer || dragPointer.pointerId !== event.pointerId) return;
    cameraYaw -= (event.clientX - dragPointer.x) * 0.006;
    dragPointer.x = event.clientX;
    dragPointer.y = event.clientY;
  });
  canvas.addEventListener('pointerup', (event) => {
    if (dragPointer?.pointerId === event.pointerId) dragPointer = null;
  });
  canvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    cameraZoom = clamp(cameraZoom * Math.exp(-event.deltaY * 0.001), 0.68, 1.48);
    cameraDistance = clamp(cameraDistance, 7.5, 22);
  }, { passive: false });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  function getStats() {
    return {
      calls: renderer.info.render.calls,
      triangles: renderer.info.render.triangles,
      geometries: renderer.info.memory.geometries,
      textures: renderer.info.memory.textures,
      actors: actors.size,
      detailedActors: [...actors.values()].filter((actor) => Boolean(actor.model)).length,
      playerPosition: (() => { const data = [...actors.values()].find((actor) => actor.isPlayer)?.data; return data ? [data.x, data.y] : null; })(),
      crowdInstances: crowdVisuals.filter((visual) => visual.root.visible).length,
      environmentMeshes: environment.children.length,
      propRenderObjects: staticProps.children.length
    };
  }

  function dispose() {
    disposed = true;
    renderer.dispose();
  }

  return { resize, render, screenToWorld, mapMovement, loadModels, getStats, dispose };
}
