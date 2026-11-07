import * as THREE from 'three';
import { ASPECT, seededRandom } from './crumpleSim.js';
import { drawPoster } from './posterArt.js';

const SECONDS_PER_POSE = 0.115;
const LIGHT = new THREE.Vector3(-0.38, 0.52, 1).normalize();

const whenIdle = (work) => (window.requestIdleCallback ? requestIdleCallback(work, { timeout: 800 }) : setTimeout(work, 60));

// One sheet at a time on screen. Moving between two events plays the first sheet's
// poses from open to ball, then the next sheet's from ball to open: stop-motion, so
// it only redraws when the pose actually changes.
export function createCrumpleScene(canvas, events, { onIndex }) {
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const count = events.length;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0); // the section's colour shows through
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.VSMShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(22, 1, 0.1, 50);

  // Balanced so paper facing the viewer shows its printed colour exactly.
  const ground = new THREE.Color(0xd0d0d0);
  const hemisphereStrength = (1 - 0.84 * LIGHT.z) / ((1 + ground.r) / 2);
  scene.add(new THREE.HemisphereLight(0xffffff, ground, hemisphereStrength * Math.PI));
  const key = new THREE.DirectionalLight(0xffffff, 0.84 * Math.PI);
  key.position.copy(LIGHT).multiplyScalar(4);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.radius = 18;
  key.shadow.blurSamples = 16;
  key.shadow.bias = -5e-4;
  Object.assign(key.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 8 });
  scene.add(key);

  const wall = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.15 }));
  wall.position.z = -0.32;
  wall.receiveShadow = true;
  scene.add(wall);

  const sheet = new THREE.Group();
  scene.add(sheet);
  const frontMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });
  const backMaterial = new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.BackSide });
  let attributes = null;
  let flatPose = null;

  function buildGeometry(flat, uv) {
    const corners = flat.P.length;
    const make = () => new THREE.BufferAttribute(new Float32Array(corners), 3).setUsage(THREE.DynamicDrawUsage);
    attributes = { position: make(), normal: make(), front: make(), back: make() };
    const uvAttribute = new THREE.BufferAttribute(uv, 2);
    const frontGeometry = new THREE.BufferGeometry();
    frontGeometry.setAttribute('position', attributes.position);
    frontGeometry.setAttribute('normal', attributes.normal);
    frontGeometry.setAttribute('uv', uvAttribute);
    frontGeometry.setAttribute('color', attributes.front);
    const backGeometry = new THREE.BufferGeometry();
    backGeometry.setAttribute('position', attributes.position);
    backGeometry.setAttribute('normal', attributes.normal);
    backGeometry.setAttribute('uv', uvAttribute);
    backGeometry.setAttribute('color', attributes.back);
    for (const [geometry, material] of [[frontGeometry, frontMaterial], [backGeometry, backMaterial]]) {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.frustumCulled = false;
      sheet.add(mesh);
    }
    flatPose = flat;
  }

  // Poster textures are slow to draw, so make them one at a time between frames.
  const textures = new Array(count).fill(null);
  async function loadTexture(index) {
    if (textures[index]) return textures[index];
    const art = await drawPoster(events[index], index);
    const make = (source) => {
      const texture = new THREE.CanvasTexture(source);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      return texture;
    };
    textures[index] = { front: make(art.front), back: make(art.back) };
    renderer.initTexture(textures[index].front);
    renderer.initTexture(textures[index].back);
    dirty = true;
    return textures[index];
  }
  function loadRemaining(index) {
    if (index >= count) return;
    loadTexture(index).finally(() => whenIdle(() => loadRemaining(index + 1)));
  }

  // Each event's sheet: a handful of poses, randomly turned so no two crumples match.
  const poseSets = new Array(count).fill(null);
  const worker = new Worker(new URL('./crumpleWorker.js', import.meta.url), { type: 'module' });
  worker.onmessage = ({ data }) => {
    if (data.type === 'mesh') {
      buildGeometry(data.flat, data.uv);
      dirty = true;
      shown = null;
      return;
    }
    const random = seededRandom(1234 + 101 * data.index);
    const skip = [random() < 0.4 ? 1 : -1, random() < 0.35 ? 4 : -1];
    poseSets[data.index] = data.poses
      .filter((_, i) => !skip.includes(i))
      .map((pose, i) => {
        const crumpled = 1 - pose.open;
        return {
          ...pose,
          rotateZ: (random() - 0.5) * 0.9 * crumpled + (i === 0 ? (random() - 0.5) * 2 : 0),
          rotateX: (random() - 0.5) * 0.5 * crumpled,
          rotateY: (random() - 0.5) * 0.5 * crumpled,
          moveX: (random() - 0.5) * 0.06 * crumpled,
          moveY: (random() - 0.5) * 0.06 * crumpled,
        };
      });
    sequences.length = 0;
  };
  worker.onerror = (error) => console.error('Crumple worker failed, events will swap without crumpling:', error.message);
  worker.postMessage({ seeds: Array.from({ length: count }, (_, i) => 1000 + 17 * i) });

  const sequences = [];
  function sequenceFrom(index) {
    if (reducedMotion.matches) return null;
    if (sequences[index]) return sequences[index];
    const leaving = poseSets[index];
    const arriving = poseSets[index + 1];
    if (!leaving || !arriving) return null;
    sequences[index] = [...[...leaving].reverse().map((pose) => [index, pose]), ...arriving.map((pose) => [index + 1, pose])];
    return sequences[index];
  }

  let dirty = true;
  let position = 0;
  let target = null;
  let boost = 1;
  let shown = null;
  let shownIndex = -1;

  function showPose(index, pose) {
    if (!attributes) return;
    const data = pose ?? flatPose;
    attributes.position.array.set(data.P);
    attributes.normal.array.set(data.N);
    attributes.front.array.set(data.F);
    attributes.back.array.set(data.B);
    for (const attribute of Object.values(attributes)) attribute.needsUpdate = true;
    sheet.rotation.set(pose ? pose.rotateX : 0, pose ? pose.rotateY : 0, pose ? pose.rotateZ : 0);
    sheet.position.set(pose ? pose.moveX : 0, pose ? pose.moveY : 0, 0);
    const texture = textures[index];
    if (texture && frontMaterial.map !== texture.front) {
      frontMaterial.map = texture.front;
      backMaterial.map = texture.back;
      frontMaterial.needsUpdate = backMaterial.needsUpdate = true;
    }
    dirty = true;
  }

  function choosePose() {
    const clamped = Math.min(Math.max(position, 0), count - 1);
    const from = Math.min(Math.floor(clamped), count - 1);
    const between = from === count - 1 ? 0 : clamped - from;
    let index = from;
    let pose = null;
    if (between > 0) {
      const sequence = sequenceFrom(from);
      if (sequence) {
        const slot = Math.floor(between * (sequence.length + 2));
        if (slot > sequence.length) index = from + 1;
        else if (slot > 0) [index, pose] = sequence[slot - 1];
      } else {
        index = between < 0.5 ? from : from + 1;
      }
    }
    if (!shown || shown[0] !== index || shown[1] !== pose || (textures[index] && frontMaterial.map !== textures[index].front)) {
      shown = [index, pose];
      showPose(index, pose);
    }
    if (index !== shownIndex) {
      shownIndex = index;
      onIndex(index);
    }
  }

  function advance(delta) {
    if (target === null) return;
    const remaining = target - position;
    const sequence = sequenceFrom(Math.min(Math.floor(position), count - 2));
    const speed = (boost / (((sequence ? sequence.length : 12) + 2) * SECONDS_PER_POSE)) * delta;
    if (Math.abs(remaining) <= speed) {
      position = target;
      target = null;
    } else {
      position += Math.sign(remaining) * speed;
    }
  }

  function resize() {
    const width = canvas.clientWidth || 1;
    const height = canvas.clientHeight || 1;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    // On wide screens the canvas runs under the text, so the shadow is never cut off,
    // while the card stays centred in the left half.
    const stageWidth = canvas.parentElement.clientWidth || width;
    const paperHeight = Math.min(0.76 * height, 0.8 * stageWidth * ASPECT);
    camera.position.set(0, 0, (ASPECT * height) / (2 * Math.tan(THREE.MathUtils.degToRad(11)) * paperHeight));
    camera.lookAt(0, 0, 0);
    camera.setViewOffset(width, height, (width - stageWidth) / 2, 0, width, height);
    dirty = true;
  }
  new ResizeObserver(resize).observe(canvas);
  resize();

  let frame = 0;
  let lastTime = 0;
  let visible = false;
  function tick(time) {
    frame = 0;
    if (!visible || document.hidden) return;
    frame = requestAnimationFrame(tick);
    // Stop-motion can skip poses, so slow devices stay on time instead of dragging.
    const delta = Math.min(lastTime ? (time - lastTime) / 1000 : 1 / 60, 0.25);
    lastTime = time;
    advance(delta);
    choosePose();
    if (dirty && attributes) {
      dirty = false;
      renderer.render(scene, camera);
    }
  }
  function resume() {
    lastTime = 0;
    if (visible && !document.hidden && !frame) {
      dirty = true;
      frame = requestAnimationFrame(tick);
    }
  }
  document.addEventListener('visibilitychange', resume);

  loadTexture(0).finally(() => whenIdle(() => loadRemaining(1)));

  return {
    // Heads for this event, playing the crumple on its own from wherever it is now.
    goTo(index) {
      const next = Math.min(Math.max(index, 0), count - 1);
      if (next === (target ?? position)) return;
      target = next;
      boost = Math.max(1, (14 * Math.abs(next - position) * SECONDS_PER_POSE) / 1.8);
    },
    setVisible(next) {
      visible = next;
      resume();
    },
  };
}
