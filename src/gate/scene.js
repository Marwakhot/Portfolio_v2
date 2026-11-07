import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import RAPIER, { rapierReady } from '../rapier.js';
import { drawPassBack, drawPassFront } from './passArt.js';
import { playSound } from './sounds.js';

RectAreaLightUniformsLib.init();

// Scene layout, in world units.
const HOVER_Y = 0.9;
const READER_Y = -1.2;
const SLOT_Y = -1.05;
const SLOT_TOLERANCE = 0.15;
const TRAVERSE_SPAN = 2.6; // how far the card must travel in the slot to count as a swipe
const RESPAWN_MS = 50;
const FADE_IN_S = 0.45;
const READER_WIDTH = 3.2;
const READER_HEIGHT = 0.92;
const READER_TILT = 0.22;
const CARD_WIDTH = 3.2;
const CARD_HEIGHT = +((CARD_WIDTH * 240) / 492).toFixed(4);
const CARD_THICKNESS = 0.014;
const CARD_RADIUS = 0.11;
const CLEAR_OF_READER = READER_WIDTH / 2 + CARD_WIDTH / 2;
const CARD_IN_SLOT_Y = SLOT_Y + CARD_HEIGHT / 2;
const BACKGROUND = '#ffffff';

const STATUS_COLOR = { idle: '#b3aea1', near: '#d9a013', error: '#e0483a', granted: '#1e9e52' };

const slantForY = (y) => (y - READER_Y) * Math.tan(READER_TILT);

// Pixels per world unit: the whole gate scales to fit its section.
function unitScale(width, height) {
  const fitWidth = (TRAVERSE_SPAN / 2 + CARD_WIDTH / 2) * 2 + 0.2;
  return Math.max(55, Math.min(132, Math.min(width / fitWidth, height / 6.6)));
}

function plasticTexture(color, specks) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 16; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const radius = Math.random() * 70 + 45;
    const stain = ctx.createRadialGradient(x, y, 0, x, y, radius);
    stain.addColorStop(0, `rgba(172, 140, 74, ${Math.random() * 0.035 + 0.012})`);
    stain.addColorStop(1, 'rgba(172, 140, 74, 0)');
    ctx.fillStyle = stain;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < specks; i++) {
    ctx.fillStyle = `rgba(100, 90, 64, ${Math.random() * 0.1 + 0.035})`;
    ctx.beginPath();
    ctx.arc(Math.random() * 256, Math.random() * 256, Math.random() * 1.1 + 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function brushedTexture(repeatX, repeatY) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgb(199,199,199)';
  ctx.fillRect(0, 0, 512, 512);

  const noise = document.createElement('canvas');
  noise.width = noise.height = 256;
  const noiseCtx = noise.getContext('2d');
  const image = noiseCtx.createImageData(256, 256);
  for (let i = 0; i < image.data.length; i += 4) {
    const shade = 199 + (Math.random() - 0.5) * 20;
    image.data[i] = image.data[i + 1] = image.data[i + 2] = shade;
    image.data[i + 3] = 255;
  }
  noiseCtx.putImageData(image, 0, 0);
  ctx.globalAlpha = 0.4;
  ctx.drawImage(noise, 0, 0, 512, 512);
  ctx.globalAlpha = 1;
  ctx.lineCap = 'round';

  const scratch = (length, wander, width, alpha) => {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const angle = (Math.random() - 0.5) * wander;
    ctx.lineWidth = width;
    ctx.strokeStyle = `rgba(${Math.random() < 0.55 ? '255,255,255' : '90,90,90'}, ${alpha})`;
    for (const [dx, dy] of [[0, 0], [-512, 0], [0, -512]]) {
      ctx.beginPath();
      ctx.moveTo(x + dx, y + dy);
      ctx.lineTo(x + Math.cos(angle) * length + dx, y + Math.sin(angle) * length + dy);
      ctx.stroke();
    }
  };
  for (let i = 0; i < 420; i++) scratch(14 + Math.random() * 90, 0.5, 0.9 + Math.random() * 0.9, Math.random() * 0.34 + 0.14);
  for (let i = 0; i < 46; i++) scratch(120 + Math.random() * 320, 0.22, 1.2, Math.random() * 0.2 + 0.08);
  for (let i = 0; i < 16; i++) scratch(5 + Math.random() * 20, 2.4, 2.2, Math.random() * 0.3 + 0.25);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.anisotropy = 8;
  return texture;
}

function displayTexture(label, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0d0f0d';
  ctx.fillRect(0, 0, 512, 128);
  ctx.fillStyle = 'rgba(255,255,255,0.025)';
  for (let y = 0; y < 128; y += 4) ctx.fillRect(0, y, 512, 1);
  ctx.font = '400 52px DSEG14, ui-monospace, monospace';
  ctx.letterSpacing = '6px';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = color;
  ctx.shadowBlur = 16;
  ctx.fillStyle = color;
  ctx.fillText(label, 259, 66);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const CARD_VERTEX_HEAD = `#include <common>
uniform float uCurve; uniform float uSlant; uniform float uHalfW;
varying vec2 vCardXY;`;
const CARD_FRAGMENT_HEAD = `#include <common>
uniform float uHalfW; uniform float uHalfH; uniform float uRadius;
varying vec2 vCardXY;`;
const BEND = `vCardXY = position.xy;
float _nx = position.x / uHalfW;
vec3 transformed = vec3(position);
transformed.z += uHalfW * (uCurve * (_nx * _nx - 0.3333) + uSlant * _nx);`;

// The ticket is a flat plane, bent in the vertex shader and given rounded
// corners in the fragment shader.
function cardMaterial(params, uniforms) {
  const material = new THREE.MeshStandardMaterial({ transparent: true, ...params });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', CARD_VERTEX_HEAD)
      .replace(
        '#include <beginnormal_vertex>',
        `float _bendX = position.x / uHalfW;
        float _ddx = 2.0 * uCurve * _bendX + uSlant;
        vec3 objectNormal = normalize(vec3(-_ddx, 0.0, 1.0));`,
      )
      .replace('#include <begin_vertex>', BEND);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', CARD_FRAGMENT_HEAD)
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
        vec2 _q = abs(vCardXY) - (vec2(uHalfW, uHalfH) - uRadius);
        float _d = length(max(_q, 0.0)) + min(max(_q.x, _q.y), 0.0) - uRadius;
        float _aa = fwidth(_d);
        float _mask = 1.0 - smoothstep(-_aa, _aa, _d);
        if (_mask < 0.01) discard;
        diffuseColor.a *= _mask;`,
      );
  };
  return material;
}

function cardDepthMaterial(uniforms) {
  const material = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, side: THREE.DoubleSide });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', CARD_VERTEX_HEAD)
      .replace('#include <begin_vertex>', BEND);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', CARD_FRAGMENT_HEAD)
      .replace(
        '#include <clipping_planes_fragment>',
        `#include <clipping_planes_fragment>
        vec2 _q = abs(vCardXY) - (vec2(uHalfW, uHalfH) - uRadius);
        float _d = length(max(_q, 0.0)) + min(max(_q.x, _q.y), 0.0) - uRadius;
        if (_d > 0.0) discard;`,
      );
  };
  return material;
}

function createEnvironment(renderer) {
  const envScene = new THREE.Scene();
  const group = new THREE.Group();
  group.rotation.set(-Math.PI / 3, 0, 1);
  envScene.add(group);
  for (const [intensity, position, scale] of [
    [1.4, [0, 3, 6], [8, 3, 1]],
    [1, [-6, 0, 4], [6, 3, 1]],
    [1, [6, 2, 4], [6, 3, 1]],
  ]) {
    const panel = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(intensity, intensity, intensity), side: THREE.DoubleSide, toneMapped: false }),
    );
    panel.position.set(...position);
    panel.scale.set(...scale);
    panel.lookAt(0, 0, 0);
    group.add(panel);
  }
  const generator = new THREE.PMREMGenerator(renderer);
  const target = generator.fromScene(envScene, 0, 0.1, 50);
  generator.dispose();
  return target.texture;
}

function buildReader(world, statusLabels) {
  const group = new THREE.Group();
  group.position.set(0, READER_Y, 0);
  group.rotation.x = READER_TILT;

  const brushed = brushedTexture(3.4, 0.68);
  const shared = { bumpMap: brushed, roughnessMap: brushed, roughness: 1, metalness: 0.02, envMapIntensity: 0.45 };
  const faceMaterial = new THREE.MeshStandardMaterial({ map: plasticTexture('#e8ddc6', 900), bumpScale: 0.5, ...shared });
  const bodyMaterial = new THREE.MeshStandardMaterial({ map: plasticTexture('#d7cbaf', 700), bumpScale: 0.4, ...shared });

  const rounded = (size, radius, smoothness, position, material) => {
    const mesh = new THREE.Mesh(new RoundedBoxGeometry(...size, smoothness, radius), material);
    mesh.position.set(...position);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  const box = (size, position, material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...position);
    group.add(mesh);
    return mesh;
  };

  // Front and back halves, with the slot running between them.
  rounded([READER_WIDTH, READER_HEIGHT, 0.255], 0.07, 6, [0, 0.01, 0.1725], bodyMaterial);
  rounded([READER_WIDTH, READER_HEIGHT, 0.305], 0.08, 6, [0, 0.01, -0.3175], bodyMaterial);
  rounded([2.94, 0.123, 0.09], 0.02, 5, [0, 0.4065, 0.287], faceMaterial);
  rounded([2.94, 0.215, 0.1], 0.022, 5, [0, 0.2375, 0.3], faceMaterial);
  for (const side of [-1, 1]) {
    rounded([0.69, 0.5, 0.1], 0.022, 5, [side * 1.125, -0.15, 0.3], faceMaterial);
  }

  // Vent slits
  const ventDark = new THREE.MeshStandardMaterial({ color: '#5b5341', roughness: 0.9 });
  const ventEdge = new THREE.MeshStandardMaterial({ color: '#8c8267', roughness: 0.9 });
  for (const side of [-1, 1]) {
    for (let i = 0; i < 12; i++) box([0.018, 0.03, 0.185], [side * (0.72 + i * 0.056), 0.457, 0.195], ventDark);
    box([0.014, 0.02, 0.25], [side * 1.47, 0.464, 0.175], ventEdge);
  }

  box([READER_WIDTH - 0.06, 0.6, 0.27], [0, -0.15, -0.06], new THREE.MeshStandardMaterial({ color: '#1c1b19', roughness: 0.7 }));

  // Display
  rounded([1.46, 0.44, 0.1], 0.03, 4, [0, -0.14, 0.265], new THREE.MeshStandardMaterial({ color: '#232322', roughness: 0.5, metalness: 0.1 }));
  const displayMaterial = new THREE.MeshBasicMaterial({ map: statusLabels.idle, toneMapped: false });
  const display = new THREE.Mesh(new THREE.PlaneGeometry(1.32, 0.33), displayMaterial);
  display.position.set(0, -0.14, 0.318);
  group.add(display);

  // Status LED
  const led = new THREE.Group();
  led.position.set(1.35, -0.14, 0.35);
  group.add(led);
  const socket = new THREE.Mesh(new THREE.CircleGeometry(0.066, 32), new THREE.MeshStandardMaterial({ color: '#141412', roughness: 0.5, metalness: 0.2 }));
  socket.position.z = 0.002;
  const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.052, 0.012, 12, 32), new THREE.MeshStandardMaterial({ color: '#4a4a46', roughness: 0.35, metalness: 0.65 }));
  bezel.position.z = 0.018;
  const bulbMaterial = new THREE.MeshPhysicalMaterial({
    color: STATUS_COLOR.idle,
    emissive: STATUS_COLOR.idle,
    emissiveIntensity: 0.2,
    roughness: 0.12,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.04,
    toneMapped: false,
  });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.038, 24, 24), bulbMaterial);
  bulb.position.z = 0.018;
  bulb.scale.z = 0.32;
  const haloMaterial = new THREE.MeshBasicMaterial({ color: STATUS_COLOR.idle, transparent: true, opacity: 0.16, depthWrite: false, toneMapped: false });
  const halo = new THREE.Mesh(new THREE.CircleGeometry(0.11, 28), haloMaterial);
  halo.position.z = 0.038;
  halo.visible = false;
  const ledLight = new THREE.PointLight(STATUS_COLOR.idle, 0.5, 0.7, 2);
  ledLight.position.z = 0.08;
  ledLight.visible = false;
  led.add(socket, bezel, bulb, halo, ledLight);

  // The card's soft shadow where it enters the slot.
  const slotShadowUniforms = { uX: { value: 0 }, uLift: { value: 1 }, uFade: { value: 0 }, uHalfW: { value: CARD_WIDTH / 2 } };
  const slotDepth = READER_WIDTH - 0.04;
  const slotShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(slotDepth, 0.3),
    new THREE.ShaderMaterial({
      uniforms: slotShadowUniforms,
      vertexShader: `varying vec2 vP;
        void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `varying vec2 vP;
        uniform float uX; uniform float uLift; uniform float uFade; uniform float uHalfW;
        void main() {
          float blur = mix(0.05, 0.62, uLift);
          float dz = 0.200 - vP.y;
          float ax = 1.0 - smoothstep(uHalfW - blur, uHalfW + blur, abs(vP.x - uX));
          float az = exp(-dz / (blur * 0.55 + 0.05));
          float edge = 1.0 - smoothstep(${(slotDepth / 2 - 0.07).toFixed(3)}, ${(slotDepth / 2).toFixed(3)}, abs(vP.x));
          float a = ax * az * edge * mix(0.46, 0.07, uLift) * uFade;
          gl_FragColor = vec4(0.13, 0.115, 0.08, a);
        }`,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
    }),
  );
  slotShadow.position.set(0, 0.474, 0.2);
  slotShadow.rotation.x = -Math.PI / 2;
  slotShadow.renderOrder = 2;
  group.add(slotShadow);

  // Colliders: two walls forming the slot, and a floor beneath it.
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed()
      .setTranslation(0, READER_Y, 0)
      .setRotation(new THREE.Quaternion().setFromEuler(new THREE.Euler(READER_TILT, 0, 0))),
  );
  const halfDepth = 0.338 / 2;
  for (const z of [0.181, -0.181]) {
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(READER_WIDTH / 2, READER_HEIGHT / 2, halfDepth).setTranslation(0, 0.01, z).setRestitution(0.15).setFriction(0.4),
      body,
    );
  }
  world.createCollider(RAPIER.ColliderDesc.cuboid(READER_WIDTH / 2, 0.3, 0.35).setTranslation(0, -0.15, 0).setRestitution(0.05).setFriction(0.9), body);

  function setStatus(status) {
    const color = STATUS_COLOR[status];
    displayMaterial.map = statusLabels[status];
    bulbMaterial.color.set(color);
    bulbMaterial.emissive.set(color);
    bulbMaterial.emissiveIntensity = status === 'idle' ? 0.2 : 2.6;
    haloMaterial.color.set(color);
    ledLight.color.set(color);
    halo.visible = ledLight.visible = status !== 'idle';
  }

  return { group, setStatus, slotShadowUniforms };
}

export async function createGateScene(canvas, { pass, name, onGranted }) {
  await rapierReady;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BACKGROUND);
  scene.environment = createEnvironment(renderer);

  const camera = new THREE.PerspectiveCamera(25, 1, 0.1, 100);

  scene.add(new THREE.AmbientLight('#ffffff', 0.72));
  const key = new THREE.DirectionalLight('#ffffff', 1.55);
  key.position.set(4, 6, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.radius = 12;
  key.shadow.blurSamples = 16;
  key.shadow.bias = -1e-4;
  key.shadow.normalBias = 0.045;
  Object.assign(key.shadow.camera, { near: 0.5, far: 20, left: -6, right: 6, top: 6, bottom: -6 });
  scene.add(key);

  // An invisible wall behind everything, there only to catch the soft shadow.
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.ShadowMaterial({ opacity: 0.1 }));
  wall.position.z = -0.62;
  wall.receiveShadow = true;
  scene.add(wall);
  const top = new THREE.RectAreaLight('#fffdf7', 1.7, 7, 4);
  top.position.set(0, 4.2, 3);
  top.lookAt(0, -0.4, 0);
  scene.add(top);

  const world = new RAPIER.World({ x: 0, y: -18, z: 0 });
  world.timestep = 1 / 60;
  const events = new RAPIER.EventQueue(true);

  const reader = buildReader(world, {
    idle: displayTexture('READY', '#7d857c'),
    near: displayTexture('READING', '#d9a013'),
    error: displayTexture('ERROR', '#e0483a'),
    granted: displayTexture('SUCCESS', '#35c56d'),
  });
  scene.add(reader.group);

  // The ticket
  const uniforms = {
    uCurve: { value: 0 },
    uSlant: { value: 0 },
    uHalfW: { value: CARD_WIDTH / 2 },
    uHalfH: { value: CARD_HEIGHT / 2 },
    uRadius: { value: CARD_RADIUS },
  };
  const faceTexture = (source, mirrored) => {
    const texture = new THREE.CanvasTexture(source);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    if (mirrored) {
      texture.wrapS = THREE.RepeatWrapping;
      texture.repeat.x = -1;
    }
    return texture;
  };
  const faceShared = { roughness: 1, metalness: 0, envMapIntensity: 0.18 };
  const frontMaterial = cardMaterial({ map: faceTexture(drawPassFront(pass, name)), side: THREE.FrontSide, shadowSide: THREE.DoubleSide, ...faceShared }, uniforms);
  const backMaterial = cardMaterial({ map: faceTexture(drawPassBack(pass), true), side: THREE.BackSide, ...faceShared }, uniforms);
  const cardGeometry = new THREE.PlaneGeometry(CARD_WIDTH, CARD_HEIGHT, 90, 18);
  const cardGroup = new THREE.Group();
  const front = new THREE.Mesh(cardGeometry, frontMaterial);
  front.position.z = CARD_THICKNESS / 2;
  front.renderOrder = -2;
  front.castShadow = true;
  front.customDepthMaterial = cardDepthMaterial(uniforms);
  const back = new THREE.Mesh(cardGeometry, backMaterial);
  back.position.z = -CARD_THICKNESS / 2;
  back.renderOrder = -2;
  cardGroup.add(front, back);
  scene.add(cardGroup);
  const cardFaces = [front, back];

  const card = world.createRigidBody(
    RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(0, HOVER_Y, 0)
      .setCcdEnabled(true)
      .setGravityScale(0.8)
      .setAngularDamping(1.2)
      .setLinearDamping(1.1),
  );
  const cardCollider = world.createCollider(
    RAPIER.ColliderDesc.cuboid(CARD_WIDTH / 2, CARD_HEIGHT / 2, CARD_THICKNESS / 2)
      .setRestitution(0.22)
      .setFriction(0.35)
      .setActiveEvents(RAPIER.ActiveEvents.COLLISION_EVENTS),
    card,
  );

  // Interaction state
  let mode = 'hover'; // hover | drag | fall | hidden
  let status = 'idle';
  let grantedOnce = false;
  let opacity = 1;
  let restTimer = 0;
  let respawn = 0;
  let inSlotPressed = false;
  let lastErrorTime = 0;
  let lastBumpTime = 0;
  let errorTimeout = 0;
  let traverse = null; // the x range covered inside the slot during this drag
  let roll = 0;
  let tilt = 0;
  let depth = 0;
  let lastDragX = 0;
  let lastDragY = HOVER_Y;
  let worldWidth = 1;
  let worldHeight = 1;

  const bend = { curve: 0, curveV: 0, slant: 0, slantV: 0, y: HOVER_Y, vy: 0, x: 0, vx: 0 };
  const grabOffset = new THREE.Vector3();
  const pointer = new THREE.Vector2(10, 10);
  const raycaster = new THREE.Raycaster();
  const onRay = new THREE.Vector3();
  const rayDirection = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const euler = new THREE.Euler();

  function setStatus(next) {
    if (next === status) return;
    status = next;
    reader.setStatus(next);
  }

  function setOpacity(value) {
    opacity = value;
    frontMaterial.opacity = backMaterial.opacity = value;
  }

  function grant() {
    if (grantedOnce) return;
    grantedOnce = true;
    clearTimeout(errorTimeout);
    setStatus('granted');
    playSound('sparkle');
    onGranted();
  }

  function setZone(inZone) {
    if (status === 'granted') return;
    if (inZone) setStatus('near');
    else if (status !== 'error') setStatus('idle');
  }

  function showError() {
    if (status === 'granted') return;
    setStatus('error');
    clearTimeout(errorTimeout);
    errorTimeout = setTimeout(() => {
      if (status === 'error') setStatus('idle');
    }, 1800);
  }

  function setRestingRotation(x = 0) {
    card.setRotation(quaternion.setFromEuler(euler.set(x, 0, 0)), true);
  }

  function hideAndRespawn() {
    restTimer = 0;
    setOpacity(0);
    front.castShadow = false;
    mode = 'hidden';
    respawn = setTimeout(() => {
      card.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
      card.setTranslation({ x: 0, y: HOVER_Y, z: 0 }, true);
      setRestingRotation();
      front.castShadow = true;
      mode = 'hover';
    }, RESPAWN_MS);
  }

  function aim(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
  }

  function hitCard() {
    raycaster.setFromCamera(pointer, camera);
    return raycaster.intersectObjects(cardFaces, false)[0];
  }

  const isInSlotBand = (y) => Math.abs(y - CARD_HEIGHT / 2 - SLOT_Y) < SLOT_TOLERANCE;

  // Stops the page scrolling when a touch starts on the ticket.
  function onTouchStart(event) {
    aim(event.touches[0]);
    if (hitCard()) event.preventDefault();
  }

  function onPointerDown(event) {
    if (event.button !== 0 || mode === 'hidden') return;
    aim(event);
    const hit = hitCard();
    if (!hit) return;
    canvas.setPointerCapture(event.pointerId);
    clearTimeout(respawn);
    const position = card.translation();
    grabOffset.copy(hit.point).sub(onRay.set(position.x, position.y, position.z));
    lastDragX = position.x;
    lastDragY = position.y;
    traverse = isInSlotBand(position.y) ? { min: position.x, max: position.x } : null;
    restTimer = 0;
    card.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased, true);
    mode = 'drag';
    canvas.style.cursor = 'grabbing';
  }

  function onPointerMove(event) {
    aim(event);
    if (mode !== 'drag') canvas.style.cursor = hitCard() ? 'grab' : 'default';
  }

  function onPointerUp(event) {
    if (mode !== 'drag') return;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    aim(event);
    const cos = Math.cos(roll);
    const sin = Math.sin(roll);
    let x = (pointer.x * worldWidth) / 2 - (grabOffset.x * cos - grabOffset.y * sin);
    let y = (pointer.y * worldHeight) / 2 - (grabOffset.x * sin + grabOffset.y * cos);
    if (Math.abs(x) < CLEAR_OF_READER && y < CARD_IN_SLOT_Y) {
      if (lastDragY >= CARD_IN_SLOT_Y - 0.12) y = CARD_IN_SLOT_Y;
      else x = (x >= 0 ? 1 : -1) * Math.max(Math.abs(x), CLEAR_OF_READER);
    }
    const inBand = isInSlotBand(y);
    card.setBodyType(RAPIER.RigidBodyType.Dynamic, true);
    card.setTranslation({ x, y, z: inBand ? slantForY(y) : depth }, true);
    if (!grantedOnce && traverse && inBand && Math.max(traverse.max, x) - Math.min(traverse.min, x) > TRAVERSE_SPAN) grant();
    traverse = null;
    setZone(false);

    mode = 'fall';
    if (inBand) {
      card.setLinvel({ x: 0, y: 0, z: 0 }, true);
      card.setAngvel({ x: 0, y: 0, z: 0 }, true);
      setRestingRotation(READER_TILT);
      playSound('press');
    } else {
      card.setAngvel({ x: 0.9, y: 0.5, z: (Math.random() - 0.5) * 1.4 }, true);
      card.setLinvel({ x: -roll * 1.6, y: 0.3, z: 0 }, true);
    }
    inSlotPressed = false;
    canvas.style.cursor = 'grab';
  }

  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);

  const stage = canvas.parentElement;
  function resize() {
    const { width, height } = canvas.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    const scale = unitScale(width, height);
    worldWidth = width / scale;
    worldHeight = height / scale;
    const offsetY = -25 / scale;
    camera.aspect = width / height;
    camera.position.set(0, offsetY, worldHeight / (2 * Math.tan(THREE.MathUtils.degToRad(12.5))));
    camera.updateProjectionMatrix();
    const readerBottom = READER_Y - READER_HEIGHT / 2;
    stage.style.setProperty('--reader-bottom-px', `${height / 2 - (readerBottom - offsetY) * scale}px`);
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();

  function updateBend(position, delta) {
    const dt = Math.min(delta, 0.05) || 0.016;
    const vy = (position.y - bend.y) / dt;
    const ay = (vy - bend.vy) / dt;
    bend.y = position.y;
    bend.vy = vy;
    const vx = (position.x - bend.x) / dt;
    const ax = (vx - bend.vx) / dt;
    bend.x = position.x;
    bend.vx = vx;
    const curveTarget = 0.16 + THREE.MathUtils.clamp(ay * 0.024, -0.6, 0.6);
    const slantTarget = THREE.MathUtils.clamp(-ax * 0.024, -0.5, 0.5);
    bend.curveV += ((curveTarget - bend.curve) * 120 - bend.curveV * 13) * dt;
    bend.curve += bend.curveV * dt;
    bend.slantV += ((slantTarget - bend.slant) * 120 - bend.slantV * 13) * dt;
    bend.slant += bend.slantV * dt;
    // The ticket only flexes once it's clear of the slot.
    const free = THREE.MathUtils.smoothstep(position.y, 0.25, 0.6);
    uniforms.uCurve.value = bend.curve * free;
    uniforms.uSlant.value = bend.slant * free;
  }

  function updateHover(time) {
    card.setNextKinematicTranslation({ x: Math.sin(time * 0.5) * 0.05, y: HOVER_Y + Math.sin(time * 1.2) * 0.1, z: 0 });
    euler.set(Math.sin(time * 0.7) * 0.09, Math.sin(time * 0.4) * 0.06, Math.sin(time * 0.9) * 0.08);
    card.setNextKinematicRotation(quaternion.setFromEuler(euler));
  }

  function updateDrag(delta) {
    onRay.set(pointer.x, pointer.y, 0.5).unproject(camera);
    rayDirection.copy(onRay).sub(camera.position).normalize();
    onRay.add(rayDirection.multiplyScalar(camera.position.length()));
    const cos = Math.cos(roll);
    const sin = Math.sin(roll);
    let x = onRay.x - (grabOffset.x * cos - grabOffset.y * sin);
    let y = onRay.y - (grabOffset.x * sin + grabOffset.y * cos);

    // The reader is solid: only enter the slot from above, never through its sides.
    let inSlot = false;
    if (Math.abs(x) < CLEAR_OF_READER && y < CARD_IN_SLOT_Y) {
      if (lastDragY >= CARD_IN_SLOT_Y - 0.12) {
        y = CARD_IN_SLOT_Y;
        inSlot = true;
      } else {
        x = (x >= 0 ? 1 : -1) * Math.max(Math.abs(x), CLEAR_OF_READER);
      }
    }
    lastDragY = y;
    const moved = x - lastDragX;
    lastDragX = x;

    let targetRoll;
    let sink = 0;
    if (inSlot) {
      // Past the reader's end the ticket levers up on the slot's edge.
      const overhang = Math.abs(x) - READER_WIDTH / 2;
      if (overhang > 0) {
        targetRoll = -Math.sign(x) * Math.min(overhang * 0.9, 0.85);
        sink = overhang * 0.36;
      } else {
        targetRoll = 0;
      }
    } else {
      targetRoll = THREE.MathUtils.clamp(grabOffset.x * 0.28, -0.35, 0.35) + THREE.MathUtils.clamp(-moved * 4, -0.3, 0.3);
    }
    if (inSlot && !inSlotPressed) playSound('press');
    inSlotPressed = inSlot;

    roll += (targetRoll - roll) * Math.min(1, delta * (inSlot ? 8 : 4.5));
    tilt += ((inSlot ? READER_TILT : 0) - tilt) * Math.min(1, delta * 10);
    depth += ((inSlot ? slantForY(y) : 0) - depth) * Math.min(1, delta * 12);
    card.setNextKinematicTranslation({ x, y: y - sink, z: depth });
    card.setNextKinematicRotation(quaternion.setFromEuler(euler.set(tilt, 0, roll)));

    if (status === 'granted') return;
    const inBand = isInSlotBand(y);
    setZone(inBand);
    if (inBand) {
      traverse ??= { min: x, max: x };
      traverse.min = Math.min(traverse.min, x);
      traverse.max = Math.max(traverse.max, x);
      if (traverse.max - traverse.min > TRAVERSE_SPAN) grant();
    } else {
      // Left the slot without completing the swipe.
      if (traverse && !grantedOnce && performance.now() - lastErrorTime > 600) {
        lastErrorTime = performance.now();
        playSound('error');
        showError();
      }
      traverse = null;
    }
  }

  function updateFall(position, delta) {
    const velocity = card.linvel();
    const atRest = Math.abs(velocity.x) + Math.abs(velocity.y) + Math.abs(velocity.z) < 0.25;
    restTimer = atRest ? restTimer + delta : 0;
    const sittingInSlot = Math.abs(position.x) < READER_WIDTH / 2 + 0.1 && Math.abs(position.y - CARD_HEIGHT / 2 - SLOT_Y) < 0.35;
    if (position.y < -worldHeight / 2 - CARD_WIDTH || (restTimer > 1.2 && !sittingInSlot)) hideAndRespawn();
  }

  let frame = 0;
  let visible = true;
  let disposed = false;
  let lastTime = 0;
  let accumulator = 0;
  let clock = 0;
  const previousPosition = new THREE.Vector3().copy(card.translation());
  const previousRotation = new THREE.Quaternion().copy(card.rotation());
  const currentPosition = new THREE.Vector3();
  const currentRotation = new THREE.Quaternion();

  function handleBumps() {
    events.drainCollisionEvents((a, b, started) => {
      if (!started || (a !== cardCollider.handle && b !== cardCollider.handle) || mode === 'hidden') return;
      const now = performance.now();
      if (now - lastBumpTime < 90) return;
      const v = card.linvel();
      if (Math.hypot(v.x, v.y, v.z) < 0.5) return;
      lastBumpTime = now;
      playSound('press');
    });
  }

  function tick(timestamp) {
    frame = 0;
    if (disposed || !visible || document.hidden) return;
    frame = requestAnimationFrame(tick);

    const delta = Math.min((timestamp - (lastTime || timestamp)) / 1000, 0.1);
    lastTime = timestamp;
    clock += delta;

    const position = card.translation();
    reader.slotShadowUniforms.uX.value = position.x;
    reader.slotShadowUniforms.uLift.value = THREE.MathUtils.clamp((position.y - CARD_HEIGHT / 2 - SLOT_Y) / 1.7, 0, 1);
    reader.slotShadowUniforms.uFade.value = opacity;
    updateBend(position, delta);

    if (opacity < 1 && mode === 'hover') setOpacity(Math.min(1, opacity + delta / FADE_IN_S));
    if (mode === 'hover') updateHover(clock);
    else if (mode === 'drag') updateDrag(delta);
    else if (mode === 'fall') updateFall(position, delta);

    // Fixed-step physics, with the ticket interpolated between steps for high refresh screens.
    accumulator += delta;
    while (accumulator >= world.timestep) {
      previousPosition.copy(card.translation());
      previousRotation.copy(card.rotation());
      world.step(events);
      handleBumps();
      accumulator -= world.timestep;
    }
    const blend = accumulator / world.timestep;
    currentPosition.copy(card.translation());
    currentRotation.copy(card.rotation());
    cardGroup.position.copy(previousPosition).lerp(currentPosition, blend);
    cardGroup.quaternion.copy(previousRotation).slerp(currentRotation, blend);

    renderer.render(scene, camera);
  }

  function resume() {
    lastTime = 0;
    accumulator = 0;
    if (!visible || document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else if (!frame && !disposed) {
      frame = requestAnimationFrame(tick);
    }
  }
  document.addEventListener('visibilitychange', resume);
  frame = requestAnimationFrame(tick);

  return {
    setVisible(next) {
      visible = next;
      resume();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      clearTimeout(respawn);
      clearTimeout(errorTimeout);
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', resume);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      scene.traverse((object) => {
        object.geometry?.dispose();
        const material = object.material;
        if (material) {
          for (const value of Object.values(material)) if (value?.isTexture) value.dispose();
          material.dispose();
        }
      });
      scene.environment?.dispose();
      events.free();
      world.free();
      renderer.dispose();
    },
  };
}
